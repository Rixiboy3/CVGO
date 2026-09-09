def post_worker_init(worker):
    try:
        import interview_api
        import legal_api
        import app as app_module
        legal_api.register_legal(app_module.app)
        worker.log.info('CVGO modules loaded')
    except Exception:
        worker.log.exception('CVGO startup modules failed')
        raise
