# --- START OF FILE chatbot_api.py ---
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
import requests
from app.core.database import get_session
from app.core.models import Property
import jwt
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.models import User

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str

def get_current_user_local(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token: return None
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        return session.exec(select(User).where(User.username == payload.get("sub"))).first()
    except: return None

@router.post("/")
def chat_with_crm(data: ChatRequest, request: Request, session: Session = Depends(get_session)):
    try:
        user = get_current_user_local(request, session)
        current_user_id = user.username if user else "guest_user"

        properties = session.exec(select(Property).where(Property.status == "active")).all()
        
        db_context = "لیست فایل‌های موجود در آژانس:\n"
        for p in properties:
            price = f"{p.price_total:,.0f} تومان" if p.price_total > 0 else "توافقی"
            db_context += f"- کد {p.id}: {p.title} در محله {p.neighborhood}، متراژ {p.built_area}، قیمت: {price}. مالک: {p.owner_name or 'نامشخص'}\n"

        prompt = f"""
            اطلاعات دیتابیس فعلی:
            {db_context}

            سوال اصلی کاربر: {data.message}
        """

        N8N_WEBHOOK_URL = "http://127.0.0.1:5678/webhook-test/crm-chat"

        payload = {
            "user_id": current_user_id,
            "chatInput": prompt
        }

        response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            n8n_data = response.json()
            # پیدا کردن جواب در خروجی n8n
            ai_reply = n8n_data.get("output") or n8n_data.get("text") or n8n_data.get("response")
            if not ai_reply:
                ai_reply = f"اطلاعات خام دریافتی از n8n: {n8n_data}"
            return {"status": "success", "reply": ai_reply}
        else:
            return {"status": "error", "reply": "خطای n8n: لطفا دکمه Execute Workflow را در n8n بزنید."}

    except Exception as e:
        print(f"❌ Connection Error: {e}")
        raise HTTPException(status_code=500, detail="ارتباط با سرور n8n برقرار نشد.")