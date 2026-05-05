# ### Connection check with the redis upslash 

# from dotenv import load_dotenv
# from redis import Redis
# import os

# load_dotenv()
# redis_url = os.getenv("REDIS_URL")

# if not redis_url:
#     raise ValueError("NOT DEFINED")

# r = Redis.from_url(redis_url)
# print(r.ping())