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

@app.get("/funnel")
async def render_funnel(request: Request):
    """رندر کردن صفحه قیف فروش و مدیریت لیدها (مشتریان)"""
    
    # دیتای تستی برای نمایش ظاهر کانبان (بعداً از دیتابیس خوانده می‌شود)
    stages = [
        {"id": "stage-1", "name": "تماس اولیه (لید جدید)", "color": "border-blue-500", "bg": "bg-blue-50 dark:bg-blue-900/10"},
        {"id": "stage-2", "name": "در حال بازدید", "color": "border-amber-500", "bg": "bg-amber-50 dark:bg-amber-900/10"},
        {"id": "stage-3", "name": "جلسه و مذاکره", "color": "border-purple-500", "bg": "bg-purple-50 dark:bg-purple-900/10"},
        {"id": "stage-4", "name": "قرارداد موفق", "color": "border-emerald-500", "bg": "bg-emerald-50 dark:bg-emerald-900/10"},
    ]
    
    return templates.TemplateResponse(
        request=request,
        name="dashboard/funnel.html", 
        context={
            "request": request, 
            "page_title": "مدیریت قیف فروش (Kanban)",
            "stages": stages
        }
    )

@app.get("/properties/add")
async def add_property(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="dashboard/add_property.html", 
        context={
            "request": request, 
            "page_title": "ثبت فایل جدید (هوشمند)"
        }
    )

# این بخش را به انتهای فایل app/main.py اضافه کنید

@app.get("/financials")
async def render_financials(request: Request):
    """رندر کردن صفحه گزارشات مالی، چارت‌ها و کمیسیون‌ها"""
    return templates.TemplateResponse(
        request=request,
        name="dashboard/financials.html", 
        context={
            "request": request, 
            "page_title": "گزارشات مالی و عملکرد"
        }
    )

@app.get("/login")
async def render_login(request: Request):
    """رندر کردن صفحه ورود مدرن (بدون سایدبار)"""
    return templates.TemplateResponse(
        request=request,
        name="auth/login.html", 
        context={"request": request, "page_title": "ورود به EstateMind"}
    )

@app.get("/settings")
async def render_settings(request: Request):
    """رندر کردن صفحه تنظیمات، پروفایل و تیکت‌ها"""
    return templates.TemplateResponse(
        request=request,
        name="dashboard/settings.html", 
        context={"request": request, "page_title": "تنظیمات و پشتیبانی"}
    )