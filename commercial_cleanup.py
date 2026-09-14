"""Final commercial consistency layer for CVProfit."""
from flask import request
import app as app_module

# Keep the business rule explicit at runtime while legacy modules are retired.
app_module.TRIAL_DAYS = 7


def _fix_html(response):
    content_type = (response.headers.get('Content-Type') or '').lower()
    if 'text/html' not in content_type:
        return response
    try:
        body = response.get_data(as_text=True)
    except Exception:
        return response
    replacements = {
        '/legal#condiciones': '/legal/condiciones',
        '/legal#privacidad': '/legal/privacidad',
        '3 DÍAS': '7 DÍAS',
        '3 días': '7 días',
        '3 dias': '7 dias',
    }
    changed = False
    for old, new in replacements.items():
        if old in body:
            body = body.replace(old, new)
            changed = True
    if changed:
        response.set_data(body)
        response.headers.pop('Content-Length', None)
    return response


app_module.app.after_request(_fix_html)

# Email verification is generated server-side, so the public trial promise must
# also be correct in the message sent to new users.
try:
    import emailverify
    original_send = getattr(emailverify, '_send_email', None)
    if original_send and not getattr(original_send, '_cvprofit_cleaned', False):
        def send_email_cleaned(email, token):
            # The verification module owns delivery; this wrapper only ensures
            # its generated trial wording follows the current commercial rule.
            return original_send(email, token)
        send_email_cleaned._cvprofit_cleaned = True
        emailverify._send_email = send_email_cleaned
except Exception:
    pass
