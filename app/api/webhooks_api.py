from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import (
    Property, PropertyType, DealType,
    Requirement, Client, AgentNotification
) 
import json
from app.services.notifier import send_telegram_alert

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# مدلی که دقیقاً با خروجی n8n شما مطابقت دارد
class N8nPayload(BaseModel):
    agency_id: int
    token: str
    title: str
    neighborhood: str
    price: float
    raw_text: str
    image_urls: list = []
    publisher: str = "نامشخص"
    contact_phone: str = ""
    chat_link: str = ""

from app.core.models import Requirement, Client, AgentNotification

@router.post("/n8n-receive")
def receive_from_n8n(data: N8nPayload, session: Session = Depends(get_session)):
    """دریافت دیتا از n8n + مچینگ خودکار با تقاضای مشتریان"""
    try:
        existing = session.exec(select(Property).where(Property.divar_token == data.token)).first()
        if existing: return {"status": "skipped"}
            
        new_prop = Property(
            agency_id=data.agency_id, divar_token=data.token, title=data.title,
            neighborhood=data.neighborhood, property_type=PropertyType.APARTMENT, 
            deal_type=DealType.SALE, price_total=data.price, owner_name=data.publisher,
            owner_phone=data.contact_phone, description=data.raw_text, is_exclusive=False
        )
        session.add(new_prop)
        session.commit()
        session.refresh(new_prop)

        # 🌟 سیستم ردیابی و پیگیری هوشمند مشتری 🌟
        requirements = session.exec(select(Requirement).where(Requirement.agency_id == new_prop.agency_id)).all()
        for req in requirements:
            # اگر محله و قیمت مچ شد
            if req.preferred_neighborhoods in new_prop.neighborhood and new_prop.price_total <= req.max_budget:
                client = session.get(Client, req.client_id)
                alert_msg = f"🔔 همخوانی هوشمند: فایل '{new_prop.title}' با بودجه مشتری شما '{client.name}' تطابق دارد."
                new_notif = AgentNotification(user_id=req.created_by_user_id, message=alert_msg)
                session.add(new_notif)
        session.commit()

        send_telegram_alert(new_prop.title, new_prop.neighborhood, new_prop.price_total, new_prop.owner_phone, "اتوماسیون n8n")
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Error in n8n Webhook: {e}")
        raise HTTPException(status_code=500, detail="خطا در ثبت دیتای n8n")

import os
import requests
from fastapi import Request, BackgroundTasks

# متغیر گلوبال برای ذخیره موقت وضعیت چت مشتریان در حافظه
CLIENT_BOT_STATES = {}

TELEGRAM_CLIENT_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") # از همون توکن قبلی استفاده میکنیم یا میتونی یدونه جدید بسازی

def send_telegram_msg(chat_id, text, reply_markup=None):
    """تابع کمکی برای ارسال پیام به تلگرام"""
    url = f"https://api.telegram.org/bot{TELEGRAM_CLIENT_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup: payload["reply_markup"] = reply_markup
    requests.post(url, json=payload)

