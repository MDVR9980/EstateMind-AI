# مسیر فایل: app/api/clients_api.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from app.core.database import get_session
from app.core.models import Client, DealType, FunnelStage

router = APIRouter(prefix="/api/clients", tags=["Clients"])

class ClientCreateRequest(BaseModel):
    name: str
    phone: str
    deal_type_requested: str
    budget_limit: float

@router.post("/add")
def add_client(data: ClientCreateRequest, session: Session = Depends(get_session)):
    """API برای ثبت مشتری جدید در دفترچه و قیف فروش"""
    try:
        # تبدیل نوع معامله به ثابت‌های سیستم
        d_type = DealType.SALE
        if data.deal_type_requested == "rent": d_type = DealType.RENT
        elif data.deal_type_requested == "partnership": d_type = DealType.PARTNERSHIP

        # ساخت رکورد جدید مشتری
        new_client = Client(
            agency_id=1, # فعلاً آژانس ۱ برای تست
            user_id=1,   # فعلاً مشاور ۱ برای تست
            name=data.name,
            phone=data.phone,
            deal_type_requested=d_type,
            budget_limit=data.budget_limit,
            funnel_stage=FunnelStage.LEAD # مشتری جدید همیشه وارد مرحله لید می‌شود
        )
        
        session.add(new_client)
        session.commit()
        
        return {"status": "success", "message": "مشتری جدید با موفقیت به قیف فروش اضافه شد!"}
    
    except Exception as e:
        print(f"❌ Error adding client: {e}")
        raise HTTPException(status_code=500, detail="خطا در ذخیره اطلاعات مشتری در دیتابیس")

# این کدها را به انتهای فایل app/api/clients_api.py اضافه کنید:

class StageUpdateRequest(BaseModel):
    client_id: int
    new_stage: str

@router.put("/update-stage")
def update_client_stage(data: StageUpdateRequest, session: Session = Depends(get_session)):
    """API برای ذخیره موقعیت جدید کارت مشتری در قیف فروش با کشیدن و رها کردن"""
    try:
        # پیدا کردن مشتری در دیتابیس
        client = session.get(Client, data.client_id)
        if not client:
            raise HTTPException(status_code=404, detail="مشتری یافت نشد!")
            
        # آپدیت مرحله
        client.funnel_stage = data.new_stage
        session.commit()
        
        return {"status": "success", "message": "وضعیت مشتری در دیتابیس آپدیت شد"}
    except Exception as e:
        print(f"❌ Error updating funnel stage: {e}")
        raise HTTPException(status_code=500, detail="خطا در تغییر وضعیت مشتری")