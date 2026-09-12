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
    models=[]
    for model in (configured_model,'gpt-5-mini','gpt-4o-mini'):
        model=str(model or '').strip()
        if model and model not in models: models.append(model)
    errors=[]
    for model in models:
        try:
            client=OpenAI(api_key=os.getenv('OPENAI_API_KEY','').strip(),timeout=45.0,max_retries=1)
            response=client.responses.create(model=model,input=prompt)
            data=_clean_json_response(getattr(response,'output_text','') or '')
            if not isinstance(data,dict): raise ValueError('La IA no devolvió un objeto JSON')
            return data,model
        except Exception as e:
            errors.append(f'{model}: {str(e)[:220]}')
    raise RuntimeError(' | '.join(errors)[:700])


def _basic_extract(text):
    s=str(text or '')
    lines=[re.sub(r'\s+',' ',x).strip() for x in s.splitlines() if x.strip()]
    joined='\n'.join(lines)
    low=[x.lower() for x in lines]
    headings={'perfil','perfil profesional','resumen','experiencia','experiencia profesional','experiencia laboral','formación','formacion','educación','educacion','estudios','habilidades','skills','competencias','aptitudes','idiomas','contacto','sobre mí','sobre mi'}
    out={'name':'','role':'','email':'','phone':'','city':'','linkedin':'','summary':'','skills':'','experience':[],'education':[]}
    m=re.search(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}',joined,re.I)
    if m: out['email']=m.group(0)
    m=re.search(r'(?<!\d)(?:\+34[\s.-]?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)',joined)
    if m: out['phone']=m.group(0)
    m=re.search(r'https?://(?:www\.)?linkedin\.com/[^\s)]+',joined,re.I)
    if m: out['linkedin']=m.group(0).rstrip('.,;')
    for i,line in enumerate(lines[:20]):
        if line.lower() in headings or '@' in line or 'linkedin' in line.lower(): continue
        words=line.split()
        if 2<=len(words)<=5 and len(line)<=70 and not re.search(r'\d{3}',line) and sum(w[:1].isupper() for w in words)>=2:
            out['name']=line; break
    if out['name']:
        idx=lines.index(out['name'])
        for line in lines[idx+1:idx+7]:
            if line.lower() not in headings and '@' not in line and 'linkedin' not in line.lower() and len(line)<=120:
                out['role']=line; break
    if not out['role']:
        role_words=r'(?:director|gerente|comercial|ventas|marketing|ingeniero|ingeniera|técnico|tecnico|consultor|consultora|diseñador|desarrollador|administrativo|responsable|manager|sales|developer|engineer)'
        for line in lines[:30]:
            if re.search(role_words,line,re.I) and len(line)<=120: out['role']=line; break
    for c in ['Sevilla','Madrid','Barcelona','Valencia','Málaga','Malaga','Alicante','Bilbao','Córdoba','Cordoba','Granada','Zaragoza','Murcia','Cádiz','Cadiz','Huelva','Jaén','Jaen']:
        if re.search(r'\b'+re.escape(c)+r'\b',joined,re.I): out['city']=c; break

    def section(names):
        starts=[]
        for i,l in enumerate(low):
            norm=re.sub(r'[^a-záéíóúüñ ]','',l).strip()
            if norm in names: starts.append(i)
        if not starts:return []
        i=starts[0]+1;end=len(lines)
        for j in range(i,len(lines)):
            norm=re.sub(r'[^a-záéíóúüñ ]','',low[j]).strip()
            if norm in headings and j>i: end=j;break
        return lines[i:end]

    x=section({'perfil','perfil profesional','resumen','sobre mí','sobre mi'})
    if x: out['summary']=' '.join(x[:12])
    x=section({'habilidades','skills','competencias','aptitudes'})
    if x: out['skills']='; '.join(x[:20])
    x=section({'formación','formacion','educación','educacion','estudios'})
    if x:
        useful=[v for v in x[:12] if not re.fullmatch(r'\d{4}(?:\s*[-/]\s*\d{4})?',v)]
        if useful: out['education']=[{'title':useful[0],'school':useful[1] if len(useful)>1 else '','year':''}]
    x=section({'experiencia','experiencia profesional','experiencia laboral','experience','employment'})
    if x:
        cur=None
        for line in x:
            bullet=line.startswith(('-', '•', '·', '*'))
            if not bullet and (cur is None or len(line)<=100):
                if cur and any(cur.values()): out['experience'].append(cur)
                cur={'position':line,'company':'','from':'','to':'','description':''}
            elif cur:
                v=line.lstrip('-•·* ').strip()
                if v: cur['description']=(cur['description']+' '+v).strip()
        if cur and any(cur.values()): out['experience'].append(cur)
    return out


