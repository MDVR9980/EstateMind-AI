import os
import sys
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Agency, User, UserRole
from app.core.security import get_password_hash, get_current_user_api

router = APIRouter(prefix="/api/super-admin", tags=["Super Admin"])

class AgencyCreateRequest(BaseModel):
    agency_name: str
    owner_name: str
    phone: str
    city: str = "مشهد"
    max_agents: int = 5
    months: int = 1
    admin_username: str
    admin_password: str

class AgencyEditRequest(BaseModel):
    name: str
    owner_name: str
    phone: str
    city: str
    max_agents_allowed: int

class ExtendLicenseRequest(BaseModel):
    add_months: int = 12
    add_seats: int = 0

@router.get("/agencies")
def get_all_agencies(request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user or user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="فقط سوپر ادمین دسترسی دارد.")
        
    agencies = session.exec(select(Agency).order_by(Agency.id.desc())).all()
    
    result = []
    for a in agencies:
        # 🌟 دریافت لیست اعضا و پرسنل این آژانس
        agency_users = session.exec(select(User).where(User.agency_id == a.id)).all()
        
        users_list = []
        for u in agency_users:
            role_fa = "مدیر آژانس" if u.role in ["MANAGER", UserRole.MANAGER] else "مشاور املاک"
            users_list.append({
                "id": u.id,
                "full_name": u.full_name,
                "username": u.username,
                "role_fa": role_fa,
                "is_active": u.is_active
            })
            
        expires_dt = getattr(a, 'subscription_expires_at', None)
        is_expired = expires_dt < datetime.utcnow() if expires_dt else False

        result.append({
            "id": a.id,
            "name": a.name,
            "owner_name": a.owner_name,
            "phone": a.phone,
            "city": a.city,
            "max_agents_allowed": getattr(a, 'max_agents_allowed', 5),
            "used_seats": len([u for u in agency_users if u.is_active]),
            "subscription_active": a.subscription_active,
            "subscription_expires_at": expires_dt.strftime("%Y-%m-%d") if expires_dt else "2027-07-23",
            "is_expired": is_expired,
            "users": users_list # 🌟 ارسال لیست صندلی‌های اشغال شده
        })
    return {"status": "success", "agencies": result}

@router.put("/agencies/{agency_id}/edit")
def edit_agency_details(agency_id: int, data: AgencyEditRequest, request: Request, session: Session = Depends(get_session)):
    """API ویرایش اطلاعات آژانس"""
    user = get_current_user_api(request, session)
    if not user or user.role != UserRole.SUPER_ADMIN: raise HTTPException(status_code=403)
    
    agency = session.get(Agency, agency_id)
    if not agency: raise HTTPException(status_code=404, detail="آژانس یافت نشد")

    agency.name = data.name
    agency.owner_name = data.owner_name
    agency.phone = data.phone
    agency.city = data.city
    agency.max_agents_allowed = data.max_agents_allowed
    
    session.commit()
    return {"status": "success", "message": "اطلاعات آژانس ویرایش شد."}

@router.post("/agencies/add")
def add_agency(data: AgencyCreateRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user or user.role != UserRole.SUPER_ADMIN: raise HTTPException(status_code=403)

    if session.exec(select(User).where(User.username == data.admin_username)).first():
        raise HTTPException(status_code=400, detail=f"نام کاربری '{data.admin_username}' قبلاً ثبت شده است.")

    if session.exec(select(Agency).where(Agency.phone == data.phone)).first():
        raise HTTPException(status_code=400, detail=f"شماره تلفن '{data.phone}' قبلاً وجود دارد.")

    try:
        expires_at = datetime.utcnow() + timedelta(days=data.months * 30)

        # 🌟 سقف کل صندلی‌های لایسنس = تعداد مشاوران + ۱ مدیر آژانس
        total_seats_allowed = data.max_agents + 1

        new_agency = Agency(
            name=data.agency_name,
            owner_name=data.owner_name,
            phone=data.phone,
            city=data.city,
            max_agents_allowed=total_seats_allowed, # ذخیره سقف کل (مثلاً ۶)
            subscription_expires_at=expires_at,
            subscription_active=True
        )
        session.add(new_agency)
        session.commit()
        session.refresh(new_agency)

        agency_admin = User(
            agency_id=new_agency.id,
            full_name=data.owner_name,
            username=data.admin_username,
            hashed_password=get_password_hash(data.admin_password),
            role=UserRole.MANAGER
        )
        session.add(agency_admin)
        session.commit()

        return {"status": "success", "message": f"آژانس '{new_agency.name}' با سقف {total_seats_allowed} صندلی (۱ مدیر + {data.max_agents} مشاور) راه‌اندازی شد."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"خطا در دیتابیس: {str(e)}")
        
@router.put("/agencies/{agency_id}/extend")
def extend_agency_license(agency_id: int, data: ExtendLicenseRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user or user.role != UserRole.SUPER_ADMIN: raise HTTPException(status_code=403)
        
    agency = session.get(Agency, agency_id)
    if not agency: raise HTTPException(status_code=404)

    if data.add_months > 0:
        base_date = max(getattr(agency, 'subscription_expires_at', datetime.utcnow()) or datetime.utcnow(), datetime.utcnow())
        agency.subscription_expires_at = base_date + timedelta(days=data.add_months * 30)
        agency.subscription_active = True

    if data.add_seats > 0:
        agency.max_agents_allowed = getattr(agency, 'max_agents_allowed', 5) + data.add_seats

    session.commit()
    return {"status": "success", "message": "لایسنس با موفقیت تمدید شد."}

@router.put("/agencies/{agency_id}/toggle")
def toggle_agency_status(agency_id: int, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user or user.role != UserRole.SUPER_ADMIN: raise HTTPException(status_code=403)
    
    agency = session.get(Agency, agency_id)
    if not agency: raise HTTPException(status_code=404)

    agency.subscription_active = not agency.subscription_active
    session.commit()
    return {"status": "success", "is_active": agency.subscription_active}