import os
from datetime import datetime, timedelta
import bcrypt
from fastapi import Request, HTTPException
from sqlmodel import Session, select
import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_estate_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080)) # 7 روز

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """بررسی تطابق رمز عبور تایپ شده با رمز کدگذاری شده در دیتابیس"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """تبدیل رمز عبور ساده به یک رشته کدگذاری شده غیرقابل بازگشت"""
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def create_access_token(data: dict) -> str:
    """تولید یک توکن امنیتی (JWT) برای کاربر لاگین شده"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user_api(request: Request, session: Session):
    """تابع مرکزی و یکپارچه برای احراز هویت تمام API ها"""
    token = request.cookies.get("access_token")
    if not token: 
        raise HTTPException(status_code=401, detail="لطفاً ابتدا وارد سیستم شوید.")
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        from app.core.models import User # ایمپورت در اینجا برای جلوگیری از تداخل (Circular Import)
        user = session.exec(select(User).where(User.username == payload.get("sub"))).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="حساب کاربری یافت نشد یا مسدود است.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="نشست شما منقضی شده است.")
    except Exception:
        raise HTTPException(status_code=401, detail="توکن نامعتبر است.")