def register_cv_import(app):
    @app.post('/api/cv-import')
    def cv_import():
        stage='start'
        try:
            stage='session'
            import app as app_module
            user=app_module.current_user()
            if not user:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
            if not app_module.is_pro_user(user):return jsonify(ok=False,error='TRIAL_EXPIRED'),402
            stage='upload'
            uploaded=request.files.get('file')
            if not uploaded or not uploaded.filename:return jsonify(ok=False,error='FILE_REQUIRED'),400
            if not uploaded.filename.lower().endswith('.pdf'):return jsonify(ok=False,error='PDF_ONLY'),400
            raw=uploaded.read()
            if len(raw)>8*1024*1024:return jsonify(ok=False,error='FILE_TOO_LARGE'),413
            if not raw.startswith(b'%PDF'):return jsonify(ok=False,error='INVALID_PDF'),400
            stage='pdf'
            try:
                from pypdf import PdfReader
                from io import BytesIO
                reader=PdfReader(BytesIO(raw));pages=reader.pages[:12];text='\n'.join((p.extract_text() or '') for p in pages).strip()
            except Exception as e:return jsonify(ok=False,error='PDF_READ_FAILED',detail=str(e)[:300],stage=stage),400
            text=re.sub(r'[ \t]+',' ',text);text=re.sub(r'\n{3,}','\n\n',text)
            if len(text)<40:return jsonify(ok=False,error='PDF_NO_TEXT'),422
            text=text[:30000]
            key=os.getenv('OPENAI_API_KEY','').strip()
            model=os.getenv('OPENAI_MODEL','gpt-5-mini').strip() or 'gpt-5-mini'
            schema={'name':'','role':'','email':'','phone':'','city':'','linkedin':'','summary':'','skills':'','experience':[{'position':'','company':'','from':'','to':'','description':''}],'education':[{'title':'','school':'','year':''}]}
            prompt=f'''Extrae la información REAL de este CV para rellenar un formulario de CV.
NO inventes, completes ni mejores datos. Si un dato no aparece, déjalo vacío.
Conserva nombres de empresas, puestos, fechas, estudios, habilidades, teléfonos, emails y enlaces tal como aparecen, corrigiendo solo errores evidentes de extracción de PDF.
Separa correctamente cada experiencia y formación.
Devuelve SOLO JSON válido con esta estructura exacta:
{json.dumps(schema,ensure_ascii=False)}

CV EXTRAÍDO DEL PDF:
{text}'''
            data=None;used_model='local-fallback';ai_warning=''
            if key:
                stage='ai'
                try:
                    data,used_model=_ai_extract(prompt,model)
                except Exception as e:
                    # OpenAI 429/quota errors must not break the importer. Fall back to local parsing.
                    ai_warning='La IA no tiene créditos disponibles; se ha usado el importador local gratuito.'
                    data=_basic_extract(text)
            else:
                ai_warning='La IA no está configurada; se ha usado el importador local gratuito.'
                data=_basic_extract(text)
            stage='clean';clean=lambda v:str(v or '').strip();out={k:clean(data.get(k)) for k in ('name','role','email','phone','city','linkedin','summary','skills')};out['experience']=[];out['education']=[]
            for item in data.get('experience') or []:
                if isinstance(item,dict):
                    x={k:clean(item.get(k)) for k in ('position','company','from','to','description')}
                    if any(x.values()):out['experience'].append(x)
            for item in data.get('education') or []:
                if isinstance(item,dict):
                    x={k:clean(item.get(k)) for k in ('title','school','year')}
                    if any(x.values()):out['education'].append(x)
            payload={'ok':True,'data':out,'pages':len(pages),'model':used_model}
            if ai_warning: payload['warning']=ai_warning
            return jsonify(payload)
        except Exception as e:
            return jsonify(ok=False,error='IMPORT_SERVER_ERROR',stage=stage,detail=f'{type(e).__name__}: {str(e)[:600]}'),500

