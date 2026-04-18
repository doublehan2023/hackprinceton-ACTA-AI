from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

from services.llm import answer_contract_question

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    context: str
    gemini_key: Optional[str] = None  # optional override from frontend


@router.post("/chat")
def chat_with_contract(req: ChatRequest):
    if not req.question or not req.context:
        raise HTTPException(status_code=400, detail="Both question and context are required")

    # BUG FIX: Was receiving empty key from frontend — now falls back to env var
    api_key = req.gemini_key or os.getenv("GEMINI_API_KEY", "")

    if not api_key:
        return {
            "answer": "⚠️ Gemini API key not configured. Set GEMINI_API_KEY in your .env file.",
            "status": "error"
        }

    try:
        response = answer_contract_question(api_key, req.question, req.context)
        return {"answer": response, "status": "success"}
    except Exception as e:
        return {"answer": f"❌ Error: {str(e)}", "status": "error"}
