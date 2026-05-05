import ollama
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEndpoint
import requests

def summary_model():
    return ChatGroq(model_name="llama-3.1-8b-instant")

NGROK_URL = "https://01d0-103-234-240-3.ngrok-free.app"

def medgemma_get_text_response(messages, max_new_tokens=512):
    ollama_msgs = []

    for m in messages:
        role = (
            "system" if m.type == "system"
            else "user" if m.type in ("human", "user")
            else "assistant"
        )
        ollama_msgs.append({
            "role": role,
            "content": m.content
        })

    payload = {
        "model": "alibayram/medgemma:27b",
        "messages": ollama_msgs,
        "options": {
            "num_predict": max_new_tokens
        },
        "stream" : False
    }

    response = requests.post(
        f"{NGROK_URL}/api/chat",
        json=payload
    )

    response.raise_for_status()

    return response.json()["message"]["content"].strip()