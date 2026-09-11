import os
import json
import re
from flask import request, jsonify


def register_cv_import(app):
    @app.post('/api/cv-import')
    def cv_import():
        import app as app_module
        user = app_module.current_user()
        if not user:
            return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
        if not app_module.is_pro_user(user):
            return jsonify(ok=False, error='TRIAL_EXPIRED'), 402

        uploaded = request.files.get('file')
        if not uploaded or not uploaded.filename:
            return jsonify(ok=False, error='FILE_REQUIRED'), 400
        if not uploaded.filename.lower().endswith('.pdf'):
            return jsonify(ok=False, error='PDF_ONLY'), 400

        raw = uploaded.read()
        if len(raw) > 8 * 1024 * 1024:
            return jsonify(ok=False, error='FILE_TOO_LARGE'), 413
        if not raw.startswith(b'%PDF'):
            return jsonify(ok=False, error='INVALID_PDF'), 400

        try:
            from pypdf import PdfReader
            from io import BytesIO
            reader = PdfReader(BytesIO(raw))
            pages = reader.pages[:12]
            text = '\n'.join((p.extract_text() or '') for p in pages).strip()
        except Exception:
            return jsonify(ok=False, error='PDF_READ_FAILED'), 400

        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        if len(text) < 40:
            return jsonify(ok=False, error='PDF_NO_TEXT'), 422
        if len(text) > 30000:
            text = text[:30000]

        key = os.getenv('OPENAI_API_KEY', '').strip()
        model = os.getenv('OPENAI_MODEL', 'gpt-5.6-luna').strip()
        if not key:
            return jsonify(ok=False, error='AI_NOT_CONFIGURED'), 503

        schema = {
            'name': '', 'role': '', 'email': '', 'phone': '', 'city': '', 'linkedin': '',
            'summary': '', 'skills': '',
            'experience': [{'position': '', 'company': '', 'from': '', 'to': '', 'description': ''}],
            'education': [{'title': '', 'school': '', 'year': ''}]
        }
        prompt = f'''Extrae la información REAL de este CV para rellenar un formulario de CV.
NO inventes, completes ni mejores datos. Si un dato no aparece, déjalo vacío.
Conserva nombres de empresas, puestos, fechas, estudios, habilidades, teléfonos, emails y enlaces tal como aparecen, corrigiendo solo errores evidentes de extracción de PDF.
Separa correctamente cada experiencia y formación.
Devuelve SOLO JSON válido con esta estructura exacta:
{json.dumps(schema, ensure_ascii=False)}

CV EXTRAÍDO DEL PDF:
{text}'''

        try:
            from openai import OpenAI
            client = OpenAI(api_key=key)
            response = client.responses.create(model=model, input=prompt)
            raw_out = getattr(response, 'output_text', '') or ''
            match = re.search(r'\{.*\}', raw_out, re.S)
            data = json.loads(match.group(0) if match else raw_out)
        except json.JSONDecodeError:
            return jsonify(ok=False, error='AI_INVALID_RESPONSE'), 502
        except Exception as e:
            return jsonify(ok=False, error='AI_REQUEST_FAILED', detail=str(e)[:200]), 502

        def clean(v):
            return str(v or '').strip()
        out = {k: clean(data.get(k)) for k in ('name','role','email','phone','city','linkedin','summary','skills')}
        out['experience'] = []
        for item in data.get('experience') or []:
            if isinstance(item, dict):
                x = {k: clean(item.get(k)) for k in ('position','company','from','to','description')}
                if any(x.values()): out['experience'].append(x)
        out['education'] = []
        for item in data.get('education') or []:
            if isinstance(item, dict):
                x = {k: clean(item.get(k)) for k in ('title','school','year')}
                if any(x.values()): out['education'].append(x)
        return jsonify(ok=True, data=out, pages=len(pages))

register_cv_import(__import__('app').app)

# Inject the importer script after the existing home wrappers are installed.
_original_home = app.view_functions.get('home')
if _original_home:
    def _home_with_cv_import(*args, **kwargs):
        response = _original_home(*args, **kwargs)
        body = response.get_data(as_text=True)
        if '/cvimport.js' not in body:
            body = body.replace('</body>', '<script src="/cvimport.js?v=1"></script></body>')
            response.set_data(body)
            response.headers.pop('Content-Length', None)
        return response
    app.view_functions['home'] = _home_with_cv_import

@app.get('/cvimport.js')
def cvimport_js():
    from flask import send_from_directory
    return send_from_directory('.', 'cvimport.js', mimetype='application/javascript')
