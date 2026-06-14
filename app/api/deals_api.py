# مسیر فایل: app/api/deals_api.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Deal, Client, Property, FunnelStage

router = APIRouter(prefix="/api/deals", tags=["Deals"])

class DealCreateRequest(BaseModel):
    client_id: int
    property_id: int
    deal_type: str
    deal_price: float
    commission_amount: float

@router.post("/add")
def add_deal(data: DealCreateRequest, session: Session = Depends(get_session)):
    """API ثبت قرارداد جدید و محاسبه کمیسیون در سیستم"""
    try:
        # ۱. ساخت رکورد قرارداد
        new_deal = Deal(
            agency_id=1, # فعلاً آژانس تستی
            user_id=1,   # فعلاً مشاور تستی
            client_id=data.client_id,
            property_id=data.property_id,
            deal_type=data.deal_type,
            deal_price=data.deal_price,
            commission_amount=data.commission_amount
        )
        session.add(new_deal)

        # ۲. آپدیت هوشمندانه وضعیت مشتری در قیف فروش (انتقال به 'قرارداد موفق')
        client = session.get(Client, data.client_id)
        if client:
            client.funnel_stage = FunnelStage.WON
            session.add(client)

        # ۳. تغییر وضعیت فایل ملک به 'فروخته/اجاره شده' (آرشیو)
        property_obj = session.get(Property, data.property_id)
        if property_obj:
            property_obj.status = "archived"
            session.add(property_obj)

        session.commit()
        return {"status": "success", "message": "قرارداد ثبت شد و کمیسیون به داشبورد مالی اضافه گردید."}
        
    except Exception as e:
        print(f"❌ Error in Deal API: {e}")
        raise HTTPException(status_code=500, detail="خطا در ذخیره اطلاعات قرارداد")