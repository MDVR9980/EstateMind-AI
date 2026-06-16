import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_alert(title: str, neighborhood: str, price: float, phone: str, source: str, image_urls: str = "[]", pros: str = "", cons: str = ""):
    """ارسال آلارم فایل جدید به همراه آلبوم عکس (برگرفته از منطق پروژه دوم)"""
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ [Telegram]: توکن بات یا چت‌آیدی ست نشده است.")
        return

    # ارسال آلبوم عکس‌ها
    try:
        images = json.loads(image_urls) if image_urls else []
        if images:
            valid_images = images[:10] # تلگرام حداکثر 10 عکس در یک گروه قبول می‌کند
            media = [{"type": "photo", "media": img} for img in valid_images]
            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMediaGroup", 
                json={"chat_id": TELEGRAM_CHAT_ID, "media": media}, 
                timeout=15
            )
    except Exception as e:
        print(f"⚠️ [Telegram Media Error]: {e}")

    # فرمت‌بندی پیام
    price_str = f"{price:,.0f} تومان" if price > 0 else "توافقی"
    phone_str = phone if phone else "بدون شماره"
    
    message = f"""
🚨 <b>فایل جدید شکار شد! ({source})</b> 🚨

🏢 <b>عنوان:</b> {title}
📍 <b>محله:</b> {neighborhood}
💰 <b>قیمت کل:</b> {price_str}
📞 <b>شماره تماس:</b> <code>{phone_str}</code>

✨ <b>نقاط قوت:</b>
{pros or 'بررسی نشده'}

⚠️ <b>نقاط ضعف:</b>
{cons or 'بررسی نشده'}

🌐 <a href="http://127.0.0.1:8000/properties">ورود به پنل CRM</a>
"""

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    
    try:
        requests.post(url, json=payload, timeout=10)
        print("📨 [Telegram]: پیام با موفقیت به تلگرام ارسال شد.")
    except Exception as e:
        print(f"❌ [Telegram Network Error]: {e}")