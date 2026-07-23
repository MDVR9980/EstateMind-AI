import os
import sys
import subprocess
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import get_current_user_api

router = APIRouter(prefix="/api/crawler", tags=["Crawler"])

class StartCrawlerRequest(BaseModel):
    target_count: int = 50
    city: str = "mashhad"

# به دست آوردن آدرس دقیق ریشه پروژه
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@router.post("/start")
def start_crawler_bot(data: StartCrawlerRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user:
        raise HTTPException(status_code=401, detail="باید لاگین باشید")
        
    target_hoods = "سجاد"
    if user.target_neighborhoods:
        target_hoods = user.target_neighborhoods.strip()
    
    script_path = os.path.join(BASE_DIR, "scripts", "ghost_crawler.py")
    
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail=f"فایل اسکریپت در مسیر یافت نشد: {script_path}")
        
    try:
        subprocess.Popen([
            sys.executable, script_path, 
            data.city, target_hoods, str(user.id), str(data.target_count)
        ], cwd=BASE_DIR)
        
        return {
            "status": "success", 
            "message": f"ربات بیدار شد! در حال اسکن محله '{target_hoods}' برای پیدا کردن {data.target_count} فایل غیرتکراری..."
        }
    except Exception as e:
        print(f"❌ Crawler execution error: {e}")
        raise HTTPException(status_code=500, detail=f"خطا در اجرا: {str(e)}")

@router.post("/divar-login")
def trigger_divar_login(request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user:
        raise HTTPException(status_code=401)
        
    script_path = os.path.join(BASE_DIR, "scripts", "divar_login.py")
    
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail="اسکریپت لاگین دیوار یافت نشد.")

    try:
        subprocess.Popen([sys.executable, script_path], cwd=BASE_DIR)
        return {"status": "success", "message": "مرورگر باز شد. شماره تلفن خود را وارد کرده و لاگین کنید."}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="خطا در باز کردن مرورگر")