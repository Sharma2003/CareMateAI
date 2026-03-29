# rq_worker/worker.py

import os
from rq import Queue, SimpleWorker
from redis import Redis

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

redis_conn = Redis.from_url(redis_url)

listen = ["report-generation"]

if __name__ == "__main__":

    queues = [Queue(name, connection=redis_conn) for name in listen]
    worker = SimpleWorker(queues, connection=redis_conn)
    worker.work()