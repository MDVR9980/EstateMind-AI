from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import User, UserRole, Property, Client
from app.core.security import (
    get_password_hash, SECRET_KEY, 
    ALGORITHM, verify_password, 
    get_current_user_api,
)
import jwt
import os
import shutil
import time

os.makedirs("uploads/avatars", exist_ok=True)

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserCreateRequest(BaseModel):
    full_name: str
    username: str
    password: str
    role: str
    target_neighborhoods: str = ""
    commission_sale: float = 0.5
    commission_rent: float = 0.5
    commission_partnership: float = 0.5

@router.post("/upload-avatar")
async def upload_user_avatar(request: Request, file: UploadFile = File(...), session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(401)
    
    # ساخت اسم یکتا برای فایل
    ext = file.filename.split(".")[-1].lower()
    file_name = f"avatar_{user.id}_{int(time.time())}.{ext}"
    file_path = f"uploads/avatars/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    user.avatar_url = f"/{file_path}"
    session.commit()
    
    return {"status": "success", "avatar_url": user.avatar_url}
    
@router.post("/add")
def add_user(data: UserCreateRequest, session: Session = Depends(get_session)):
    """API استخدام و ثبت مشاور / مدیر رنج جدید"""
    try:
        if session.exec(select(User).where(User.username == data.username)).first():
            raise HTTPException(status_code=400, detail="این نام کاربری (موبایل) قبلاً در سیستم ثبت شده است.")
        
        role_enum = UserRole.AGENT
        if data.role == "manager": 
            role_enum = UserRole.MANAGER
            
        new_user = User(
            agency_id=1, # آژانس فعلی
            full_name=data.full_name,
            username=data.username,
            hashed_password=get_password_hash(data.password),
            role=role_enum,
            target_neighborhoods=data.target_neighborhoods,
            commission_sale=data.commission_sale,
            commission_rent=data.commission_rent,
            commission_partnership=data.commission_partnership
        )
        
        session.add(new_user)
        session.commit()
        return {"status": "success", "message": "پرسنل جدید با موفقیت به تیم اضافه شد."}
        
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print(f"❌ Error adding user: {e}")
        raise HTTPException(status_code=500, detail="خطا در ثبت کاربر")

@router.delete("/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if user:
        session.delete(user)
        session.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="کاربر یافت نشد")

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.put("/change-password")
def change_password(data: ChangePasswordRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(401)
    
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(400, "رمز عبور فعلی اشتباه است.")
        
    user.hashed_password = get_password_hash(data.new_password)
    session.commit()
    return {"status": "success"}

@router.get("/dashboard-stats")
def get_dashboard_stats(request: Request, session: Session = Depends(get_session)):
    """API دریافت آمار زنده داشبورد برای اپلیکیشن موبایل"""
    user = get_current_user_api(request, session)
    if not user: 
        raise HTTPException(status_code=401)
    
    # محاسبه تعداد فایل‌های فعال این مشاور
    my_props_count = len(session.exec(
        select(Property).where(Property.created_by_id == user.id, Property.status == "active")
    ).all())
    
    # محاسبه تعداد مشتریان فعال در قیف این مشاور
    my_clients_count = len(session.exec(
        select(Client).where(Client.user_id == user.id)
    ).all())
    
    return {
        "status": "success",
        "user": {
            "full_name": user.full_name,
            "role": "مدیر شعبه" if user.role in ["MANAGER", "SUPER_ADMIN"] else "مشاور املاک",
            "avatar_letter": user.full_name[0] if user.full_name else "U"
        },
        "stats": {
            "properties": my_props_count,
            "clients": my_clients_count,
            "ai_matches": 3 # این عدد را در فازهای بعدی داینامیک می‌کنیم
        }
    }