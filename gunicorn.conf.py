def post_worker_init(worker):
    # Register CVGO's AI interview routes only after Flask has loaded app:app.
    # This keeps the existing database and main app initialization untouched.
    try:
        import interview_api  # noqa: F401
        worker.log.info('CVGO interview module loaded')
    except Exception:
        worker.log.exception('CVGO interview module failed to load')
        raise
