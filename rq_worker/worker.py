# rq_worker/worker.py

import os
from rq import Queue, Worker 
from redis import Redis
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


redis_url = os.getenv("REDIS_URL")
if not redis_url:
    raise ValueError("DB NOT DEFINED")
redis_conn = Redis.from_url(redis_url)

# listen = ["report-generation"]
queues = [Queue("report-generation", connection=redis_conn)]
if __name__ == "__main__":
    logger.info("Starting RQ worker...")
     
        
    worker = Worker(queues, connection=redis_conn)
    worker.work()