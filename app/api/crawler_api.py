import os
import sys
import subprocess
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.core.database import get_session
import jwt
from app.core.security import SECRET_KEY, ALGORITHM, get_current_user_api
from app.core.models import User, Property

router = APIRouter(prefix="/api/crawler", tags=["Crawler"])

@router.post("/start")
def start_crawler_bot(request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user:
        raise HTTPException(status_code=401, detail="باید لاگین باشید")
        
    # استفاده از محله هدف مشاور (یا پیش‌فرض "سجاد")
    # ما در اینجا اگر مشاور چند محله داشت (با کاما جدا شده)، فعلاً اولی را برمی‌داریم
    target_hood = "سجاد"
    if user.target_neighborhoods:
        target_hoods = user.target_neighborhoods.strip()
    
    # 🚀 بیدار کردن ربات در سیستم‌عامل (اجرای ایزوله بدون قفل کردن سرور)
    try:
        # مسیر دقیق فایل ربات
        script_path = "scripts/ghost_crawler.py"
        
        if os.path.exists(script_path):
            subprocess.Popen([sys.executable, script_path, "mashhad", target_hoods, str(user.id)])
        
        return {
            "status": "success", 
            "message": f"ربات خزنده‌ی نامرئی بیدار شد و در حال اسکن محله '{target_hood}' است. شما می‌توانید به کارهای خود برسید!"
        }
    except Exception as e:
        print(f"❌ Crawler execution error: {e}")
        raise HTTPException(status_code=500, detail="خطا در راه‌اندازی ربات")

@router.post("/divar-login")
def trigger_divar_login(request: Request, session: Session = Depends(get_session)):
    """باز کردن مرورگر برای لاگین در دیوار جهت ذخیره نشست (Session)"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    try:
        # آدرس دقیق فایل لاگین که ساختی
        subprocess.Popen([sys.executable, "scripts/divar_login.py"])
        return {"status": "success", "message": "مرورگر باز شد."}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="خطا در باز کردن مرورگر")

@router.post("/publish-to-divar/{property_id}")
def publish_to_divar_api(property_id: int, request: Request, session: Session = Depends(get_session)):
    """ارسال دستور به ربات Playwright برای درج آگهی در سایت دیوار"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404, "فایل یافت نشد")
    
    try:
        # اجرای اسکریپت ربات درج آگهی (در بک‌گراند)
        script_path = "scripts/divar_publisher.py"
        if os.path.exists(script_path):
            subprocess.Popen([sys.executable, script_path, str(prop.id)])
            
        return {"status": "success", "message": "ربات در حال باز کردن مرورگر و درج آگهی شما در دیوار است..."}
    except Exception as e:
        print(f"❌ Publish Error: {e}")
        raise HTTPException(500, "خطا در ارتباط با ربات دیوار")