# مسیر فایل: app/api/webhooks_api.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Property, PropertyType, DealType
import json
from app.services.notifier import send_telegram_alert

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# مدلی که دقیقاً با خروجی n8n شما مطابقت دارد
class N8nPayload(BaseModel):
    agency_id: int
    token: str
    title: str
    neighborhood: str
    price: float
    raw_text: str
    image_urls: list = []
    publisher: str = "نامشخص"
    contact_phone: str = ""
    chat_link: str = ""

@router.post("/n8n-receive")
def receive_from_n8n(data: N8nPayload, session: Session = Depends(get_session)):
    """این API دیتا را از n8n می‌گیرد و مستقیم در دیتابیس CRM می‌نشاند"""
    try:
        # ۱. جلوگیری از ثبت فایل تکراری (با چک کردن توکن دیوار)
        existing = session.exec(select(Property).where(Property.divar_token == data.token)).first()
        if existing:
            return {"status": "skipped", "message": "این فایل قبلا ثبت شده است."}
            
        # ۲. تبدیل دیتا و ذخیره در دیتابیس
        new_prop = Property(
            agency_id=data.agency_id,
            divar_token=data.token,
            title=data.title,
            neighborhood=data.neighborhood,
            property_type=PropertyType.APARTMENT, # پیش‌فرض
            deal_type=DealType.SALE, # پیش‌فرض
            price_total=data.price,
            owner_name=data.publisher,
            owner_phone=data.contact_phone,
            description=data.raw_text,
            is_exclusive=False
        )
        session.add(new_prop)
        session.commit()


        send_telegram_alert(new_prop.title, new_prop.neighborhood, new_prop.price_total, new_prop.owner_phone, "اتوماسیون n8n")
        
        print(f"🎉 [n8n Webhook] فایل جدید از n8n با موفقیت ذخیره شد: {new_prop.title}")

        return {"status": "success", "message": "فایل n8n با موفقیت در CRM ذخیره شد!"}
        
    except Exception as e:
        print(f"❌ Error in n8n Webhook: {e}")
        raise HTTPException(status_code=500, detail="خطا در ثبت دیتای n8n")