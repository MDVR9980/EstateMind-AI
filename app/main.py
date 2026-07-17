import os
import jwt
import sys
import subprocess
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.security import SECRET_KEY, ALGORITHM
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select, or_
from app.core.models import (
    Property, Client, Deal, UploadedForm,
    Reminder, Ticket, User, Agency,
    AgentMonthlyCommission,
)
from app.core.database import create_db_and_tables, get_session, engine 

# --- ایمپورت روترها ---
from app.api.properties_api import router as properties_router
from app.api.auth_api import router as auth_router
from app.api.clients_api import router as clients_router
from app.api.deals_api import router as deals_router
from app.api.reminders_api import router as reminders_router
from app.api.tickets_api import router as tickets_router
from app.api.users_api import router as users_router
from app.api.chatbot_api import router as chatbot_router
from app.api.crawler_api import router as crawler_router
from app.api.webhooks_api import router as webhooks_router
from app.api.superadmin_api import router as superadmin_router
from app.api.match_api import router as match_router
from app.api.forms_api import router as forms_router
from app.api.pricing_api import router as pricing_router
from app.api.nfc_api import router as nfc_router
from app.api.ws_api import router as ws_router

def run_crawler_job():
    """کرون‌جاب بک‌گراند برای استارت اتوماتیک خزش"""
    print("⏰ [CRON JOB]: Triggering scheduled crawler...")
    try:
        with Session(engine) as session:
            # در سیستم ما فعلا آژانس تستی آیدی 1 دارد
            users = session.exec(select(User).where(User.agency_id == 1)).all()
            target_hoods = set()
            for u in users:
                if u.target_neighborhoods:
                    hoods = [h.strip() for h in u.target_neighborhoods.split(",") if h.strip()]
                    for h in hoods:
                        target_hoods.add(h)
            
            if target_hoods:
                hoods_param = ",".join(target_hoods)
                print(f"⏰ Running crawler for Hoods: {hoods_param}")
                subprocess.Popen([sys.executable, "scripts/ghost_crawler.py", "mashhad", hoods_param, "1"])
    except Exception as e:
        print(f"CRON Error: {e}")

def check_stale_properties():
    """کرون‌جاب برای پیدا کردن فایل‌های رسوب کرده (بالای ۳۰ روز)"""
    print("⏰ [CRON JOB]: Checking for stale properties...")
    try:
        with Session(engine) as session:
            # محاسبه تاریخ 30 روز پیش
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            # پیدا کردن فایل‌های فعال که قبل از 30 روز پیش ثبت شده‌اند
            stale_props = session.exec(
                select(Property)
                .where(Property.status == "active")
                .where(Property.created_at <= thirty_days_ago)
            ).all()

            for prop in stale_props:
                if not prop.created_by_id: continue

                # بررسی اینکه آیا قبلاً یادآور برای این فایل ثبت شده یا نه (جلوگیری از اسپم)
                existing_reminder = session.exec(
                    select(Reminder)
                    .where(Reminder.property_id == prop.id)
                    .where(Reminder.title.contains("رسوب"))
                    .where(Reminder.is_completed == False)
                ).first()

                if not existing_reminder:
                    new_reminder = Reminder(
                        user_id=prop.created_by_id,
                        property_id=prop.id,
                        title=f"⚠️ فایل رسوب کرده: {prop.title}",
                        description=f"این فایل بیش از ۳۰ روز است که روی دست آژانس مانده! لطفاً با مالک (تلفن: {prop.owner_phone or 'نامشخص'}) تماس بگیرید و با استفاده از دکمه 'کارشناسی قیمت' او را برای کاهش قیمت متقاعد کنید.",
                        remind_date=datetime.utcnow() + timedelta(hours=1) # یادآوری برای یک ساعت دیگر
                    )
                    session.add(new_reminder)
                    print(f"🔔 Reminder created for stale property: {prop.title}")
            
            session.commit()
    except Exception as e:
        print(f"Stale Check Error: {e}")

# 🌟 فیکس شدن باگ دوگانه بودن lifespan 🌟
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 EstateMind AI is starting...")
    create_db_and_tables()
    print("✅ Database is ready!")
    
    print("⏳ Starting Background Scheduler...")
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_crawler_job, 'interval', minutes=60)
    scheduler.add_job(check_stale_properties, 'interval', hours=24)
    scheduler.start()
    
    yield
    
    print("🛑 EstateMind AI is shutting down...")
    scheduler.shutdown()

# تعریف اپلیکیشن اصلی
app = FastAPI(
    title="EstateMind AI",
    version="3.0",
    lifespan=lifespan
)

# ثبت روترها
app.include_router(properties_router)
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(deals_router)
app.include_router(reminders_router)
app.include_router(tickets_router)
app.include_router(users_router)
app.include_router(chatbot_router)
app.include_router(crawler_router)
app.include_router(webhooks_router)
app.include_router(superadmin_router) 
app.include_router(match_router)
app.include_router(forms_router)
app.include_router(pricing_router)
app.include_router(nfc_router)
app.include_router(ws_router)

