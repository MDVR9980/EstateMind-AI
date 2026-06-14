from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Property, Client
from app.services.ai_engine import nvidia_client

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str

@router.post("/")
def chat_with_crm(data: ChatRequest, session: Session = Depends(get_session)):
    """دریافت پیام کاربر، خواندن دیتابیس و پاسخ دادن توسط هوش مصنوعی"""
    try:
        # ۱. استخراج داده‌های زنده از دیتابیس (تزریق به عنوان کانتکست)
        properties = session.exec(select(Property).where(Property.status == "active")).all()
        
        # ساخت یک متن خلاصه از املاک موجود برای هوش مصنوعی
        db_context = "لیست فایل‌های موجود در آژانس:\n"
        for p in properties:
            price = f"{p.price_total:,.0f} تومان" if p.price_total > 0 else "توافقی"
            db_context += f"- کد {p.id}: {p.title} در محله {p.neighborhood}، متراژ {p.built_area}، قیمت: {price}. مالک: {p.owner_name or 'نامشخص'} ({p.owner_phone or 'نامشخص'})\n"

        # ۲. ساخت پرامپت اختصاصی
        prompt = f"""
تو یک دستیار هوشمند و مودب آژانس املاک به نام "EstateMind" هستی.
بر اساس لیست فایل‌های زیر که در دیتابیس موجود است، به سوال مشاور پاسخ کوتاه، دقیق و مفید بده.
اگر ملکی با مشخصات خواسته شده پیدا نکردی، بگو "متاسفانه فعلاً فایلی با این مشخصات نداریم".

{db_context}

سوال کاربر: {data.message}
"""

        # ۳. ارسال به موتور NVIDIA Mistral
        if nvidia_client:
            response = nvidia_client.chat.completions.create(
                model="mistralai/mistral-large-3-675b-instruct-2512",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2, 
                max_tokens=500
            )
            ai_reply = response.choices[0].message.content.strip()
        else:
            # اگر کلید API انویدیا نداشتید، برای تست سیستم کرش نکند
            ai_reply = "هوش مصنوعی: (حالت تستی) متوجه شدم! در دیتابیس گشتم اما چون متصل به سرور انویدیا نیستم این یک جواب شبیه‌سازی شده است."

        return {"status": "success", "reply": ai_reply}

    except Exception as e:
        print(f"❌ Error in Chatbot API: {e}")
        raise HTTPException(status_code=500, detail="خطا در پردازش درخواست توسط هوش مصنوعی")