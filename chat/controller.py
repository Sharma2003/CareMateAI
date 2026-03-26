from fastapi import APIRouter, HTTPException
from uuid import UUID, uuid4
from langgraph.checkpoint.redis.aio import AsyncRedisSaver
<<<<<<< HEAD
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os
from langchain_core.messages import AIMessage, HumanMessage


from helper.chatStore import strcuting_chat
from chat.src.utils.runtime import graph_app
=======
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv
import os

from helper.chatStore import strcuting_chat
>>>>>>> 561e94f (MVP version 1)
from chat.src.graph.state import PatientChatRequest
from chat.src.graph.graph_redis import build_app
from auth.service import CurrentUser
from rq_worker.generate_report import generate_reports_job
from rq_worker.queues import report_queue
<<<<<<< HEAD
# from rq_worker.worker import run_async

=======
>>>>>>> 561e94f (MVP version 1)

load_dotenv()
db_uri = os.getenv("REDIS_URL")

router = APIRouter(
    prefix="/chat",
<<<<<<< HEAD
    tags=["chat"]
)

graph_app = None
@router.post("/start_interview")
async def start_interview(current_user: CurrentUser):
    # ensure_patient_role(db=Session,current_user=current_id.get_uuid())
    global graph_app
    config = {
        "configurable":{"thread_id":uuid4()}
    }
    async with AsyncRedisSaver.from_conn_string(db_uri) as saver:
        await saver.asetup()

        graph_app = build_app(checkpointer=saver)

    result = await graph_app.ainvoke(
        {"messages": [HumanMessage(content="(start)")]},
        config=config
=======
    tags=["chat"],
)


async def _get_graph_app():
    """Build a fresh graph app instance with Redis checkpointer."""
    async with AsyncRedisSaver.from_conn_string(db_uri) as saver:
        await saver.asetup()
        return build_app(checkpointer=saver)


@router.post("/start_interview")
async def start_interview(current_user: CurrentUser):
    config = {
        "configurable": {"thread_id": str(uuid4())}
    }

    graph_app = await _get_graph_app()

    result = await graph_app.ainvoke(
        {"messages": [HumanMessage(content="(start)")]},
        config=config,
>>>>>>> 561e94f (MVP version 1)
    )

    return {
        "assistant_reply": result["messages"][-1].content,
<<<<<<< HEAD
        "thread_id": config["configurable"]["thread_id"]
    }

@router.post("/next_message")
async def next_message(req: PatientChatRequest,current_user:CurrentUser):
    result = await graph_app.ainvoke(
        {"messages": [req.messages]},
        config={"configurable": {"thread_id": req.thread_id}}
    )
    doctor_id = req.doctor_id

    if result['done']:
        chat = strcuting_chat(result['messages'])
        state = {
            "chat":chat,
            "doctor_report_md":None,
            "patient_report_md":None
=======
        "thread_id": config["configurable"]["thread_id"],
    }


@router.post("/next_message")
async def next_message(req: PatientChatRequest, current_user: CurrentUser):
    graph_app = await _get_graph_app()

    result = await graph_app.ainvoke(
        {"messages": [req.messages]},
        config={"configurable": {"thread_id": req.thread_id}},
    )
    doctor_id = req.doctor_id
    booking_id = req.booking_id

    if result.get("done"):
        chat = strcuting_chat(result["messages"])
        state = {
            "chat": chat,
            "doctor_report_md": None,
            "patient_report_md": None,
>>>>>>> 561e94f (MVP version 1)
        }

        report_queue.enqueue(
            generate_reports_job,
            str(current_user.get_uuid()),
            str(doctor_id),
            state,
<<<<<<< HEAD
        )
        

=======
            str(booking_id),
        )
>>>>>>> 561e94f (MVP version 1)

    return {
        "assistant_reply": result["messages"][-1].content,
        "thread_id": req.thread_id,
<<<<<<< HEAD
        "status" : req.status
    }

=======
        "status": req.status,
    }
>>>>>>> 561e94f (MVP version 1)