os.makedirs("app/static", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_current_user(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        token = token.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = session.exec(select(User).where(User.username == username)).first()
        return user
    except Exception:
        return None

@app.get("/")
async def render_dashboard(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")

    sales_count = len(session.exec(select(Deal).where(Deal.deal_type == "sale")).all())
    rent_count = len(session.exec(select(Deal).where(Deal.deal_type == "rent")).all())
    leads_count = len(session.exec(select(Client)).all())
    ai_matches = 3 

    return templates.TemplateResponse(request=request, name="dashboard/index.html", context={"request": request, "page_title": "داشبورد مدیریت", "user": user, "stats": {"sales": sales_count, "rents": rent_count, "leads": leads_count, "ai_matches": ai_matches}})

@app.get("/login")
async def render_login(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if user: return RedirectResponse(url="/")
    return templates.TemplateResponse(request=request, name="auth/login.html", context={"request": request, "page_title": "ورود به EstateMind"})

@app.get("/submit-property/{agency_id}")
async def render_owner_form(agency_id: int, request: Request, session: Session = Depends(get_session)):
    """نمایش فرم ثبت ملک به مالک"""
    agency = session.get(Agency, agency_id)
    if not agency: 
        return HTMLResponse("<h1>آژانس یافت نشد</h1>", status_code=404)
    return templates.TemplateResponse(request=request, name="public/owner_form.html", context={"request": request, "agency": agency, "page_title": "ثبت ملک شما"})

@app.get("/card/{username}")
async def render_agent_card(username: str, request: Request, session: Session = Depends(get_session)):
    """نمایش کارت ویزیت دیجیتال مشاور (برای اسکن NFC)"""
    agent = session.exec(select(User).where(User.username == username)).first()
    if not agent: 
        return HTMLResponse("<h1>مشاور یافت نشد</h1>", status_code=404)
    agency = session.get(Agency, agent.agency_id)
    return templates.TemplateResponse(request=request, name="public/agent_card.html", context={"request": request, "agent": agent, "agency": agency, "page_title": f"کارت ویزیت {agent.full_name}"})

@app.get("/funnel")
async def render_funnel(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    
    stages = [
        {"id": "لید جدید", "name": "تماس اولیه (لید جدید)", "color": "border-blue-500", "bg": "bg-blue-50 dark:bg-blue-900/10"},
        {"id": "بازدید", "name": "در حال بازدید", "color": "border-amber-500", "bg": "bg-amber-50 dark:bg-amber-900/10"},
        {"id": "جلسه در دفتر", "name": "جلسه و مذاکره", "color": "border-purple-500", "bg": "bg-purple-50 dark:bg-purple-900/10"},
        {"id": "قرارداد موفق", "name": "قرارداد موفق", "color": "border-emerald-500", "bg": "bg-emerald-50 dark:bg-emerald-900/10"},
    ]
    
    # 🔒 فیلتر امنیتی: مدیر کل مشتریان آژانس را می‌بیند، مشاور فقط مشتریان خودش را
    if user.role in ["SUPER_ADMIN", "MANAGER"]:
        clients = session.exec(select(Client).where(Client.agency_id == user.agency_id).order_by(Client.id.desc())).all()
    else:
        clients = session.exec(select(Client).where(Client.user_id == user.id).order_by(Client.id.desc())).all()
        
    return templates.TemplateResponse(request=request, name="dashboard/funnel.html", context={"request": request, "page_title": "مدیریت قیف فروش (Kanban)", "stages": stages, "clients": clients, "user": user})

@app.get("/properties")
async def render_properties_list(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    
    # 🔒 فیلتر امنیتی فایل‌ها
    if user.role in ["SUPER_ADMIN", "MANAGER"]:
        # مدیر کل فایل‌های آژانس را می‌بیند
        properties_list = session.exec(select(Property).where(Property.agency_id == user.agency_id).order_by(Property.id.desc())).all()
    else:
        # مشاور فقط فایل‌های خودش + فایل‌هایی که همکاران عمومی کرده‌اند را می‌بیند
        properties_list = session.exec(
            select(Property)
            .where(Property.agency_id == user.agency_id)
            .where(or_(Property.created_by_id == user.id, Property.is_exclusive == False))
            .order_by(Property.id.desc())
        ).all()
        
    return templates.TemplateResponse(request=request, name="dashboard/properties_list.html", context={"request": request, "page_title": "مدیریت فایل‌ها", "properties": properties_list, "user": user})

@app.get("/properties/add")
async def add_property(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    return templates.TemplateResponse(request=request, name="dashboard/add_property.html", context={"request": request, "page_title": "ثبت فایل جدید (هوشمند)", "user": user})

@app.get("/financials")
async def render_financials(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    deals = session.exec(select(Deal).order_by(Deal.id.desc())).all()
    total_revenue = sum(d.commission_amount for d in deals) if deals else 0
    office_share = total_revenue * 0.5 
    agent_share = total_revenue * 0.5  
    active_clients = session.exec(select(Client).where(Client.funnel_stage != "قرارداد موفق")).all()
    available_properties = session.exec(select(Property).where(Property.status == "active")).all()
    agent_commissions = session.exec(
        select(AgentMonthlyCommission, User.full_name)
        .join(User, User.id == AgentMonthlyCommission.user_id)
        .where(AgentMonthlyCommission.agency_id == user.agency_id)
        .order_by(AgentMonthlyCommission.id.desc())
    ).all()
    return templates.TemplateResponse(request=request, name="dashboard/financials.html", context={"request": request, "page_title": "گزارشات مالی و عملکرد", "deals": deals, "total_revenue": total_revenue, "office_share": office_share, "agent_share": agent_share, "clients": active_clients, "properties": available_properties, "user": user, "agent_commissions": agent_commissions})

@app.get("/settings")
async def render_settings(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    agency_forms = session.exec(select(UploadedForm).order_by(UploadedForm.id.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard/settings.html", context={"request": request, "page_title": "تنظیمات و مدارک", "user": user, "forms": agency_forms})

@app.get("/customers")
async def render_customers(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    
    # 🔒 فیلتر امنیتی دفترچه مشتریان
    if user.role in ["SUPER_ADMIN", "MANAGER"]:
        clients_list = session.exec(select(Client).where(Client.agency_id == user.agency_id).order_by(Client.id.desc())).all()
    else:
        clients_list = session.exec(select(Client).where(Client.user_id == user.id).order_by(Client.id.desc())).all()
        
    return templates.TemplateResponse(request=request, name="dashboard/customers.html", context={"request": request, "page_title": "دفترچه مشتریان", "clients": clients_list, "user": user})
    
@app.get("/partnership")
async def render_partnership(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    from app.core.models import DealType
    lands = session.exec(select(Property).where(Property.deal_type == DealType.PARTNERSHIP).order_by(Property.id.desc())).all()
    builders = session.exec(select(Client).where(Client.deal_type_requested == DealType.PARTNERSHIP).order_by(Client.id.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard/partnership.html", context={"request": request, "page_title": "دپارتمان مشارکت در ساخت", "lands": lands, "builders": builders, "user": user})

@app.get("/team")
async def render_team(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    agents = session.exec(select(User).where(User.username != "admin").order_by(User.id.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard/team.html", context={"request": request, "page_title": "مدیریت تیم و مشاوران", "agents": agents, "user": user})

@app.get("/reminders")
async def render_reminders(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    reminders_list = session.exec(select(Reminder).order_by(Reminder.is_completed, Reminder.remind_date.asc())).all()
    active_clients = session.exec(select(Client)).all()
    return templates.TemplateResponse(request=request, name="dashboard/reminders.html", context={"request": request, "page_title": "تقویم و یادآورها", "reminders": reminders_list, "clients": active_clients, "user": user})

@app.get("/tickets")
async def render_tickets(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    tickets_list = session.exec(select(Ticket).order_by(Ticket.id.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard/tickets.html", context={"request": request, "page_title": "پشتیبانی و تیکت‌ها", "tickets": tickets_list, "user": user})

@app.get("/super-admin")
async def render_superadmin(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user or user.role != "SUPER_ADMIN": 
        return RedirectResponse(url="/")
    agencies = session.exec(select(Agency).order_by(Agency.id.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard/super_admin.html", context={"request": request, "page_title": "اتاق فرمان SaaS", "user": user, "agencies": agencies})

@app.get("/catalog/{client_id}")
async def render_smart_catalog(client_id: int, request: Request, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client:
        return templates.TemplateResponse(request=request, name="auth/login.html", context={"request": request, "page_title": "یافت نشد"})
    matched_properties = session.exec(select(Property).where(Property.status == "active").where(Property.deal_type == client.deal_type_requested)).all()
    top_matches = matched_properties[:3]
    return templates.TemplateResponse(request=request, name="showroom/catalog.html", context={"request": request, "page_title": f"پیشنهادات ویژه {client.name}", "client": client, "properties": top_matches})

@app.get("/catalog/property/{property_id}")
async def view_single_property(property_id: int, request: Request, session: Session = Depends(get_session)):
    prop = session.get(Property, property_id)
    if not prop: 
        return HTMLResponse("<h1 style='text-align:center; margin-top:50px; font-family:tahoma;'>فایل یافت نشد یا حذف شده است.</h1>", status_code=404)
    import json
    media_list = []
    if hasattr(prop, 'image_urls') and prop.image_urls:
        try: media_list = json.loads(prop.image_urls)
        except Exception: pass
    return templates.TemplateResponse(request=request, name="showroom/catalog_single.html", context={"request": request, "prop": prop, "media_list": media_list, "page_title": prop.title})

# 🌟 روت جدید برای پرزنت اینستاگرامی (Reels) 🌟
@app.get("/reels")
async def render_reels(request: Request, session: Session = Depends(get_session)):
    user = get_current_user(request, session)
    if not user: return RedirectResponse(url="/login")
    properties_list = session.exec(select(Property).where(Property.status == "active").order_by(Property.id.desc())).all()
    return templates.TemplateResponse(request=request, name="dashboard/reels_presentation.html", context={"request": request, "page_title": "پرزنت تعاملی (Reels)", "properties": properties_list, "user": user})