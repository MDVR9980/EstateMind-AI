from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional
from app.core.database import get_session
from app.core.models import (
    Client, DealType, FunnelStage, 
    User, Requirement, PropertyType,
)
import jwt
from app.core.security import SECRET_KEY, ALGORITHM, get_current_user_api

router = APIRouter(prefix="/api/clients", tags=["Clients"])

class ClientCreateRequest(BaseModel):
    name: str
    phone: str
    deal_type_requested: str
    budget_limit: float

@router.post("/add")
def add_client(data: ClientCreateRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401, detail="باید لاگین باشید")
    try:
        d_type = DealType.SALE
        if data.deal_type_requested == "rent": d_type = DealType.RENT
        elif data.deal_type_requested == "partnership": d_type = DealType.PARTNERSHIP

        new_client = Client(
            agency_id=user.agency_id,
            user_id=user.id,
            name=data.name,
            phone=data.phone,
            deal_type_requested=d_type,
            budget_limit=data.budget_limit,
            funnel_stage=FunnelStage.LEAD,
            client_category="normal"
        )
        session.add(new_client)
        session.commit()
        return {"status": "success", "message": "مشتری جدید با موفقیت اضافه شد!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="خطا در ذخیره اطلاعات")

class StageUpdateRequest(BaseModel):
    client_id: int
    new_stage: str

@router.put("/update-stage")
def update_client_stage(data: StageUpdateRequest, session: Session = Depends(get_session)):
    try:
        client = session.get(Client, data.client_id)
        if not client: raise HTTPException(status_code=404, detail="مشتری یافت نشد!")
        client.funnel_stage = data.new_stage
        session.commit()
        return {"status": "success", "message": "وضعیت مشتری آپدیت شد"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="خطا در تغییر وضعیت مشتری")

class CategoryUpdateRequest(BaseModel):
    client_id: int
    category: str

class ClientFilterRequest(BaseModel):
    category: Optional[str] = None
    deal_type: Optional[str] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None

@router.put("/update-category")
def update_client_category(data: CategoryUpdateRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    
    client = session.get(Client, data.client_id)
    if not client: raise HTTPException(status_code=404)
    
    valid_categories = ["normal", "vip", "hot_lead", "cold"]
    if data.category not in valid_categories: raise HTTPException(status_code=400)
        
    client.client_category = data.category
    session.commit()
    return {"status": "success"}

class RequirementCreateRequest(BaseModel):
    client_id: int
    deal_type: str
    property_type: str
    max_budget: float
    preferred_neighborhoods: str

@router.post("/add-requirement")
def add_requirement(data: RequirementCreateRequest, request: Request, session: Session = Depends(get_session)):
    """API ثبت فرم نیاز دقیق مشتری برای ردیابی هوشمند"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    
    # مپ کردن نوع معامله و ملک
    d_type = DealType.SALE
    if data.deal_type == "rent": d_type = DealType.RENT
    elif data.deal_type == "partnership": d_type = DealType.PARTNERSHIP
        
    p_type = PropertyType.APARTMENT
    if data.property_type == "villa": p_type = PropertyType.VILLA
    elif data.property_type == "land": p_type = PropertyType.LAND
    elif data.property_type == "commercial": p_type = PropertyType.COMMERCIAL

    new_req = Requirement(
        agency_id=user.agency_id,
        client_id=data.client_id,
        created_by_user_id=user.id,
        deal_type=d_type,
        property_type=p_type,
        max_budget=data.max_budget,
        preferred_neighborhoods=data.preferred_neighborhoods
    )
    session.add(new_req)
    session.commit()
    return {"status": "success", "message": "نیاز مشتری با موفقیت ثبت شد و در رادار سیستم قرار گرفت!"}