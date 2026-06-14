# مسیر فایل: app/services/crawler_bot.py

import time
from playwright.sync_api import sync_playwright
from sqlmodel import Session, select
from app.core.database import engine
from app.core.models import Property, PropertyType, DealType, DocumentType
from app.services.ai_engine import analyze_property_text

def run_ghost_crawler(city: str, hood: str, user_id: int):
    """ربات خزنده‌ی نامرئی که در پس‌زمینه سایت دیوار را اسکن می‌کند"""
    print(f"🕷️ [Ghost Crawler] بیدار شد! در حال اسکن محله {hood} در {city}...")
    
    try:
        with sync_playwright() as p:
            # مرورگر مخفی را باز می‌کند
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # ورود به سایت دیوار (بخش فروش مسکونی)
            page.goto(f"https://divar.ir/s/{city}/buy-residential?q={hood}", timeout=60000)
            page.wait_for_timeout(4000) # صبر برای لود شدن آگهی‌ها
            
            # استخراج ۳ لینک اول (برای تست سریع، در نسخه نهایی می‌توان ده‌ها لینک برداشت)
            links = page.evaluate("""
                Array.from(document.querySelectorAll('a[href^="/v/"]')).map(a => a.href).slice(0, 3)
            """)
            
            if not links:
                print("⚠️ [Ghost Crawler] هیچ آگهی جدیدی پیدا نشد.")
                return

            with Session(engine) as session:
                for link in links:
                    token = link.split("/")[-1].split("?")[0]
                    
                    # بررسی ضدتکرار (جلوگیری از ثبت فایلی که قبلاً ثبت شده)
                    existing = session.exec(select(Property).where(Property.divar_token == token)).first()
                    if existing:
                        continue
                        
                    print(f"🔍 در حال تحلیل آگهی جدید: {token}")
                    page.goto(link, timeout=60000)
                    page.wait_for_timeout(2000)
                    
                    try:
                        raw_text = page.locator("body").inner_text()
                    except:
                        raw_text = "بدون متن"

                    # 🧠 ارسال متن خام به مغز هوش مصنوعی برای استخراج دقیق اطلاعات
                    ai_data = analyze_property_text(raw_text)
                    
                    # تبدیل نوع ملک پیدا شده به فرمت دیتابیس خودمان
                    p_type = PropertyType.APARTMENT
                    if ai_data.get("property_type") == "villa": p_type = PropertyType.VILLA
                    elif ai_data.get("property_type") == "land": p_type = PropertyType.LAND
                    elif ai_data.get("property_type") == "commercial": p_type = PropertyType.COMMERCIAL

                    # ذخیره فایل تمیز و پردازش شده در دیتابیس CRM
                    new_prop = Property(
                        agency_id=1,
                        created_by_id=user_id,
                        divar_token=token,
                        title=ai_data.get("title", "فایل شکار شده از دیوار"),
                        property_type=p_type,
                        deal_type=DealType.SALE,
                        city="مشهد",
                        neighborhood=ai_data.get("neighborhood", hood),
                        price_total=ai_data.get("price_total", 0),
                        built_area=ai_data.get("area", 0),
                        rooms=ai_data.get("rooms", 0),
                        has_master_room=ai_data.get("has_master", False),
                        ai_pros=ai_data.get("pros", ""),
                        ai_cons=ai_data.get("cons", ""),
                        description="این فایل توسط ربات EstateMind استخراج شده است.",
                        is_exclusive=False
                    )
                    
                    session.add(new_prop)
                    session.commit()
                    print(f"✅ فایل با موفقیت شکار و ذخیره شد: {new_prop.title}")
                    
            browser.close()
        print("🏁 [Ghost Crawler] ماموریت با موفقیت به پایان رسید.")
        
    except Exception as e:
        print(f"❌ [Ghost Crawler Error]: {e}")