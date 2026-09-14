import os
import json
import re
from flask import request, jsonify


def _clean_json_response(raw):
    s = str(raw or '').strip()
    if s.startswith('```'):
        s = re.sub(r'^```(?:json)?\s*', '', s, flags=re.I)
        s = re.sub(r'\s*```$', '', s)
    m = re.search(r'\{.*\}', s, re.S)
    return json.loads(m.group(0) if m else s)


def _ai_extract(prompt, configured_model):
    from openai import OpenAI
    models = []
    for model in (configured_model, 'gpt-5-mini', 'gpt-4o-mini'):
        model = str(model or '').strip()
        if model and model not in models:
            models.append(model)
    errors = []
    for model in models:
        try:
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY', '').strip(), timeout=45.0, max_retries=1)
            response = client.responses.create(model=model, input=prompt)
            data = _clean_json_response(getattr(response, 'output_text', '') or '')
            if not isinstance(data, dict):
                raise ValueError('La IA no devolvió un objeto JSON')
            return data, model
        except Exception as exc:
            errors.append(f'{model}: {str(exc)[:220]}')
    raise RuntimeError(' | '.join(errors)[:700])


def _normalise_pdf_text(text):
    fixed = []
    for raw in str(text or '').splitlines():
        line = raw.replace('\u00a0', ' ').strip()
        if not line:
            fixed.append('')
            continue
        line = re.sub(r'[ \t]+', ' ', line).strip()
        fixed.append(line)
    return '\n'.join(fixed)


def _extract_languages(text):
    lines = [re.sub(r'\s+', ' ', x).strip() for x in _normalise_pdf_text(text).splitlines() if x.strip()]
    low = [x.lower() for x in lines]
    start = next((i for i, value in enumerate(low) if value in ('idiomas', 'languages', 'idioma')), -1)
    if start < 0:
        return []
    headings = {'contacto', 'educación', 'educacion', 'formación', 'formacion', 'experiencia profesional', 'experiencia', 'habilidades', 'skills', 'competencias'}
    stop = next((j for j in range(start + 1, len(lines)) if low[j] in headings), len(lines))
    out = []
    for line in lines[start + 1:stop]:
        value = line.strip('•-·* ').strip()
        if not value:
            continue
        match = re.match(r'^([^:–—-]{2,40})\s*[:–—-]\s*(.+)$', value)
        if match:
            language, level = match.group(1).strip(), match.group(2).strip()
        else:
            parts = re.split(r'\s{2,}', value, 1)
            language, level = (parts[0].strip(), parts[1].strip()) if len(parts) == 2 else (value, '')
        if language and not re.search(r'@|\d{6,}', language):
            out.append({'language': language, 'level': level})
    return out


