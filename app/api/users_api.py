from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import User, UserRole
from app.core.security import get_password_hash, SECRET_KEY, ALGORITHM, verify_password
import jwt

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

def get_current_user_api(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token: return None
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        return session.exec(select(User).where(User.username == payload.get("sub"))).first()
    except: return None

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