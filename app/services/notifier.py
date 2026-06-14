import os
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_alert(title: str, neighborhood: str, price: float, phone: str, source: str):
    """ارسال آلارم فایل جدید به تلگرام مدیر یا مشاور"""
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ [Telegram]: توکن بات یا چت‌آیدی در .env ست نشده است. پیام ارسال نشد.")
        return

    # فرمت‌بندی زیبای پیام (HTML)
    price_str = f"{price:,.0f} تومان" if price > 0 else "توافقی"
    phone_str = phone if phone else "بدون شماره"
    
    message = f"""
🚨 <b>فایل جدید شکار شد! ({source})</b> 🚨

🏢 <b>عنوان:</b> {title}
📍 <b>محله:</b> {neighborhood}
💰 <b>قیمت کل:</b> {price_str}
📞 <b>شماره تماس:</b> <code>{phone_str}</code>

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
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("📨 [Telegram]: آلارم فایل جدید با موفقیت به تلگرام ارسال شد.")
        else:
            print(f"❌ [Telegram Error]: {response.text}")
    except Exception as e:
        print(f"❌ [Telegram Network Error]: {e}")