def _basic_extract(text):
    lines = [re.sub(r'\s+', ' ', x).strip() for x in _normalise_pdf_text(text).splitlines() if x.strip()]
    out = {'name': '', 'role': '', 'email': '', 'phone': '', 'city': '', 'linkedin': '', 'summary': '', 'skills': '', 'experience': [], 'education': [], 'languages': []}
    if not lines:
        return out
    joined = '\n'.join(lines)
    match = re.search(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', joined, re.I)
    if match:
        out['email'] = match.group(0)
    match = re.search(r'(?<!\d)(?:\+34[\s.-]?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)', joined)
    if match:
        out['phone'] = re.sub(r'[ .-]', '', match.group(0))
    match = re.search(r'https?://(?:www\.)?linkedin\.com/[^\s)]+', joined, re.I)
    if match:
        out['linkedin'] = match.group(0).rstrip('.,;')
    for line in lines[:20]:
        if '@' in line or re.search(r'\d', line):
            continue
        words = line.split()
        if 2 <= len(words) <= 5 and len(line) <= 70 and sum(w[:1].isupper() for w in words) >= 2:
            out['name'] = line
            break
    low = [x.lower() for x in lines]
    def section(*names):
        wanted = {n.lower() for n in names}
        return next((i for i, value in enumerate(low) if value in wanted), -1)
    about = section('acerca de mí', 'acerca de mi', 'perfil', 'sobre mí', 'sobre mi', 'resumen')
    experience = section('experiencia profesional', 'experiencia laboral', 'experiencia')
    education = section('educación', 'educacion', 'formación', 'formacion')
    skills = section('habilidades', 'skills', 'competencias')
    if about >= 0:
        end = min([x for x in (experience, education, skills, len(lines)) if x > about], default=len(lines))
        out['summary'] = ' '.join(lines[about + 1:end]).strip()
    if skills >= 0:
        end = min([x for x in (section('idiomas', 'languages'), len(lines)) if x > skills], default=len(lines))
        values = [x.strip('•-·* ').strip() for x in lines[skills + 1:end] if x.strip()]
        out['skills'] = '; '.join(values[:20])
    out['languages'] = _extract_languages(text)
    if experience >= 0:
        end = min([x for x in (education, skills, section('idiomas', 'languages'), len(lines)) if x > experience], default=len(lines))
        block = lines[experience + 1:end]
        current = None
        for line in block:
            if not line.strip():
                continue
            if current is None:
                current = {'position': line, 'company': '', 'from': '', 'to': '', 'description': ''}
                continue
            if not current['company'] and len(line) <= 100:
                current['company'] = line
                continue
            current['description'] = (current['description'] + ' ' + line).strip()
            if len(current['description']) > 1200:
                out['experience'].append(current)
                current = None
        if current and any(current.values()):
            out['experience'].append(current)
    if education >= 0:
        end = min([x for x in (experience, skills, len(lines)) if x > education], default=len(lines))
        block = lines[education + 1:end]
        for i in range(0, len(block), 2):
            title = block[i].strip()
            school = block[i + 1].strip() if i + 1 < len(block) else ''
            if title:
                out['education'].append({'title': title, 'school': school, 'year': ''})
    return out


def register_cv_import(app):
    @app.post('/api/cv-import')
    def cv_import():
        stage = 'start'
        try:
            stage = 'session'
            import app as app_module
            user = app_module.current_user()
            if not user:
                return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
            if not app_module.is_pro_user(user):
                return jsonify(ok=False, error='TRIAL_EXPIRED'), 402
            stage = 'upload'
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
            stage = 'pdf'
            try:
                from io import BytesIO
                from pypdf import PdfReader
                reader = PdfReader(BytesIO(raw))
                pages = reader.pages[:12]
                text = '\n'.join((page.extract_text() or '') for page in pages).strip()
            except Exception:
                return jsonify(ok=False, error='PDF_READ_FAILED', stage=stage), 400
            text = _normalise_pdf_text(text)
            text = re.sub(r'\n{3,}', '\n\n', text)
            if len(text) < 40:
                return jsonify(ok=False, error='PDF_NO_TEXT'), 422
            text = text[:30000]
            key = os.getenv('OPENAI_API_KEY', '').strip()
            model = os.getenv('OPENAI_MODEL', 'gpt-5-mini').strip() or 'gpt-5-mini'
            schema = {'name':'','role':'','email':'','phone':'','city':'','linkedin':'','summary':'','skills':'','experience':[{'position':'','company':'','from':'','to':'','description':''}],'education':[{'title':'','school':'','year':''}],'languages':[{'language':'','level':''}]}
            prompt = f'''Extrae únicamente información REAL de este CV para rellenar un formulario de CV. NO inventes, completes ni mejores datos. Si un dato no aparece, déjalo vacío. Conserva nombres de empresas, puestos, fechas, estudios, idiomas, niveles, habilidades, teléfonos, emails y enlaces tal como aparecen. Devuelve SOLO JSON válido con esta estructura exacta:\n{json.dumps(schema, ensure_ascii=False)}\n\nCV EXTRAÍDO DEL PDF:\n{text}'''
            data = None
            used_model = 'local-fallback'
            warning = ''
            if key:
                stage = 'ai'
                try:
                    data, used_model = _ai_extract(prompt, model)
                except Exception:
                    warning = 'La IA no está disponible; se ha usado el importador local.'
                    data = _basic_extract(text)
            else:
                warning = 'La IA no está configurada; se ha usado el importador local.'
                data = _basic_extract(text)
            clean = lambda value: str(value or '').strip()
            out = {key: clean(data.get(key)) for key in ('name','role','email','phone','city','linkedin','summary','skills')}
            out['experience'] = []
            out['education'] = []
            for item in data.get('experience') or []:
                if isinstance(item, dict):
                    row = {key: clean(item.get(key)) for key in ('position','company','from','to','description')}
                    if any(row.values()):
                        out['experience'].append(row)
            for item in data.get('education') or []:
                if isinstance(item, dict):
                    row = {key: clean(item.get(key)) for key in ('title','school','year')}
                    if any(row.values()):
                        out['education'].append(row)
            out['languages'] = []
            for item in data.get('languages') or _extract_languages(text):
                if isinstance(item, dict):
                    row = {'language': clean(item.get('language')), 'level': clean(item.get('level'))}
                    if any(row.values()):
                        out['languages'].append(row)
            payload = {'ok': True, 'data': out, 'pages': len(pages), 'model': used_model}
            if warning:
                payload['warning'] = warning
            return jsonify(payload)
        except Exception as exc:
            return jsonify(ok=False, error='IMPORT_SERVER_ERROR', stage=stage), 500


application = __import__('app').app
register_cv_import(application)


@application.get('/cvimport.js')
def cvimport_js():
    from flask import send_from_directory
    return send_from_directory('.', 'cvimport.js', mimetype='application/javascript')


@application.get('/import_ui.js')
def import_ui_js():
    from flask import send_from_directory
    return send_from_directory('.', 'import_ui.js', mimetype='application/javascript')
