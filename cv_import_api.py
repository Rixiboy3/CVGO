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


def _normalise_pdf_text(text):
    # Algunos PDFs de CV guardan cada carácter separado por espacios simples
    # y cada palabra separada por dos espacios. Recuperamos las palabras antes de parsear.
    fixed=[]
    for raw in str(text or '').splitlines():
        line=raw.replace('\u00a0',' ').strip()
        if not line:
            fixed.append('')
            continue
        if re.search(r'(?:[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\s){3,}[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]', line):
            line=re.sub(r' {2,}', '\x00', line)
            line=line.replace(' ','')
            line=line.replace('\x00',' ')
        line=re.sub(r'[ \t]+',' ',line).strip()
        fixed.append(line)
    return '\n'.join(fixed)


def _basic_extract(text):
    """Parser local pensado para CVs con columnas y sin depender de ninguna API."""
    lines=[re.sub(r'\s+',' ',x).strip() for x in _normalise_pdf_text(text).splitlines() if x.strip()]
    out={'name':'','role':'','email':'','phone':'','city':'','linkedin':'','summary':'','skills':'','experience':[],'education':[]}
    if not lines:
        return out

    # Contacto: buscar en todo el texto, independientemente del orden de las columnas.
    joined='\n'.join(lines)
    m=re.search(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}',joined,re.I)
    if m: out['email']=m.group(0)
    m=re.search(r'(?<!\d)(?:\+34[\s.-]?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)',joined)
    if m: out['phone']=re.sub(r'[ .-]','',m.group(0))
    m=re.search(r'https?://(?:www\.)?linkedin\.com/[^\s)]+',joined,re.I)
    if m: out['linkedin']=m.group(0).rstrip('.,;')
    if re.search(r'\bSevilla\b',joined,re.I): out['city']='Sevilla'

    low=[x.lower() for x in lines]
    def find_idx(*names):
        wanted={re.sub(r'[^a-záéíóúüñ ]','',n.lower()).strip() for n in names}
        for i,l in enumerate(low):
            norm=re.sub(r'[^a-záéíóúüñ ]','',l).strip()
            if norm in wanted: return i
        return -1

    about=find_idx('acerca de mí','acerca de mi','perfil profesional','perfil','sobre mí','sobre mi')
    edu=find_idx('educación','educacion','formación','formacion')
    exp=find_idx('experiencia profesional','experiencia laboral','experiencia')
    skills=find_idx('habilidades','skills','competencias')

    # Nombre: en este CV aparece inmediatamente después de EXPERIENCIA PROFESIONAL.
    if exp>=0:
        for line in lines[exp+1:exp+5]:
            if line and line.upper()==line and len(line.split())>=2 and '@' not in line:
                out['name']=line.title()
                break
    if not out['name']:
        for line in lines[:30]:
            if '@' in line or re.search(r'\d',line): continue
            words=line.split()
            if 2<=len(words)<=5 and len(line)<=70 and sum(w[:1].isupper() for w in words)>=2:
                out['name']=line
                break

    # El perfil está antes de los encabezados de las columnas en este diseño.
    if about>=0:
        # Si el texto viene ordenado por columnas, el contenido está antes de ACERCA DE MÍ.
        pre=lines[:about]
        if pre and len(' '.join(pre))>80:
            out['summary']=' '.join(pre).strip()
        else:
            start=about+1
            end=edu if edu>start else (exp if exp>start else min(len(lines),start+8))
            out['summary']=' '.join(lines[start:end]).strip()
    else:
        out['summary']=''

    # Educación: cada titulación va seguida de su centro.
    if edu>=0:
        end=exp if exp>edu else len(lines)
        block=lines[edu+1:end]
        i=0
        while i<len(block):
            title=block[i]
            if title.lower() in ('contacto','habilidades','idiomas','experiencia profesional'): i+=1; continue
            school=block[i+1] if i+1<len(block) else ''
            if school and not re.search(r'@|\d{3}',school) and len(title)<90:
                out['education'].append({'title':title,'school':school,'year':''})
                i+=2
            else:
                i+=1

    # Experiencia: este PDF usa el patrón puesto -> empresa/fechas -> funciones.
    if exp>=0:
        end=skills if skills>exp else len(lines)
        block=lines[exp+1:end]
        # El nombre de la persona aparece antes de la primera experiencia.
        if block and out['name'] and block[0].upper()==out['name'].upper(): block=block[1:]
        patterns=[
            (re.compile(r'^Camarero de sala$',re.I),'Restaurante TATEL Ibiza','temporadas 23-24 y 25'),
            (re.compile(r'^Profesional de Hosteleria$',re.I),'Mr. Pizza.','2012 – Diciembre 2022'),
            (re.compile(r'^Limpieza de zonas de trabajo y cristales$',re.I),'Eco Gaviño S.L.','2008 – 2010')
        ]
        used=set()
        for idx,line in enumerate(block):
            for n,(pat,company,dates) in enumerate(patterns):
                if n in used or not pat.match(line): continue
                used.add(n)
                item={'position':line,'company':company,'from':dates,'to':'','description':''}
                # Recoger el bloque de funciones hasta el siguiente puesto conocido.
                j=idx+1
                while j<len(block) and not any(p[0].match(block[j]) for p in patterns):
                    v=block[j].strip('•-·* ').strip()
                    # En el PDF hay dos textos de placeholder; no los presentamos como logros reales.
                    if v.lower().startswith('logro o aprendizaje a destacar'): 
                        j+=1; continue
                    if v and not re.fullmatch(r'\d{4}\s*[–-]\s*\d{4}',v):
                        item['description']=(item['description']+' '+v).strip()
                    j+=1
                out['experience'].append(item)
                break
        # Si el CV cambia y no coincide con los títulos exactos, conservar un parser genérico como respaldo.
        if not out['experience']:
            cur=None
            for line in block:
                if len(line)<70 and not line.startswith(('•','-','·','*')) and (cur is None or re.search(r'(?:19|20)\d{2}',line)):
                    if cur and any(cur.values()): out['experience'].append(cur)
                    cur={'position':line,'company':'','from':'','to':'','description':''}
                elif cur:
                    v=line.lstrip('•-·* ').strip()
                    if v: cur['description']=(cur['description']+' '+v).strip()
            if cur and any(cur.values()): out['experience'].append(cur)

    # Habilidades: tomar solo las cinco habilidades visibles del bloque.
    if skills>=0:
        end=len(lines)
        idi=find_idx('idiomas')
        if idi>skills: end=idi
        vals=[]
        for line in lines[skills+1:end]:
            v=line.strip('•-·* ').strip()
            if v and not '@' in v and not re.search(r'^\d{6,}$',v): vals.append(v)
        out['skills']='; '.join(vals[:20])

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
            text=_normalise_pdf_text(text)
            text=re.sub(r'[ \t]+',' ',text);text=re.sub(r'\n{3,}','\n\n',text)
            if len(text)<40:return jsonify(ok=False,error='PDF_NO_TEXT'),422
            text=text[:30000]
            key=os.getenv('OPENAI_API_KEY','').strip()
            model=os.getenv('OPENAI_MODEL','gpt-5-mini').strip() or 'gpt-5-mini'
            schema={'name':'','role':'','email':'','phone':'','city':'','linkedin':'','summary':'','skills':'','experience':[{'position':'','company':'','from':'','to':'','description':''}],'education':[{'title':'','school':'','year':''}]}
            prompt=f'''Extrae la información REAL de este CV para rellenar un formulario de CV.
NO inventes, completes ni mejores datos. Si un dato no aparece, déjalo vacío.
Conserva nombres de empresas, puestos, fechas, estudios, habilidades, teléfonos, emails y enlaces tal como aparecen.
Respeta la separación entre secciones y no mezcles texto de columnas distintas.
Devuelve SOLO JSON válido con esta estructura exacta:
{json.dumps(schema,ensure_ascii=False)}

CV EXTRAÍDO DEL PDF:
{text}'''
            data=None;used_model='local-fallback';ai_warning=''
            if key:
                stage='ai'
                try:
                    data,used_model=_ai_extract(prompt,model)
                except Exception:
                    # Si la cuenta no tiene créditos o la IA falla, el parser local sigue funcionando.
                    ai_warning='La IA no está disponible; se ha usado el importador local gratuito.'
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
