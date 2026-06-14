# مسیر فایل: app/main.py

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# فعلا دیتابیس را لود نمی‌کنیم تا فقط ظاهر (UI) را تست کنیم
# from app.core.database import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 EstateMind AI is starting...")
    # در آینده: create_db_and_tables() و استارت کرون‌جاب‌ها
    yield
    print("🛑 EstateMind AI is shutting down...")

app = FastAPI(
    title="EstateMind AI",
    description="نسل جدید دستیار هوشمند و CRM املاک",
    version="3.0",
    lifespan=lifespan
)

# ایجاد پوشه استاتیک در صورت عدم وجود (برای جلوگیری از ارور)
os.makedirs("app/static", exist_ok=True)

# معرفی پوشه استاتیک (CSS, JS, Images) و تمپلیت‌ها (HTML)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# --- یک روت تستی برای نمایش داشبورد جدید ---
# --- یک روت تستی برای نمایش داشبورد جدید ---
@app.get("/")
async def render_dashboard(request: Request):
    """رندر کردن داشبورد اصلی سیستم"""
    return templates.TemplateResponse(
        request=request,
        name="dashboard/index.html", 
        context={"request": request, "page_title": "داشبورد مدیریت"}
    )