import os
from datetime import datetime, timezone
from collections.abc import Mapping


def register_billing(app):
    import app as app_module

    def stripe_client():
        if not app_module.SK:
            return None
        import stripe
        stripe.api_key = app_module.SK
        return stripe

    def as_dict(obj):
        if obj is None:
            return {}
        if isinstance(obj, Mapping):
            return dict(obj)
        for method in ('to_dict_recursive', 'to_dict'):
            fn = getattr(obj, method, None)
            if callable(fn):
                try:
                    return fn()
                except Exception:
                    pass
        try:
            return dict(obj)
        except Exception:
            return {}

    def period_end_value(subscription):
        s = as_dict(subscription)
        value = s.get('current_period_end')
        if value:
            return value
        items = as_dict(s.get('items'))
        candidates = []
        for item in items.get('data') or []:
            item_data = as_dict(item)
            if item_data.get('current_period_end'):
                candidates.append(item_data['current_period_end'])
        return max(candidates) if candidates else None

    def period_text(subscription):
        value = period_end_value(subscription)
        if not value:
            return None
        try:
            return datetime.fromtimestamp(int(value), timezone.utc).isoformat()
        except Exception:
            return None

    def migrate():
        cols = [
            ('subscription_id', 'TEXT'),
            ('stripe_customer_id', 'TEXT'),
            ('plan', 'TEXT'),
            ('subscription_status', 'TEXT'),
            ('current_period_end', 'TEXT'),
            ('cancel_at_period_end', 'INTEGER DEFAULT 0'),
        ]
        for name, typ in cols:
            try:
                app_module.db_execute(f'ALTER TABLE purchases ADD COLUMN {name} {typ}')
            except Exception:
                pass

    migrate()

    def find_user(user_id=None, email=''):
        if user_id:
            u = app_module.db_fetchone('SELECT * FROM users WHERE id=:id', {'id': user_id})
            if u:
                return u
        if email:
            return app_module.db_fetchone('SELECT * FROM users WHERE email=:email', {'email': email.lower()})
        return None

    def update_subscription(sub, fallback_email=''):
        s = as_dict(sub)
        sub_id = s.get('id')
        if not sub_id:
            return False
        row = app_module.db_fetchone('SELECT id,user_id FROM purchases WHERE subscription_id=:sid ORDER BY id DESC LIMIT 1', {'sid': sub_id})
        if not row and fallback_email:
            u = find_user(email=fallback_email)
            if u:
                row = app_module.db_fetchone('SELECT id,user_id FROM purchases WHERE user_id=:uid ORDER BY id DESC LIMIT 1', {'uid': u['id']})
        if not row:
            return False
        status = str(s.get('status') or '').lower()
        paid_status = 'paid' if status in ('active', 'trialing', 'past_due') else 'canceled'
        app_module.db_execute("""UPDATE purchases SET status=:status,subscription_status=:substatus,
          current_period_end=:period_end,cancel_at_period_end=:cancel,subscription_id=:sid,
          stripe_customer_id=:customer WHERE id=:id""", {
            'status': paid_status,
            'substatus': status,
            'period_end': period_text(s),
            'cancel': 1 if s.get('cancel_at_period_end') else 0,
            'sid': sub_id,
            'customer': s.get('customer'),
            'id': row['id']
        })
        return True

    def find_active_subscription(st, row):
        sub = None
        if row.get('subscription_id'):
            sub = st.Subscription.retrieve(row['subscription_id'])
        if not sub and row.get('stripe_customer_id'):
            subs = st.Subscription.list(customer=row['stripe_customer_id'], status='all', limit=20)
            candidates = [as_dict(x) for x in getattr(subs, 'data', [])]
            candidates = [x for x in candidates if str(x.get('status') or '').lower() in ('active', 'trialing', 'past_due')]
            if candidates:
                candidates.sort(key=lambda x: period_end_value(x) or 0, reverse=True)
                sub = candidates[0]
        if not sub and row.get('stripe_session_id'):
            checkout_session = st.checkout.Session.retrieve(row['stripe_session_id'])
            session_data = as_dict(checkout_session)
            sub_ref = session_data.get('subscription')
            if isinstance(sub_ref, Mapping):
                sub = sub_ref
            elif sub_ref:
                sub = st.Subscription.retrieve(str(sub_ref))
        if not sub and row.get('user_id'):
            user = app_module.db_fetchone('SELECT email FROM users WHERE id=:id', {'id': row['user_id']})
            email = str((user or {}).get('email') or '').strip().lower()
            if email:
                customers = st.Customer.list(email=email, limit=10)
                for customer in getattr(customers, 'data', []):
                    customer_id = as_dict(customer).get('id')
                    if not customer_id:
                        continue
                    subs = st.Subscription.list(customer=customer_id, status='all', limit=20)
                    candidates = [as_dict(x) for x in getattr(subs, 'data', [])]
                    candidates = [x for x in candidates if str(x.get('status') or '').lower() in ('active', 'trialing', 'past_due')]
                    if candidates:
                        candidates.sort(key=lambda x: period_end_value(x) or 0, reverse=True)
                        sub = candidates[0]
                        break
        return sub

    def live_reconcile(row):
        if not row:
            return row
        st = stripe_client()
        if not st:
            return row
        try:
            sub = find_active_subscription(st, row)
            if not sub:
                return row
            s = as_dict(sub)
            status = str(s.get('status') or '').lower()
            paid_status = 'paid' if status in ('active', 'trialing', 'past_due') else 'canceled'
            app_module.db_execute("""UPDATE purchases SET status=:status,subscription_id=:sid,
              stripe_customer_id=:customer,subscription_status=:substatus,
              current_period_end=:period_end,cancel_at_period_end=:cancel WHERE id=:id""", {
                'status': paid_status,
                'sid': s.get('id'),
                'customer': s.get('customer') or row.get('stripe_customer_id'),
                'substatus': status,
                'period_end': period_text(s),
                'cancel': 1 if s.get('cancel_at_period_end') else 0,
                'id': row['id']
            })
            return app_module.db_fetchone('SELECT * FROM purchases WHERE id=:id', {'id': row['id']}) or row
        except Exception:
            return row

    def active_subscription(user, live=False):
        if not user:
            return None
        row = app_module.db_fetchone("""SELECT * FROM purchases
          WHERE user_id=:uid AND status IN ('paid','active')
          AND (subscription_status IS NULL OR subscription_status IN ('active','trialing','past_due'))
          ORDER BY id DESC LIMIT 1""", {'uid': user['id']})
        if not row:
            return None
        if live:
            row = live_reconcile(row)
            return app_module.db_fetchone("""SELECT * FROM purchases
              WHERE id=:id AND status IN ('paid','active')
              AND (subscription_status IS NULL OR subscription_status IN ('active','trialing','past_due'))""", {'id': row['id']})
        return row

    def billing_state(user, live=False):
        if not user:
            return {'active': False, 'trial': False, 'plan': None, 'status': None, 'cancel_at_period_end': False, 'current_period_end': None}
        trial_active, trial_end, _ = app_module.trial_info(user)
        if trial_active:
            return {'active': True, 'trial': True, 'plan': None, 'status': 'trialing', 'cancel_at_period_end': False, 'current_period_end': trial_end.isoformat()}
        row = active_subscription(user, live=live)
        if not row:
            return {'active': False, 'trial': False, 'plan': None, 'status': None, 'cancel_at_period_end': False, 'current_period_end': None}
        return {
            'active': True,
            'trial': False,
            'plan': row.get('plan') or 'monthly',
            'status': row.get('subscription_status') or row.get('status') or 'active',
            'cancel_at_period_end': bool(row.get('cancel_at_period_end')),
            'current_period_end': row.get('current_period_end'),
        }

    def real_is_pro(user):
        if not user:
            return False
        trial_active, _, _ = app_module.trial_info(user)
        if trial_active:
            return True
        return bool(active_subscription(user, live=False))

    app_module.is_pro_user = real_is_pro

    def save_subscription(session_obj):
        s = as_dict(session_obj)
        customer_details = as_dict(s.get('customer_details'))
        email = (customer_details.get('email') or s.get('customer_email') or '').strip().lower()
        metadata = as_dict(s.get('metadata'))
        user_id = metadata.get('user_id')
        user = find_user(user_id=user_id, email=email)
        if not user:
            return False
        sid = s.get('id')
        sub_id = s.get('subscription')
        if isinstance(sub_id, Mapping):
            sub_id = as_dict(sub_id).get('id')
        customer_id = s.get('customer')
        plan = metadata.get('plan') or 'monthly'
        current_period_end = None
        try:
            if sub_id:
                st = stripe_client()
                if st:
                    sub_obj = st.Subscription.retrieve(str(sub_id))
                    current_period_end = period_text(sub_obj)
        except Exception:
            current_period_end = None
        if not sid:
            return False
        existing = app_module.db_fetchone('SELECT id FROM purchases WHERE stripe_session_id=:sid', {'sid': sid})
        params = {
            'uid': user['id'], 'sid': sid, 'pi': s.get('payment_intent'),
            'amount': s.get('amount_total'), 'currency': s.get('currency'),
            'status': 'paid', 'subid': sub_id, 'customer': customer_id,
            'plan': plan, 'period_end': current_period_end,
        }
        if existing:
            app_module.db_execute("""UPDATE purchases SET user_id=:uid,payment_intent=:pi,amount=:amount,currency=:currency,
              status=:status,subscription_id=:subid,stripe_customer_id=:customer,plan=:plan,
              subscription_status='active',current_period_end=:period_end WHERE stripe_session_id=:sid""", params)
        else:
            app_module.db_execute("""INSERT INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status,
              subscription_id,stripe_customer_id,plan,subscription_status,cancel_at_period_end,current_period_end)
              VALUES(:uid,:sid,:pi,:amount,:currency,:status,:subid,:customer,:plan,'active',0,:period_end)""", params)
        return True

    def replace(name, fn):
        app.view_functions[name] = fn

    @app.post('/api/create-checkout-v2')
    def checkout_v2():
        st = stripe_client()
        user = app_module.current_user()
        if not user:
            return app_module.jsonify(ok=False, error='LOGIN_REQUIRED'), 401
        if not st:
            return app_module.jsonify(ok=False, error='STRIPE_NOT_CONFIGURED'), 503
        d = app_module.request.get_json(silent=True) or {}
        plan = str(d.get('plan') or 'monthly').lower()
        price = app_module.PRICE if plan == 'monthly' else os.getenv('STRIPE_ANNUAL_PRICE_ID', '').strip()
        if not price:
            return app_module.jsonify(ok=False, error='STRIPE_ANNUAL_PRICE_NOT_CONFIGURED' if plan == 'annual' else 'STRIPE_NOT_CONFIGURED'), 503
        if real_is_pro(user):
            return app_module.jsonify(ok=False, error='ALREADY_PRO'), 409
        base_url = app_module.request.host_url.rstrip('/')
        success_url = base_url + '/?paid=1&session_id={CHECKOUT_SESSION_ID}'
        cancel_url = base_url + '/?cancelled=1'
        try:
            s = st.checkout.Session.create(
                mode='subscription', customer_email=user['email'],
                line_items=[{'price': price, 'quantity': 1}],
                success_url=success_url, cancel_url=cancel_url,
                allow_promotion_codes=True,
                metadata={'product': 'cvgo_pro', 'user_id': str(user['id']), 'plan': plan},
                subscription_data={'metadata': {'product': 'cvgo_pro', 'user_id': str(user['id']), 'plan': plan}},
            )
        except Exception as e:
            return app_module.jsonify(ok=False, error='STRIPE_CHECKOUT_FAILED', detail=str(e)[:300]), 502
        return app_module.jsonify(ok=True, url=s.url)

    @app.get('/api/checkout-success')
    def checkout_success():
        st = stripe_client()
        user = app_module.current_user()
        session_id = str(app_module.request.args.get('session_id') or '').strip()
        if not user:
            return app_module.jsonify(ok=False, error='LOGIN_REQUIRED'), 401
        if not st or not session_id:
            return app_module.jsonify(ok=False, error='SESSION_REQUIRED'), 400
        try:
            checkout_session = st.checkout.Session.retrieve(session_id)
            s = as_dict(checkout_session)
            metadata = as_dict(s.get('metadata'))
            if str(metadata.get('user_id') or '') != str(user['id']):
                return app_module.jsonify(ok=False, error='SESSION_USER_MISMATCH'), 403
            if s.get('payment_status') not in ('paid', 'no_payment_required'):
                return app_module.jsonify(ok=False, error='PAYMENT_NOT_CONFIRMED'), 409
            saved = save_subscription(s)
            if not saved:
                return app_module.jsonify(ok=False, error='SUBSCRIPTION_NOT_SAVED'), 502
            return app_module.jsonify(ok=True, pro=real_is_pro(user), billing=billing_state(user, live=False))
        except Exception as e:
            return app_module.jsonify(ok=False, error='CHECKOUT_VERIFY_FAILED', detail=str(e)[:300]), 502

    @app.get('/api/billing')
    def billing():
        user = app_module.current_user()
        if not user:
            return app_module.jsonify(ok=False, error='LOGIN_REQUIRED'), 401
        return app_module.jsonify(ok=True, **billing_state(user, live=True))

    @app.post('/api/cancel-subscription')
    def cancel_subscription():
        st = stripe_client()
        user = app_module.current_user()
        if not user:
            return app_module.jsonify(ok=False, error='LOGIN_REQUIRED'), 401
        if not st:
            return app_module.jsonify(ok=False, error='STRIPE_NOT_CONFIGURED'), 503
        row = active_subscription(user, live=True)
        if not row or not row.get('subscription_id'):
            return app_module.jsonify(ok=False, error='NO_ACTIVE_SUBSCRIPTION'), 404
        try:
            sub = st.Subscription.modify(row['subscription_id'], cancel_at_period_end=True)
            update_subscription(sub)
            return app_module.jsonify(ok=True, **billing_state(user, live=False))
        except Exception as e:
            return app_module.jsonify(ok=False, error='CANCEL_FAILED', detail=str(e)[:250]), 502

    @app.post('/api/stripe-webhook-v2')
    def webhook_v2():
        st = stripe_client()
        secret = app_module.WHSEC
        if not st or not secret:
            return 'Webhook not configured', 503
        try:
            event = st.Webhook.construct_event(app_module.request.data, app_module.request.headers.get('Stripe-Signature', ''), secret)
        except Exception:
            return 'Invalid signature', 400
        typ = event.get('type')
        obj = event.get('data', {}).get('object', {})
        try:
            if typ == 'checkout.session.completed':
                if obj.get('payment_status') in ('paid', 'no_payment_required') and not save_subscription(obj):
                    return 'Subscription not saved', 500
            elif typ in ('invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'):
                sub_id = obj.get('subscription')
                if sub_id:
                    sub = st.Subscription.retrieve(sub_id)
                    if not update_subscription(sub, obj.get('customer_email') or ''):
                        return 'Subscription not found', 500
            elif typ in ('customer.subscription.updated', 'customer.subscription.deleted'):
                if not update_subscription(obj):
                    return 'Subscription not found', 500
        except Exception:
            return 'Webhook processing failed', 500
        return '', 200

    replace('checkout', checkout_v2)
    replace('webhook', webhook_v2)

    original_me = app.view_functions.get('me')
    if original_me:
        def me_v2():
            user = app_module.current_user()
            if not user:
                return app_module.jsonify(logged_in=False)
            active, _, days = app_module.trial_info(user)
            state = billing_state(user, live=False)
            return app_module.jsonify(logged_in=True, email=user['email'], trial_active=active, trial_days_left=days, pro=real_is_pro(user), billing=state)
        replace('me', me_v2)

    original_verify = app.view_functions.get('verify')
    if original_verify:
        def verify_v2():
            user = app_module.current_user()
            return app_module.jsonify(ok=True, pro=real_is_pro(user), billing=billing_state(user, live=False))
        replace('verify', verify_v2)


register_billing(__import__('app').app)
import cv_import_api
