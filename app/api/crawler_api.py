# مسیر فایل: app/api/crawler_api.py

import sys
import subprocess
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from app.core.database import get_session
import jwt
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.models import User

router = APIRouter(prefix="/api/crawler", tags=["Crawler"])

def get_current_user_api(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token: return None
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        return session.exec(select(User).where(User.username == payload.get("sub"))).first()
    except: return None

@router.post("/start")
def start_crawler_bot(request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user:
        raise HTTPException(status_code=401, detail="باید لاگین باشید")
        
    # استفاده از محله هدف مشاور (یا پیش‌فرض "سجاد")
    # ما در اینجا اگر مشاور چند محله داشت (با کاما جدا شده)، فعلاً اولی را برمی‌داریم
    target_hood = "سجاد"
    if user.target_neighborhoods:
        target_hood = user.target_neighborhoods.split(",")[0].strip()
    
    # 🚀 بیدار کردن ربات در سیستم‌عامل (اجرای ایزوله بدون قفل کردن سرور)
    try:
        # مسیر دقیق فایل ربات
        script_path = "scripts/ghost_crawler.py"
        
        # Popen ربات را اجرا می‌کند و در پس‌زمینه رها می‌کند
        subprocess.Popen([sys.executable, script_path, "mashhad", target_hood, str(user.id)])
        
        return {
            "status": "success", 
            "message": f"ربات خزنده‌ی نامرئی بیدار شد و در حال اسکن محله '{target_hood}' است. شما می‌توانید به کارهای خود برسید!"
        }
    except Exception as e:
        print(f"❌ Crawler execution error: {e}")
        raise HTTPException(status_code=500, detail="خطا در راه‌اندازی ربات")