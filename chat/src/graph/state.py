<<<<<<< HEAD

=======
>>>>>>> 561e94f (MVP version 1)
from typing import Annotated, List, TypedDict, Literal, Dict
from uuid import UUID
from pydantic import BaseModel
from langgraph.graph.message import add_messages, BaseMessage

class InterviewState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    question_count: int
    done : bool

class PatientChatRequest(BaseModel):
    messages : str
    thread_id : UUID 
<<<<<<< HEAD
    doctor_id : UUID
=======
    doctor_id : UUID | None = None 
    booking_id : UUID | None = None
>>>>>>> 561e94f (MVP version 1)
    status : Literal["chatting","done"] = "chatting"


class InterviewReport(BaseModel):
    chat : List[Dict[str,str]]
    doctor_report_md : str | None=None
    patient_report_md : str | None = None
    # summary : str