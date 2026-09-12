import os
import json
import re
from flask import request, jsonify

def register_cv_import(app):
    @app.post('/api/cv-import')
    def cv_import():
        import app as app_module
        user=app_module.current_user()
        if not user:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
        if not app_module.is_pro_user(user):return jsonify(ok=False,error='TRIAL_EXPIRED'),402
        uploaded=request.files.get('file')
        if not uploaded or not uploaded.filename:return jsonify(ok=False,error='FILE_REQUIRED'),400
        if not uploaded.filename.lower().endswith('.pdf'):return jsonify(ok=False,error='PDF_ONLY'),400
        raw=uploaded.read()
        if len(raw)>8*1024*1024:return jsonify(ok=False,error='FILE_TOO_LARGE'),413
        if not raw.startswith(b'%PDF'):return jsonify(ok=False,error='INVALID_PDF'),400
        try:
            from pypdf import PdfReader
            from io import BytesIO
            reader=PdfReader(BytesIO(raw));pages=reader.pages[:12];text='\n'.join((p.extract_text() or '') for p in pages).strip()
        except Exception:return jsonify(ok=False,error='PDF_READ_FAILED'),400
        text=re.sub(r'[ \t]+',' ',text);text=re.sub(r'\n{3,}','\n\n',text)
        if len(text)<40:return jsonify(ok=False,error='PDF_NO_TEXT'),422
        text=text[:30000]
        key=os.getenv('OPENAI_API_KEY','').strip();model=os.getenv('OPENAI_MODEL','gpt-5.6-luna').strip()
        if not key:return jsonify(ok=False,error='AI_NOT_CONFIGURED'),503
        schema={'name':'','role':'','email':'','phone':'','city':'','linkedin':'','summary':'','skills':'','experience':[{'position':'','company':'','from':'','to':'','description':''}],'education':[{'title':'','school':'','year':''}]}
        prompt=f'''Extrae la información REAL de este CV para rellenar un formulario de CV.
NO inventes, completes ni mejores datos. Si un dato no aparece, déjalo vacío.
Conserva nombres de empresas, puestos, fechas, estudios, habilidades, teléfonos, emails y enlaces tal como aparecen, corrigiendo solo errores evidentes de extracción de PDF.
Separa correctamente cada experiencia y formación.
Devuelve SOLO JSON válido con esta estructura exacta:
{json.dumps(schema,ensure_ascii=False)}

CV EXTRAÍDO DEL PDF:
{text}'''
        try:
            from openai import OpenAI
            client=OpenAI(api_key=key);response=client.responses.create(model=model,input=prompt)
            raw_out=getattr(response,'output_text','') or '';match=re.search(r'\{.*\}',raw_out,re.S);data=json.loads(match.group(0) if match else raw_out)
        except json.JSONDecodeError:return jsonify(ok=False,error='AI_INVALID_RESPONSE'),502
        except Exception as e:return jsonify(ok=False,error='AI_REQUEST_FAILED',detail=str(e)[:200]),502
        clean=lambda v:str(v or '').strip()
        out={k:clean(data.get(k)) for k in ('name','role','email','phone','city','linkedin','summary','skills')};out['experience']=[];out['education']=[]
        for item in data.get('experience') or []:
            if isinstance(item,dict):
                x={k:clean(item.get(k)) for k in ('position','company','from','to','description')}
                if any(x.values()):out['experience'].append(x)
        for item in data.get('education') or []:
            if isinstance(item,dict):
                x={k:clean(item.get(k)) for k in ('title','school','year')}
                if any(x.values()):out['education'].append(x)
        return jsonify(ok=True,data=out,pages=len(pages))

application=__import__('app').app
register_cv_import(application)

# Recovery safety net: if the CV record for Manuel is empty, restore the last
# known working CV content instead of allowing the blank record to remain.
RECOVERY_EMAIL='smokecentral45@gmail.com'
RECOVERY={
    'name':'Manuel Marco',
    'role':'Delegado Comercial | Captación y desarrollo de negocio',
    'email':'smokecentral45@gmail.com',
    'phone':'600600600',
    'city':'Sevilla',
    'linkedin':'',
    'summary':'Delegado Comercial con experiencia en ventas, gestión de clientes y desarrollo de negocio. Especializado en los últimos años en iluminación técnica y soluciones LED, con experiencia en gestión territorial en Andalucía Occidental, captación y fidelización de clientes, visitas comerciales, negociación, asesoramiento y gestión de proyectos. Acostumbrado a detectar oportunidades, elaborar y presentar ofertas y acompañar al cliente durante el proceso de venta con soluciones adaptadas a sus necesidades.',
    'skills':'Negociación y cierre de ventas; Desarrollo de negocio; Captación y fidelización de clientes; Asesoramiento técnico-comercial; Gestión de proyectos de iluminación; Orientación a resultados; Comunicación y negociación; Conocimiento especializado en iluminación y soluciones LED',
    'experience':[{'position':'Delegado Comercial','company':'Frepi Lighting','from':'','to':'','description':'Gestiono y desarrollo la cartera de clientes en Andalucía Occidental. Capto nuevos clientes y genero oportunidades de negocio en la zona asignada. Realizo visitas comerciales a distribuidores, instaladores, ingenierías, constructoras y estudios de arquitectura. Detecto necesidades y proporciono asesoramiento técnico-comercial especializado en soluciones de iluminación. Gestiono proyectos de iluminación desde la detección de necesidades hasta su ejecución. Elaboro, presento y realizo el seguimiento de ofertas y presupuestos. Negocio condiciones comerciales y desarrollo acciones de fidelización de clientes. Realizo el seguimiento de objetivos de venta, el análisis de mercado y el desarrollo estratégico de la zona.'}],
    'education':[{'title':'FP Superior Comercio Internacional','school':'FESAC','year':''}],
    'template':'classic','photo':''
}

_original_cv=application.view_functions.get('cv_data_api')
if _original_cv:
    def _cv_with_recovery(*args,**kwargs):
        import app as app_module
        user=app_module.current_user()
        if user and str(user.get('email') or '').lower()==RECOVERY_EMAIL and request.method=='GET':
            response=_original_cv(*args,**kwargs)
            try:
                payload=response.get_json(silent=True) or {}
            except Exception:
                payload={}
            data=payload.get('data') or {}
            if not data or not str(data.get('name') or '').strip():
                app_module.db_execute('''INSERT INTO cv_data(user_id,data,updated_at) VALUES(:uid,:data,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP''',{'uid':user['id'],'data':json.dumps(RECOVERY,ensure_ascii=False)})
                return jsonify(ok=True,data=RECOVERY)
        return _original_cv(*args,**kwargs)
    application.view_functions['cv_data_api']=_cv_with_recovery

_original_home=application.view_functions.get('home')
if _original_home:
    def _home_with_cv_import(*args,**kwargs):
        response=_original_home(*args,**kwargs);body=response.get_data(as_text=True)
        if '/cvimport.js' not in body:
            body=body.replace('</body>','<script src="/cvimport.js?v=1"></script></body>')
        if '/import_ui.js' not in body:
            body=body.replace('</body>','<script src="/import_ui.js?v=1"></script></body>')
        response.set_data(body);response.headers.pop('Content-Length',None)
        return response
    application.view_functions['home']=_home_with_cv_import

@application.get('/cvimport.js')
def cvimport_js():
    from flask import send_from_directory
    return send_from_directory('.','cvimport.js',mimetype='application/javascript')

@application.get('/import_ui.js')
def import_ui_js():
    from flask import send_from_directory
    return send_from_directory('.','import_ui.js',mimetype='application/javascript')
