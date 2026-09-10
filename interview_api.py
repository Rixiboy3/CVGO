import os
import json
import re
from flask import request, jsonify


def _profile_from_request(d):
    return d.get('profile') or {}


def register_interview(app):
    @app.post('/api/interview')
    def interview_api():
        import app as app_module
        user = app_module.current_user()
        if not user:
            return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
        if not app_module.is_pro_user(user):
            return jsonify(ok=False, error='TRIAL_EXPIRED'), 402
        key = os.getenv('OPENAI_API_KEY', '').strip()
        model = os.getenv('OPENAI_MODEL', 'gpt-5.6-luna').strip()
        if not key:
            return jsonify(ok=False, error='AI_NOT_CONFIGURED'), 503
        d = request.get_json(silent=True) or {}
        offer = str(d.get('offer') or '').strip()
        profile = _profile_from_request(d)
        question = str(d.get('question') or '').strip()
        answer = str(d.get('answer') or '').strip()
        mode = str(d.get('mode') or 'evaluate').strip()
        asked = d.get('asked') or []
        if len(offer) < 30:
            return jsonify(ok=False, error='OFFER_REQUIRED'), 400
        from openai import OpenAI
        client = OpenAI(api_key=key)
        profile_json = json.dumps(profile, ensure_ascii=False)
        if mode == 'next':
            prompt = f'''Eres un entrevistador senior especializado en selección de personal.
Genera UNA siguiente pregunta de entrevista totalmente específica para ESTA oferta y ESTE candidato.

REGLAS:
- La pregunta debe servir para evaluar experiencia, funciones, motivación, competencias o una posible carencia relevante.
- Usa el CV para hacer preguntas concretas sobre su experiencia real.
- Si detectas una carencia importante en la oferta, puedes convertirla en una pregunta difícil para comprobar cómo la afrontaría.
- Alterna preguntas normales y preguntas exigentes.
- NO inventes ningún dato del candidato.
- No repitas ninguna pregunta ya realizada.
- Debe sonar como una pregunta de un entrevistador real, no como un cuestionario genérico.

Devuelve SOLO JSON:
{{"question":"","type":"","why":"","highlight":"","avoid":""}}

OFERTA:
{offer}

CANDIDATO:
{profile_json}

PREGUNTAS YA REALIZADAS:
{json.dumps(asked, ensure_ascii=False)}'''
        else:
            if len(answer) < 3:
                return jsonify(ok=False, error='ANSWER_REQUIRED'), 400
            prompt = f'''Eres un entrevistador senior y coach de selección.
Evalúa de forma exigente pero constructiva la respuesta del candidato para ESTA pregunta y ESTA oferta.

Valora:
- Relevancia para el puesto.
- Claridad y estructura.
- Evidencia concreta y credibilidad.
- Capacidad de comunicar valor.
- Uso de experiencias reales del CV.
- Si responde exactamente a lo que se pregunta.
- Si contiene afirmaciones inventadas o no respaldadas.

La respuesta mejorada debe ser natural, breve y fácil de decir en voz alta. Debe basarse SOLO en datos presentes en el CV o en la respuesta del candidato. NO inventes empresas, cifras, clientes, resultados, herramientas, responsabilidades ni experiencias.

Devuelve SOLO JSON con esta estructura:
{{"score":0,"verdict":"","strengths":[],"weaknesses":[],"missing":[],"improved_answer":"","tip":"","risk":""}}

OFERTA:
{offer}

CANDIDATO:
{profile_json}

PREGUNTA:
{question}

RESPUESTA DEL CANDIDATO:
{answer}'''
        try:
            response = client.responses.create(model=model, input=prompt)
            raw = getattr(response, 'output_text', '') or ''
            m = re.search(r'\{.*\}', raw, re.S)
            result = json.loads(m.group(0) if m else raw)
            if mode == 'next':
                result['question'] = str(result.get('question') or '').strip()
                result['type'] = str(result.get('type') or 'entrevista').strip()
                result['why'] = str(result.get('why') or '').strip()
                result['highlight'] = str(result.get('highlight') or '').strip()
                result['avoid'] = str(result.get('avoid') or '').strip()
                if not result['question']:
                    raise ValueError('Pregunta vacía')
                return jsonify(ok=True, result=result)
            result['score'] = max(0, min(100, int(result.get('score', 0))))
            for key_name in ('strengths', 'weaknesses', 'missing'):
                if not isinstance(result.get(key_name), list):
                    result[key_name] = []
                result[key_name] = [str(x).strip() for x in result[key_name] if str(x).strip()]
            for key_name in ('verdict', 'improved_answer', 'tip', 'risk'):
                result[key_name] = str(result.get(key_name) or '').strip()
            return jsonify(ok=True, result=result)
        except json.JSONDecodeError:
            return jsonify(ok=False, error='AI_INVALID_RESPONSE'), 502
        except Exception as e:
            return jsonify(ok=False, error='AI_REQUEST_FAILED', detail=str(e)[:300]), 502

    @app.before_request
    def cvgo_premium_guard():
        if request.path in ('/api/ai-generate', '/api/interview') and request.method == 'POST':
            import app as app_module
            user = app_module.current_user()
            if not user:
                return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
            if not app_module.is_pro_user(user):
                return jsonify(ok=False, error='TRIAL_EXPIRED'), 402

    original_home = app.view_functions.get('home')
    if original_home:
        def home_with_interview(*args, **kwargs):
            response = original_home(*args, **kwargs)
            body = response.get_data(as_text=True)
            if 'cvgo-session-checking' not in body:
                body = body.replace('</head>', '<style>html.cvgo-session-checking #auth{display:none!important}html.cvgo-session-checking #main{display:none!important}html.cvgo-session-checking body:after{content:"";position:fixed;inset:0;background:#f4f6fa;z-index:9999;pointer-events:none}</style><script>document.documentElement.classList.add("cvgo-session-checking");(function(){var t=setInterval(function(){var a=document.getElementById("auth"),m=document.getElementById("main");if((a&&!a.classList.contains("hidden"))||(m&&!m.classList.contains("hidden"))){document.documentElement.classList.remove("cvgo-session-checking");clearInterval(t)}},20);setTimeout(function(){document.documentElement.classList.remove("cvgo-session-checking");clearInterval(t)},10000)})();</script></head>')
            if '/interview.js' not in body:
                body = body.replace('</body>', '<script src="/interview.js?v=3"></script></body>')
            if '/pro.js' not in body:
                body = body.replace('</body>', '<script src="/pro.js?v=4"></script></body>')
            if '/photo.js' not in body:
                body = body.replace('</body>', '<script src="/photo.js?v=2"></script></body>')
            if '/templates.js' not in body:
                body = body.replace('</body>', '<script src="/templates.js?v=3"></script></body>')
            if '/printfix.js' not in body:
                body = body.replace('</body>', '<script src="/printfix.js?v=3"></script></body>')
            if '/cvgo_stylefix.js' not in body:
                body = body.replace('</body>', '<script src="/cvgo_stylefix.js?v=4"></script></body>')
            if '/authfix.js' not in body:
                body = body.replace('</body>', '<script src="/authfix.js?v=2"></script></body>')
            if '/brandfix.js' not in body:
                body = body.replace('</body>', '<script src="/brandfix.js?v=2"></script></body>')
            if '/antifraud.js' not in body:
                body = body.replace('</body>', '<script src="/antifraud.js?v=1"></script></body>')
            response.set_data(body)
            response.headers.pop('Content-Length', None)
            return response
        app.view_functions['home'] = home_with_interview

    @app.get('/interview.js')
    def interview_js():
        from flask import send_from_directory
        return send_from_directory('.', 'interview.js', mimetype='application/javascript')

    @app.get('/pro.js')
    def pro_js():
        from flask import send_from_directory
        return send_from_directory('.', 'pro.js', mimetype='application/javascript')

    @app.get('/photo.js')
    def photo_js():
        from flask import send_from_directory
        return send_from_directory('.', 'photo.js', mimetype='application/javascript')

    @app.get('/templates.js')
    def templates_js():
        from flask import send_from_directory
        return send_from_directory('.', 'templates.js', mimetype='application/javascript')

    @app.get('/printfix.js')
    def printfix_js():
        from flask import send_from_directory
        return send_from_directory('.', 'printfix.js', mimetype='application/javascript')

    @app.get('/cvgo_stylefix.js')
    def cvgo_stylefix_js():
        from flask import send_from_directory
        return send_from_directory('.', 'cvgo_stylefix.js', mimetype='text/javascript')

    @app.get('/authfix.js')
    def authfix_js():
        from flask import send_from_directory
        return send_from_directory('.', 'authfix.js', mimetype='application/javascript')

    @app.get('/antifraud.js')
    def antifraud_js():
        from flask import send_from_directory
        return send_from_directory('.', 'antifraud.js', mimetype='application/javascript')

    @app.get('/dashboard.css')
    def dashboard_css():
        from flask import send_from_directory
        return send_from_directory('.', 'dashboard.css', mimetype='text/css')

    @app.get('/dashboard.js')
    def dashboard_js():
        from flask import send_from_directory
        return send_from_directory('.', 'dashboard.js', mimetype='application/javascript')

register_interview(__import__('app').app)

# Billing loads after app initialization and route registration.
import billing_api

# Trial anti-abuse protection loads after all application routes are registered.
import antifraud
antifraud.register_antifraud(__import__('app').app)
