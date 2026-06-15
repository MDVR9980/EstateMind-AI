from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import (
    Property, PropertyType, DealType,
    Requirement, Client, AgentNotification
) 
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

from app.core.models import Requirement, Client, AgentNotification

@router.post("/n8n-receive")
def receive_from_n8n(data: N8nPayload, session: Session = Depends(get_session)):
    """دریافت دیتا از n8n + مچینگ خودکار با تقاضای مشتریان"""
    try:
        existing = session.exec(select(Property).where(Property.divar_token == data.token)).first()
        if existing: return {"status": "skipped"}
            
        new_prop = Property(
            agency_id=data.agency_id, divar_token=data.token, title=data.title,
            neighborhood=data.neighborhood, property_type=PropertyType.APARTMENT, 
            deal_type=DealType.SALE, price_total=data.price, owner_name=data.publisher,
            owner_phone=data.contact_phone, description=data.raw_text, is_exclusive=False
        )
        session.add(new_prop)
        session.commit()
        session.refresh(new_prop)

        # 🌟 سیستم ردیابی و پیگیری هوشمند مشتری 🌟
        requirements = session.exec(select(Requirement).where(Requirement.agency_id == new_prop.agency_id)).all()
        for req in requirements:
            # اگر محله و قیمت مچ شد
            if req.preferred_neighborhoods in new_prop.neighborhood and new_prop.price_total <= req.max_budget:
                client = session.get(Client, req.client_id)
                alert_msg = f"🔔 همخوانی هوشمند: فایل '{new_prop.title}' با بودجه مشتری شما '{client.name}' تطابق دارد."
                new_notif = AgentNotification(user_id=req.created_by_user_id, message=alert_msg)
                session.add(new_notif)
        session.commit()

        send_telegram_alert(new_prop.title, new_prop.neighborhood, new_prop.price_total, new_prop.owner_phone, "اتوماسیون n8n")
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Error in n8n Webhook: {e}")
        raise HTTPException(status_code=500, detail="خطا در ثبت دیتای n8n")