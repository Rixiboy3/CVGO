"""Final commercial consistency layer for CVProfit."""
import json
import urllib.request
import app as app_module

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

# The verification module sends its email through urllib. Rewrite only the
# generated message payload so old trial wording cannot reach a new user.
try:
    import emailverify
    original_send = getattr(emailverify, '_send_email', None)
    if original_send and not getattr(original_send, '_cvprofit_cleaned', False):
        original_urlopen = emailverify.urllib.request.urlopen

        def urlopen_cleaned(req, *args, **kwargs):
            if isinstance(req, urllib.request.Request) and req.data:
                try:
                    payload = json.loads(req.data.decode('utf-8'))
                    for key in ('htmlContent', 'textContent'):
                        if isinstance(payload.get(key), str):
                            payload[key] = payload[key].replace('3 días', '7 días').replace('3 DÍAS', '7 DÍAS')
                    req = urllib.request.Request(req.full_url, data=json.dumps(payload, ensure_ascii=False).encode('utf-8'), method=req.method, headers=dict(req.header_items()))
                except Exception:
                    pass
            return original_urlopen(req, *args, **kwargs)

        emailverify.urllib.request.urlopen = urlopen_cleaned
        original_send._cvprofit_cleaned = True
except Exception:
    pass
