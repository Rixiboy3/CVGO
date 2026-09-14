from flask import Response


def register_legal(app):
    if 'legal_notice' in app.view_functions:
        return

    def page(title, body):
        return Response(f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — CVProfit</title><style>body{{margin:0;min-height:100vh;display:flex;flex-direction:column;background:#f4f6fa;color:#101828;font-family:Arial,sans-serif;line-height:1.65}}header{{height:72px;background:#111827;color:#fff;display:flex;align-items:center;padding:0 6%;justify-content:space-between}}header a{{color:#fff;text-decoration:none;font-weight:900;font-size:26px}}header span{{color:#d0d5dd}}main{{max-width:900px;margin:40px auto;padding:0 22px;width:calc(100% - 44px);box-sizing:border-box}}.card{{background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:32px;box-shadow:0 8px 30px #1018280c}}h1{{margin-top:0;font-size:30px}}h2{{margin-top:28px;font-size:19px}}p,li{{font-size:14px;color:#344054}}a{{color:#175cd3}}footer{{text-align:center;padding:30px 20px;color:#667085;font-size:12px}}footer a{{margin:0 8px}}@media(max-width:600px){{header{{padding:0 18px}}header span{{display:none}}main{{margin:22px auto;width:calc(100% - 28px);padding:0 14px}}.card{{padding:22px 18px}}}}</style></head><body><header><a href="/">CVProfit</a><span>Información legal</span></header><main><div class="card">{body}</div></main><footer><a href="/legal/aviso-legal">Aviso legal</a><a href="/legal/privacidad">Privacidad</a><a href="/legal/cookies">Cookies</a><a href="/legal/condiciones">Condiciones</a><a href="/legal/reembolsos">Cancelación y reembolsos</a><br><br>© 2026 CVProfit</footer></body></html>''', mimetype='text/html')

    @app.get('/legal/aviso-legal')
    def legal_notice():
        return page('Aviso legal','<h1>Aviso legal</h1><h2>Identificación del titular</h2><p><strong>Nombre:</strong> Manuel Marco Gaviño</p><p><strong>NIF:</strong> 47347693P</p><p><strong>Domicilio:</strong> C/ Duque de Rivas 28, 41930, Bormujos (Sevilla), España</p><p><strong>Correo electrónico:</strong> smokecentral45@gmail.com</p><h2>Actividad</h2><p>CVProfit ofrece herramientas digitales para crear, editar y optimizar currículums, cartas de presentación y preparación de entrevistas.</p><h2>Responsabilidad</h2><p>La persona titular procurará mantener actualizada la información publicada y adoptar las medidas razonables para garantizar el funcionamiento y la seguridad del servicio.</p>')

    @app.get('/legal/privacidad')
    def privacy():
        return page('Política de privacidad','<h1>Política de privacidad</h1><h2>Responsable del tratamiento</h2><p><strong>Responsable:</strong> Manuel Marco Gaviño</p><p><strong>NIF:</strong> 47347693P</p><p><strong>Contacto:</strong> smokecentral45@gmail.com</p><p><strong>Domicilio:</strong> C/ Duque de Rivas 28, 41930, Bormujos (Sevilla), España</p><h2>Datos y finalidades</h2><p>CVProfit puede tratar datos de cuenta y los datos que el usuario introduzca en su currículum, experiencia, formación y candidatura para prestar el servicio, gestionar PRO, prestar las funciones de inteligencia artificial y prevenir abusos de la prueba.</p><h2>Bases y uso del tratamiento</h2><p>Los datos se tratarán según la base jurídica aplicable a cada finalidad, incluyendo la ejecución del servicio contratado, el cumplimiento de obligaciones legales y, cuando corresponda, el consentimiento de la persona usuaria.</p><h2>Proveedores</h2><p>La prestación puede implicar proveedores tecnológicos de alojamiento, pagos, correo electrónico y servicios de inteligencia artificial. CVProfit comunicará o identificará los proveedores y las condiciones aplicables cuando resulte exigible.</p><h2>Conservación</h2><p>Los datos se conservarán durante el tiempo necesario para prestar el servicio y, posteriormente, durante los plazos que puedan resultar necesarios para atender obligaciones legales o responsabilidades.</p><h2>Derechos</h2><p>La persona usuaria puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad cuando resulten aplicables, escribiendo a smokecentral45@gmail.com.</p><p>También puede presentar una reclamación ante la Agencia Española de Protección de Datos si considera que el tratamiento de sus datos no se ajusta a la normativa aplicable.</p>')

    @app.get('/legal/cookies')
    def cookies():
        return page('Política de cookies','<h1>Política de cookies</h1><h2>Cookies necesarias</h2><p>CVProfit utiliza mecanismos estrictamente necesarios para mantener la sesión y permitir el funcionamiento de la cuenta.</p><h2>Protección de la prueba</h2><p>Puede utilizarse una cookie técnica de seguridad durante un máximo de 30 días para ayudar a prevenir el uso abusivo de pruebas gratuitas.</p><h2>Analítica</h2><p>Las tecnologías analíticas no necesarias requieren el consentimiento correspondiente cuando resulte exigible.</p>')

    @app.get('/legal/condiciones')
    def terms():
        return page('Condiciones de uso y contratación','<h1>Condiciones de uso y contratación</h1><h2>Titular</h2><p>El servicio CVProfit es titularidad de Manuel Marco Gaviño, NIF 47347693P, con domicilio en C/ Duque de Rivas 28, 41930, Bormujos (Sevilla), España.</p><h2>Servicio</h2><p>CVProfit ofrece herramientas digitales para crear CV, adaptar candidaturas, generar cartas y practicar entrevistas.</p><h2>Prueba gratuita</h2><p>Las nuevas cuentas disponen de <strong>7 días de prueba gratuita</strong>, con acceso a las funciones disponibles durante el periodo de prueba. No se realiza ningún cargo durante la prueba.</p><h2>PRO</h2><p>Finalizada la prueba, las funciones restringidas requieren PRO. La suscripción se ofrece mediante planes mensuales y anuales según los precios publicados y se renueva automáticamente salvo cancelación.</p><h2>Cancelación</h2><p>El usuario puede cancelar la renovación de su suscripción. Cuando corresponda, el acceso contratado se mantiene hasta el final del periodo ya pagado.</p><h2>IA</h2><p>Las funciones de inteligencia artificial son herramientas de asistencia. El usuario debe revisar el contenido generado y es responsable de la información que decida incorporar a su candidatura.</p>')

    @app.get('/legal/reembolsos')
    def refunds():
        return page('Cancelación y reembolsos','<h1>Cancelación, desistimiento y reembolsos</h1><h2>Cancelación</h2><p>La cancelación de una renovación evita futuros cargos y, cuando corresponda, mantiene el acceso hasta el final del periodo contratado.</p><h2>Desistimiento</h2><p>El derecho de desistimiento y sus excepciones se aplicarán conforme a la normativa de consumidores vigente y a las condiciones de contratación aceptadas.</p><h2>Reembolsos</h2><p>Cuando legalmente corresponda un reembolso, se tramitará conforme a la normativa aplicable y al medio de pago utilizado.</p>')

    original_home = app.view_functions.get('home')
    if original_home:
        def home_with_footer():
            response = original_home()
            html = response.get_data(as_text=True)
            footer = '<footer id="cvprofitLegalFooter" style="width:100%;margin-top:auto;flex-shrink:0;text-align:center;padding:28px 20px 35px;color:#667085;font-size:12px;box-sizing:border-box"><span style="display:block;margin-bottom:10px;font-weight:800;color:#344054">CVProfit</span><a href="/legal/aviso-legal" style="margin:0 7px;color:#667085">Aviso legal</a><a href="/legal/privacidad" style="margin:0 7px;color:#667085">Privacidad</a><a href="/legal/cookies" style="margin:0 7px;color:#667085">Cookies</a><a href="/legal/condiciones" style="margin:0 7px;color:#667085">Condiciones</a><a href="/legal/reembolsos" style="margin:0 7px;color:#667085">Cancelación y reembolsos</a></footer>'
            html = html.replace('</body>', footer + '</body>')
            return Response(html, mimetype='text/html')
        app.view_functions['home'] = home_with_footer

import passwordreset
import commercial_ui
