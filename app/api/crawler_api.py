# مسیر فایل: app/api/crawler_api.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlmodel import Session, select  # 👈 select به جای درست خود برگشت!
from app.core.database import get_session
from app.services.crawler_bot import run_ghost_crawler
import jwt
from app.core.security import SECRET_KEY, ALGORITHM
from app.core.models import User  # 👈 اینجا فقط User باقی ماند

router = APIRouter(prefix="/api/crawler", tags=["Crawler"])

def get_current_user_api(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token: return None
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        return session.exec(select(User).where(User.username == payload.get("sub"))).first()
    except: return None

@router.post("/start")
def start_crawler_bot(request: Request, bg_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user:
        raise HTTPException(status_code=401, detail="باید لاگین باشید")
        
    # استفاده از محله هدف مشاور (یا پیش‌فرض "سجاد")
    target_hood = user.target_neighborhoods if user.target_neighborhoods else "سجاد"
    
    # 🚀 ارسال ربات به پس‌زمینه (Background Thread)
    bg_tasks.add_task(run_ghost_crawler, "mashhad", target_hood, user.id)
    
    return {
        "status": "success", 
        "message": f"ربات خزنده‌ی نامرئی بیدار شد و در حال اسکن محله '{target_hood}' است. تا دقایقی دیگر فایل‌ها اضافه خواهند شد!"
    }