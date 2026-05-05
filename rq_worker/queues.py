from rq import Queue, Retry
from dotenv import load_dotenv
from redis import Redis
import os

load_dotenv()
redis_url = os.getenv("REDIS_URL")
if not redis_url:
    raise ValueError("DB NOT DEFINED")

redis_conn = Redis.from_url(redis_url)

report_queue = Queue(
    name="report-generation",
    connection=redis_conn,
    default_timeout=600,    #10 mins
)