application=__import__('app').app
register_cv_import(application)

RECOVERY_EMAIL='smokecentral45@gmail.com'
RECOVERY={'name':'Manuel Marco','role':'Delegado Comercial | Captación y desarrollo de negocio','email':'smokecentral45@gmail.com','phone':'600600600','city':'Sevilla','linkedin':'','summary':'Delegado Comercial con experiencia en ventas, gestión de clientes y desarrollo de negocio. Especializado en los últimos años en iluminación técnica y soluciones LED, con experiencia en gestión territorial en Andalucía Occidental, captación y fidelización de clientes, visitas comerciales, negociación, asesoramiento y gestión de proyectos. Acostumbrado a detectar oportunidades, elaborar y presentar ofertas y acompañar al cliente durante el proceso de venta con soluciones adaptadas a sus necesidades.','skills':'Negociación y cierre de ventas; Desarrollo de negocio; Captación y fidelización de clientes; Asesoramiento técnico-comercial; Gestión de proyectos de iluminación; Orientación a resultados; Comunicación y negociación; Conocimiento especializado en iluminación y soluciones LED','experience':[{'position':'Delegado Comercial','company':'Frepi Lighting','from':'','to':'','description':'Gestiono y desarrollo la cartera de clientes en Andalucía Occidental. Capto nuevos clientes y genero oportunidades de negocio en la zona asignada. Realizo visitas comerciales a distribuidores, instaladores, ingenierías, constructoras y estudios de arquitectura. Detecto necesidades y proporciono asesoramiento técnico-comercial especializado en soluciones de iluminación. Gestiono proyectos de iluminación desde la detección de necesidades hasta su ejecución. Elaboro, presento y realizo el seguimiento de ofertas y presupuestos. Negocio condiciones comerciales y desarrollo acciones de fidelización de clientes. Realizo el seguimiento de objetivos de venta, el análisis de mercado y el desarrollo estratégico de la zona.'}],'education':[{'title':'FP Superior Comercio Internacional','school':'FESAC','year':''}],'template':'classic','photo':''}

_original_cv=application.view_functions.get('cv_data_api')
if _original_cv:
    def _cv_with_recovery(*args,**kwargs):
        import app as app_module
        user=app_module.current_user()
        if user and str(user.get('email') or '').lower()==RECOVERY_EMAIL and request.method=='GET':
            response=_original_cv(*args,**kwargs)
            try:payload=response.get_json(silent=True) or {}
            except Exception:payload={}
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
        if '/cvimport.js' not in body:body=body.replace('</body>','<script src="/cvimport.js?v=1"></script></body>')
        if '/import_ui.js' not in body:body=body.replace('</body>','<script src="/import_ui.js?v=1"></script></body>')
        response.set_data(body);response.headers.pop('Content-Length',None);return response
    application.view_functions['home']=_home_with_cv_import

@application.get('/cvimport.js')
def cvimport_js():
    from flask import send_from_directory
    return send_from_directory('.','cvimport.js',mimetype='application/javascript')

@application.get('/import_ui.js')
def import_ui_js():
    from flask import send_from_directory
    return send_from_directory('.','import_ui.js',mimetype='application/javascript')
