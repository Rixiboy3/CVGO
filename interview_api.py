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
        user=app_module.current_user()
        if not user:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
        if not app_module.is_pro_user(user):return jsonify(ok=False,error='TRIAL_EXPIRED'),402
        d=request.get_json(silent=True) or {}
        profile=_profile_from_request(d)
        question=str(d.get('question') or '').strip()
        if not question:return jsonify(ok=False,error='QUESTION_REQUIRED'),400
        key=os.getenv('OPENAI_API_KEY','').strip()
        model=os.getenv('OPENAI_MODEL','gpt-5.6-luna').strip()
        if not key:return jsonify(ok=False,error='AI_NOT_CONFIGURED'),503
        try:
            from openai import OpenAI
            client=OpenAI(api_key=key,timeout=60.0,max_retries=2)
            prompt=f"""Eres un entrevistador profesional. Evalúa la respuesta del candidato de forma realista y útil.
No inventes datos sobre el candidato. Usa solo la información proporcionada.
Devuelve SOLO JSON con score (0-100), verdict, improved_answer, tip y risk.

PUESTO/CONTEXTO:
{json.dumps(profile,ensure_ascii=False)}

PREGUNTA:
{question}

RESPUESTA DEL CANDIDATO:
{str(d.get('answer') or '').strip()}"""
            response=client.responses.create(model=model,input=prompt)
            raw=getattr(response,'output_text','') or ''
            match=re.search(r'\{.*\}',raw,re.S)
            result=json.loads(match.group(0) if match else raw)
            result['score']=max(0,min(100,int(result.get('score',0))))
            for key_name in ('verdict','improved_answer','tip','risk'):
                result[key_name]=str(result.get(key_name) or '').strip()
            return jsonify(ok=True,result=result)
        except json.JSONDecodeError:
            return jsonify(ok=False,error='AI_INVALID_RESPONSE'),502
        except Exception as e:
            return jsonify(ok=False,error='AI_REQUEST_FAILED',detail=str(e)[:300]),502

    @app.before_request
    def cvgo_premium_guard():
        if request.path in ('/api/ai-generate','/api/interview') and request.method=='POST':
            import app as app_module
            user=app_module.current_user()
            if not user:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
            if not app_module.is_pro_user(user):return jsonify(ok=False,error='TRIAL_EXPIRED'),402

    original_home=app.view_functions.get('home')
    if original_home:
        def home_with_interview(*args,**kwargs):
            response=original_home(*args,**kwargs)
            body=response.get_data(as_text=True)
            if 'cvgo-session-checking' not in body:
                body=body.replace('</head>','<style>html.cvgo-session-checking #auth{display:none!important}html.cvgo-session-checking #main{display:none!important}html.cvgo-session-checking body:after{content:"";position:fixed;inset:0;background:#f4f6fa;z-index:9999;pointer-events:none}</style><script>document.documentElement.classList.add("cvgo-session-checking");(function(){var t=setInterval(function(){var a=document.getElementById("auth"),m=document.getElementById("main");if((a&&!a.classList.contains("hidden"))||(m&&!m.classList.contains("hidden"))){document.documentElement.classList.remove("cvgo-session-checking");clearInterval(t)}},20);setTimeout(function(){document.documentElement.classList.remove("cvgo-session-checking");clearInterval(t)},10000)})();</script></head>')
            if '/interview.js' not in body:body=body.replace('</body>','<script src="/interview.js?v=3"></script></body>')
            if '/pro.js' not in body:body=body.replace('</body>','<script src="/pro.js?v=6"></script></body>')
            if '/profix.js' not in body:body=body.replace('</body>','<script src="/profix.js?v=2"></script></body>')
            if '/photo.js' not in body:body=body.replace('</body>','<script src="/photo.js?v=2"></script></body>')
            if '/templates.js' not in body:body=body.replace('</body>','<script src="/templates.js?v=3"></script></body>')
            if '/printfix.js' not in body:body=body.replace('</body>','<script src="/printfix.js?v=3"></script></body>')
            if '/cvgo_stylefix.js' not in body:body=body.replace('</body>','<script src="/cvgo_stylefix.js?v=4"></script></body>')
            if '/authfix.js' not in body:body=body.replace('</body>','<script src="/authfix.js?v=2"></script></body>')
            if '/brandfix.js' not in body:body=body.replace('</body>','<script src="/brandfix.js?v=2"></script></body>')
            if '/antifraud.js' not in body:body=body.replace('</body>','<script src="/antifraud.js?v=1"></script></body>')
            response.set_data(body);response.headers.pop('Content-Length',None);return response
        app.view_functions['home']=home_with_interview

    @app.get('/interview.js')
    def interview_js():
        from flask import send_from_directory
        return send_from_directory('.','interview.js',mimetype='application/javascript')
    @app.get('/pro.js')
    def pro_js():
        from flask import send_from_directory
        return send_from_directory('.','pro.js',mimetype='application/javascript')
    @app.get('/profix.js')
    def profix_js():
        from flask import send_from_directory
        return send_from_directory('.','profix.js',mimetype='application/javascript')
    @app.get('/photo.js')
    def photo_js():
        from flask import send_from_directory
        return send_from_directory('.','photo.js',mimetype='application/javascript')
    @app.get('/templates.js')
    def templates_js():
        from flask import send_from_directory
        return send_from_directory('.','templates.js',mimetype='application/javascript')
    @app.get('/printfix.js')
    def printfix_js():
        from flask import send_from_directory
        return send_from_directory('.','printfix.js',mimetype='text/javascript')
    @app.get('/cvgo_stylefix.js')
    def cvgo_stylefix_js():
        from flask import send_from_directory
        return send_from_directory('.','cvgo_stylefix.js',mimetype='application/javascript')
    @app.get('/authfix.js')
    def authfix_js():
        from flask import send_from_directory
        return send_from_directory('.','authfix.js',mimetype='application/javascript')
    @app.get('/antifraud.js')
    def antifraud_js():
        from flask import send_from_directory
        return send_from_directory('.','antifraud.js',mimetype='application/javascript')
    @app.get('/dashboard.css')
    def dashboard_css():
        from flask import send_from_directory
        return send_from_directory('.','dashboard.css',mimetype='text/css')
    @app.get('/dashboard.js')
    def dashboard_js():
        from flask import send_from_directory
        return send_from_directory('.','dashboard.js',mimetype='application/javascript')

register_interview(__import__('app').app)
import billing_api
import antifraud
antifraud.register_antifraud(__import__('app').app)
import cover_api
cover_api.register_cover(__import__('app').app)
# Register the PDF CV importer last so its endpoint and home wrapper are always present.
import cv_import_api