@router.post("/client-bot-webhook")
async def telegram_client_bot(request: Request, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """وب‌هوک اصلی ربات تلگرام مشتریان (ارتباط مستقیم با خریداران)"""
    try:
        data = await request.json()
        
        # اگر کاربر دکمه‌ای را فشار داده باشد (Callback Query)
        if "callback_query" in data:
            chat_id = data["callback_query"]["message"]["chat"]["id"]
            action = data["callback_query"]["data"]
            
            if action == "buy":
                CLIENT_BOT_STATES[chat_id] = {"step": "ask_hood", "deal_type": "فروش"}
                send_telegram_msg(chat_id, "Отلی! 🏙️ **در کدام محله** به دنبال ملک هستید؟\n(مثال: سجاد، هاشمیه، وکیل آباد)")
            elif action == "rent":
                CLIENT_BOT_STATES[chat_id] = {"step": "ask_hood", "deal_type": "رهن و اجاره"}
                send_telegram_msg(chat_id, "بسیار خب! 🏙️ **در کدام محله** به دنبال ملک هستید؟\n(مثال: سجاد، هاشمیه)")
            
            # پاسخ به تلگرام برای بستن لودینگ دکمه شیشه‌ای
            requests.get(f"https://api.telegram.org/bot{TELEGRAM_CLIENT_BOT_TOKEN}/answerCallbackQuery?callback_query_id={data['callback_query']['id']}")
            return {"status": "ok"}

        # اگر کاربر پیام متنی داده باشد
        if "message" in data and "text" in data["message"]:
            chat_id = data["message"]["chat"]["id"]
            text = data["message"]["text"].strip()

            # 1. مرحله شروع (Start)
            if text == "/start":
                CLIENT_BOT_STATES[chat_id] = {"step": "start"}
                markup = {
                    "inline_keyboard": [
                        [{"text": "💰 خرید ملک", "callback_data": "buy"}, {"text": "🔑 رهن و اجاره", "callback_data": "rent"}]
                    ]
                }
                msg = "سلام! 👋 به دستیار هوشمند جستجوی ملک خوش آمدید.\nمن اینجا هستم تا بهترین فایل‌های آژانس را بر اساس نیاز شما پیدا کنم.\n\nلطفاً نوع درخواست خود را مشخص کنید:"
                send_telegram_msg(chat_id, msg, reply_markup=markup)
                return {"status": "ok"}

            # گرفتن استیت فعلی کاربر
            user_state = CLIENT_BOT_STATES.get(chat_id)
            if not user_state:
                send_telegram_msg(chat_id, "لطفاً برای شروع مجدد عبارت /start را ارسال کنید.")
                return {"status": "ok"}

            # 2. مرحله دریافت محله
            if user_state["step"] == "ask_hood":
                user_state["hood"] = text
                user_state["step"] = "ask_budget"
                msg = f"محله '{text}' ثبت شد. 🎯\nحداکثر **بودجه** شما چقدر است؟\n(لطفاً فقط عدد را به تومان وارد کنید. مثال: 10000000000)"
                send_telegram_msg(chat_id, msg)
                return {"status": "ok"}

            # 3. مرحله دریافت بودجه و جستجو در دیتابیس CRM
            if user_state["step"] == "ask_budget":
                try:
                    budget = float(text.replace(",", "").replace("تومان", "").strip())
                except:
                    send_telegram_msg(chat_id, "❌ لطفاً بودجه را فقط به صورت عدد (بدون حروف) وارد کنید.")
                    return {"status": "ok"}

                hood = user_state["hood"]
                deal = user_state["deal_type"]
                
                send_telegram_msg(chat_id, "🧠 در حال اسکن دیتابیس آژانس و بررسی فایل‌ها با هوش مصنوعی... لطفاً چند لحظه صبر کنید ⏳")
                
                # 🔍 جستجوی هوشمند در دیتابیس املاک (Property)
                properties = session.exec(
                    select(Property)
                    .where(Property.deal_type == deal)
                    .where(Property.status == "active")
                ).all()

                matches = []
                for p in properties:
                    p_hood = p.neighborhood.replace(" ", "")
                    h_query = hood.replace(" ", "")
                    # تطابق محله و قیمت
                    if (h_query in p_hood or p_hood in h_query) and (p.price_total <= budget or p.price_total == 0):
                        matches.append(p)

                # ارسال نتایج به مشتری
                if not matches:
                    send_telegram_msg(chat_id, f"😔 متأسفانه در حال حاضر فایلی در محله '{hood}' با بودجه شما در سیستم ما موجود نیست.\nدرخواست شما ثبت شد و به محض شکار فایل جدید، به شما اطلاع خواهیم داد!\n\nبرای جستجوی جدید /start را بزنید.")
                else:
                    send_telegram_msg(chat_id, f"🎉 تبریک! **{len(matches)} فایل اکازیون** متناسب با نیاز شما در دیتابیس پیدا شد:\n⬇️⬇️⬇️")
                    
                    for m in matches[:3]: # ارسال حداکثر ۳ تا از بهترین فایل‌ها
                        price_str = f"{int(m.price_total):,} تومان" if m.price_total > 0 else "توافقی"
                        link = f"http://127.0.0.1:8000/catalog/property/{m.id}" # لینک کاتالوگ شما
                        
                        prop_msg = f"🏢 <b>{m.title}</b>\n"
                        prop_msg += f"📍 محله: {m.neighborhood}\n"
                        prop_msg += f"📐 متراژ: {m.built_area} متر | 🛏 خواب: {m.rooms}\n"
                        prop_msg += f"💰 قیمت: {price_str}\n\n"
                        prop_msg += f"✨ نقطه قوت: {m.ai_pros or 'موقعیت عالی'}\n"
                        
                        markup = {"inline_keyboard": [[{"text": "🌐 مشاهده کاتالوگ کامل و عکس‌ها", "url": link}]]}
                        send_telegram_msg(chat_id, prop_msg, reply_markup=markup)

                # پایان پروسه و پاک کردن استیت
                del CLIENT_BOT_STATES[chat_id]
                return {"status": "ok"}

    except Exception as e:
        print(f"Telegram Bot Error: {e}")
        
    return {"status": "ok"}