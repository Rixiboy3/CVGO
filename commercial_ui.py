from flask import send_from_directory


def register_commercial_ui(app):
    original_home = app.view_functions.get('home')
    if original_home:
        def home_with_commercial_ui(*args, **kwargs):
            response = original_home(*args, **kwargs)
            body = response.get_data(as_text=True)
            if '/commercial_ui.js' not in body:
                body = body.replace('</body>', '<script src="/commercial_ui.js?v=1"></script></body>')
                response.set_data(body)
                response.headers.pop('Content-Length', None)
            return response
        app.view_functions['home'] = home_with_commercial_ui

    @app.get('/commercial_ui.js')
    def commercial_ui_js():
        return send_from_directory('.', 'commercial_ui.js', mimetype='application/javascript')


register_commercial_ui(__import__('app').app)
