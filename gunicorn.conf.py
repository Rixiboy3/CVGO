def post_worker_init(worker):
    try:
        import interview_api
        worker.log.info('CVGO interview module loaded')
    except Exception:
        worker.log.exception('CVGO interview module failed to load')
        raise
