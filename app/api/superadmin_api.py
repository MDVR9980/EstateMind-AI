# مسیر فایل: app/api/superadmin_api.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Agency, User, UserRole
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/super-admin", tags=["Super Admin"])

class AgencyCreateRequest(BaseModel):
    agency_name: str
    owner_name: str
    phone: str
    city: str
    admin_username: str
    admin_password: str

@router.post("/agencies/add")
def add_agency(data: AgencyCreateRequest, session: Session = Depends(get_session)):
    """ثبت یک آژانس املاک جدید به همراه مدیر آن"""
    try:
        # بررسی تکراری نبودن یوزرنیم مدیر
        if session.exec(select(User).where(User.username == data.admin_username)).first():
            raise HTTPException(status_code=400, detail="این نام کاربری از قبل وجود دارد.")
            
        # ۱. ساخت آژانس جدید
        new_agency = Agency(
            name=data.agency_name,
            owner_name=data.owner_name,
            phone=data.phone,
            city=data.city
        )
        session.add(new_agency)
        session.commit()
        session.refresh(new_agency)
        
        # ۲. ساخت اکانت مدیر برای این آژانس
        agency_admin = User(
            agency_id=new_agency.id,
            full_name=data.owner_name,
            username=data.admin_username,
            hashed_password=get_password_hash(data.admin_password),
            role=UserRole.MANAGER
        )
        session.add(agency_admin)
        session.commit()
        
        return {"status": "success", "message": "آژانس جدید با موفقیت راه‌اندازی شد!"}
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(status_code=500, detail="خطا در ثبت آژانس")

@router.put("/agencies/{agency_id}/toggle")
def toggle_agency_status(agency_id: int, session: Session = Depends(get_session)):
    """فعال/غیرفعال کردن اشتراک یک آژانس"""
    agency = session.get(Agency, agency_id)
    if not agency: raise HTTPException(status_code=404, detail="آژانس یافت نشد")
    
    agency.subscription_active = not agency.subscription_active
    session.commit()
    return {"status": "success", "is_active": agency.subscription_active}