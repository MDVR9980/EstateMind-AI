# مسیر فایل: app/api/auth_api.py

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import User, UserRole, Agency
from app.core.security import verify_password, create_access_token, get_password_hash
from app.services.sms_sender import send_otp_sms, verify_otp_code

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class SendOtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    code: str

@router.post("/login")
def login(request_data: LoginRequest, response: Response, session: Session = Depends(get_session)):
    """API بررسی اطلاعات ورود و صدور کوکی امنیتی"""
    
    # --- ساخت کاربر ادمین پیش‌فرض اگر سیستم کاملا خالی است ---
    user_count = session.exec(select(User)).all()
    if not user_count:
        # ابتدا یک آژانس پیش‌فرض می‌سازیم
        default_agency = Agency(name="آژانس مرکزی", owner_name="مدیر سیستم", phone="0210000000")
        session.add(default_agency)
        session.commit()
        
        # سپس یوزر ادمین را می‌سازیم (username: admin, password: 123)
        admin_user = User(
            agency_id=default_agency.id,
            full_name="مدیر ارشد",
            username="admin",
            hashed_password=get_password_hash("123"),
            role=UserRole.SUPER_ADMIN
        )
        session.add(admin_user)
        session.commit()
    # --------------------------------------------------------

    # جستجوی کاربر در دیتابیس
    user = session.exec(select(User).where(User.username == request_data.username)).first()
    
    if not user or not verify_password(request_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است.")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="حساب کاربری شما غیرفعال شده است.")

    # تولید توکن
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    # قرار دادن توکن داخل کوکیِ مرورگر (HttpOnly برای امنیت بالا)
    response.set_cookie(
        key="access_token", 
        value=f"Bearer {access_token}", 
        httponly=True,
        max_age=7 * 24 * 60 * 60, # 7 days
        samesite="lax"
    )
    
    return {"message": "ورود موفقیت‌آمیز بود", "user": user.full_name}

@router.post("/logout")
def logout(response: Response):
    """پاک کردن کوکی مرورگر برای خروج"""
    response.delete_cookie(key="access_token")
    return {"message": "شما با موفقیت خارج شدید."}

@router.post("/send-otp")
def send_otp(request_data: SendOtpRequest, session: Session = Depends(get_session)):
    """API درخواست ارسال کد پیامکی"""
    # بررسی اینکه آیا این شماره موبایل اصلاً در تیم ما ثبت شده یا نه
    user = session.exec(select(User).where(User.username == request_data.phone)).first()
    if not user:
        raise HTTPException(status_code=404, detail="این شماره در سیستم ثبت نشده است. به مدیر شعبه اطلاع دهید.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="حساب کاربری شما مسدود است.")
        
    send_otp_sms(request_data.phone)
    return {"status": "success", "message": "کد ۵ رقمی با موفقیت ارسال شد."}

@router.post("/verify-otp")
def verify_otp(request_data: VerifyOtpRequest, response: Response, session: Session = Depends(get_session)):
    """API بررسی کد و لاگین نهایی"""
    if not verify_otp_code(request_data.phone, request_data.code):
        raise HTTPException(status_code=400, detail="کد وارد شده اشتباه است یا منقضی شده.")
        
    user = session.exec(select(User).where(User.username == request_data.phone)).first()
    
    # تولید توکن امنیتی و ورود به سیستم
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    response.set_cookie(
        key="access_token", 
        value=f"Bearer {access_token}", 
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax"
    )
    
    return {"status": "success", "message": "ورود موفقیت‌آمیز بود"}