import time 
from chat.src.graph.state import InterviewState, InterviewReport
from chat.src.utils.llm import medgemma_get_text_response
from chat.src.utils.chains import get_Summary_Model
from core.prompts import (INTERVIEW_PROMPT, 
                          PATIENT_DEFAULT_REPORT_TEMPLATE, 
                          DOCTOR_DEFAULT_REPORT_TEMPLATE,
                          CLOSING_LINE, MAX_QUESTIONS, 
                          REPORT_WRITE_INSTRUCTION_FOR_PATIENT,
                          REPORT_WRITE_INSTRUCTION_FOR_DOCTOR)

from chat.src.utils.transcripts import build_interview_transcript
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage

import re
import time
import asyncio

chat = None

async def ask_question(state: InterviewState):
    new_count = state.get('question_count',0)
    """LLM asks exactly one question, respecting your instructions and EHR context."""
    global chat
    start = time.time()
    system = SystemMessage(content=INTERVIEW_PROMPT)
    chat = [system] + state["messages"]
    llm_out = medgemma_get_text_response(chat,max_new_tokens=180)
    
    end = time.time()
    q = llm_out.split("\n")[0].strip()
    # Best-effort word limit trim without breaking meaning:
    if len(q.split()) > 20 and "?" in q:
        q = q[: q.index("?") + 1]
    print(f"Time taken {end - start}")
    new_messages = state["messages"] + [AIMessage(content=q)]
    new_count += 1
    print(new_count)
    done = new_count >= MAX_QUESTIONS
    if done:
        new_messages += [AIMessage(content=CLOSING_LINE)]


    return {
        **state,
        "messages": new_messages,
        "question_count": new_count,
        "done": done,
    }


async def patient_update_report(state: InterviewReport):
    """Refresh the Markdown report from the latest transcript."""
    # transcript = build_interview_transcript(state.chat)
    sys = SystemMessage(content=REPORT_WRITE_INSTRUCTION_FOR_PATIENT)
    user = HumanMessage(content=f"""<interview_start>
                        {state.chat}
                        <interview_end>

                        <previous_report>
                        {state.patient_report_md or PATIENT_DEFAULT_REPORT_TEMPLATE}
                        </previous_report>

                        <task_instructions>
                        Update the report in <previous_report> using new info from <interview_start>.
                        - Integrate new details; replace outdated ones
                        - Keep it concise; preserve critical history (e.g., hypertension)s
                        - Do not change section titles
                        </task_instructions>
                        """)
    
    raw = await asyncio.to_thread(medgemma_get_text_response,[sys, user], max_new_tokens=256)

    cleaned = re.sub(r"<unused94>.*?</unused95>", "", raw, flags=re.DOTALL).strip()
    m = re.match(r"^\s*```(?:markdown)?\s*(.*?)\s*```\s*$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if m:
        cleaned = m.group(1).strip()

    return state.model_copy(update={"patient_report_md":cleaned or state.patient_report_md})


async def doctor_update_report(state: InterviewReport):
    """Refresh the Markdown report from the latest transcript."""
    # transcript = build_interview_transcript(state.chat)
    sys = SystemMessage(content=REPORT_WRITE_INSTRUCTION_FOR_DOCTOR)
    user = HumanMessage(content=f"""<interview_start>
                        {state.chat}
                        <interview_end>

                        <previous_report>
                        {state.doctor_report_md or DOCTOR_DEFAULT_REPORT_TEMPLATE}
                        </previous_report>

                        <task_instructions>
                        Update the report in <previous_report> using new info from <interview_start>.
                        - Integrate new details; replace outdated ones
                        - Keep it concise; preserve critical history (e.g., hypertension)
                        - Do not change section titles
                        - Preserve structure and headings (CC, HPI, ROS, PMH, Clinical Impression, Recommendations).
                        </task_instructions>
                        """)
    
    raw = await asyncio.to_thread(medgemma_get_text_response,[sys, user],max_new_tokens=768)

    cleaned = re.sub(r"<unused94>.*?</unused95>", "", raw, flags=re.DOTALL).strip()
    m = re.match(r"^\s*```(?:markdown)?\s*(.*?)\s*```\s*$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if m:
        cleaned = m.group(1).strip()

    return state.model_copy(update={"doctor_report_md":cleaned or state.doctor_report_md})



async def update_report(state: InterviewReport):
    """Refresh both patient and doctor reports simultaneously."""
    print(state)
    start = time.time()
    patient_task = patient_update_report(state)
    doctor_task = doctor_update_report(state)
    patient_state,doctor_state = await asyncio.gather(patient_task,doctor_task)
    end = time.time()
    print(f"It took {end - start}s for generarting both report")
    return state.model_copy(update={
    "patient_report_md": patient_state.patient_report_md,
    "doctor_report_md": doctor_state.doctor_report_md
})



async def summarize_chat(state: InterviewReport):
    chain = get_Summary_Model()
    text = "\n".join(m.content for m in state["messages"])
    summary = await asyncio.to_thread(chain.invoke, text)
    return {"summary": summary}
