import ollama
from langchain_groq import ChatGroq

def summary_model():
    return ChatGroq(model_name="llama-3.1-8b-instant")


<<<<<<< HEAD
def medgemma_get_text_response(messages, max_new_tokens=180):
=======
def medgemma_get_text_response(messages, max_new_tokens=512):
>>>>>>> 561e94f (MVP version 1)
    ollama_msgs = []
    for m in messages:
        role = (
            "system" if m.type == "system"
            else "user" if m.type in ("human", "user")
            else "assistant"
        )
        ollama_msgs.append({"role": role, "content": m.content})

    response = ollama.chat(
<<<<<<< HEAD
        model="MedAIBase/MedGemma1.5:4b",
=======
        model="alibayram/medgemma:27b",
>>>>>>> 561e94f (MVP version 1)
        messages=ollama_msgs,
        options={"num_predict": max_new_tokens}
    )

    return response["message"]["content"].strip()
