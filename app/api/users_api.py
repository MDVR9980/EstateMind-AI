from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import User, UserRole
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserCreateRequest(BaseModel):
    full_name: str
    username: str
    password: str
    role: str
    target_neighborhoods: str = ""

@router.post("/add")
def add_user(data: UserCreateRequest, session: Session = Depends(get_session)):
    """API استخدام و ثبت مشاور / مدیر رنج جدید"""
    try:
        # بررسی تکراری نبودن نام کاربری
        if session.exec(select(User).where(User.username == data.username)).first():
            raise HTTPException(status_code=400, detail="این نام کاربری (موبایل) قبلاً در سیستم ثبت شده است.")
        
        # مپ کردن نقش کاربر
        role_enum = UserRole.AGENT
        if data.role == "manager": 
            role_enum = UserRole.MANAGER
            
        new_user = User(
            agency_id=1, # آژانس فعلی
            full_name=data.full_name,
            username=data.username,
            hashed_password=get_password_hash(data.password),
            role=role_enum,
            target_neighborhoods=data.target_neighborhoods
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