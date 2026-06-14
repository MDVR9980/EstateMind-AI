# مسیر فایل: scripts/ghost_crawler.py

import sys
import os
import time
import random
import re

# اضافه کردن مسیر اصلی پروژه تا پایتون بتواند دیتابیس را بشناسد
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.sync_api import sync_playwright
from sqlmodel import Session, select
from app.core.database import engine
from app.core.models import Property, PropertyType, DealType
from app.services.ai_engine import analyze_property_text
from app.services.vector_db import add_property_to_vector_db
from app.services.notifier import send_telegram_alert

def human_like_crawler(city: str, neighborhood: str, user_id: int):
    print(f"\n🚀 [GHOST CRAWLER START]: City: {city} | Hood: {neighborhood}")
    
    with sync_playwright() as p:
        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        try:
            # باز کردن مرورگر به صورت کاملاً مخفی (Headless) با اطلاعات لاگین شما
            context = p.chromium.launch_persistent_context(
                user_data_dir="./divar_profile", 
                headless=True, 
                channel="chrome", 
                user_agent=human_user_agent,
                args=["--disable-blink-features=AutomationControlled"]
            )
        except Exception as e:
            print(f"❌ خطا در باز کردن مرورگر (احتمالا مرورگر لاگین هنوز باز است): {e}")
            return
            
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        search_url = f"https://divar.ir/s/{city.lower()}/buy-residential?q={neighborhood}"
        
        try:
            page.goto(search_url, timeout=60000)
            page.wait_for_timeout(4000)

            print("⬇️ در حال اسکرول و شبیه‌سازی رفتار انسان...")
            page.evaluate("""
                window.ghostLinks = new Set();
                window.recordLinks = setInterval(() => {
                    document.querySelectorAll('a[href^="/v/"]').forEach(a => window.ghostLinks.add(a.getAttribute('href')));
                }, 500);
            """)

            # اسکرول هوشمند برای لود شدن آگهی‌ها
            for _ in range(15):
                page.mouse.wheel(0, random.randint(1500, 3000))
                page.wait_for_timeout(random.uniform(1000, 2000))

            page.evaluate("clearInterval(window.recordLinks);")
            links = page.evaluate("Array.from(window.ghostLinks)")
            
            if not links:
                print(f"⚠️ هیچ لینکی در {neighborhood} یافت نشد.")
                context.close()
                return

            print(f"🎉 {len(links)} آگهی پیدا شد. در حال فیلتر تکراری‌ها...")
            
            with Session(engine) as session:
                for idx, href in enumerate(links):
                    raw_token = href.split('/')[-1]
                    token = raw_token.split('?')[0]
                    
                    # 🛡️ بررسی عدم تکرار در دیتابیس (جلوگیری از فایل تکراری)
                    if session.exec(select(Property).where(Property.divar_token == token)).first():
                        continue
                        
                    ad_url = f"https://divar.ir/v/{token}"
                    print(f"[{idx+1}/{len(links)}] 🔍 استخراج آگهی جدید: {token}")
                    
                    try: 
                        page.goto(ad_url, timeout=25000)
                    except: continue
                    page.wait_for_timeout(3000)
                    
                    # دریافت شماره تلفن
                    contact_phone = "نیاز به لاگین"
                    try:
                        page.evaluate("document.querySelectorAll('button').forEach(b => { if(b.innerText.includes('اطلاعات تماس')) b.click(); });")
                        page.wait_for_timeout(2000)
                        modal_text = page.locator("body").inner_text()
                        
                        persian_to_eng = str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789')
                        clean_text = modal_text.translate(persian_to_eng)
                        phone_match = re.search(r'(09\d{9})', clean_text)
                        if phone_match: contact_phone = phone_match.group(1)
                    except: pass

                    # استخراج متن کامل آگهی
                    try: full_text = page.locator("body").inner_text()
                    except: full_text = ""
                    if not full_text.strip(): continue

                    # 🧠 ارسال به موتور هوش مصنوعی
                    ai_data = analyze_property_text(full_text)
                    
                    p_type = PropertyType.APARTMENT
                    if ai_data.get("property_type") == "villa": p_type = PropertyType.VILLA
                    elif ai_data.get("property_type") == "land": p_type = PropertyType.LAND
                    elif ai_data.get("property_type") == "commercial": p_type = PropertyType.COMMERCIAL

                    # 💾 ذخیره نهایی در دیتابیس
                    new_prop = Property(
                        agency_id=1, created_by_id=user_id, divar_token=token,
                        title=ai_data.get("title", "فایل شکار شده"), property_type=p_type, deal_type=DealType.SALE,
                        city=city, neighborhood=ai_data.get("neighborhood", neighborhood), address=ad_url,
                        built_area=ai_data.get("area", 0), rooms=ai_data.get("rooms", 0),
                        price_total=ai_data.get("price_total", 0), owner_phone=contact_phone, owner_name="مالک دیوار",
                        has_master_room=ai_data.get("has_master", False), ai_pros=ai_data.get("pros", ""),
                        ai_cons=ai_data.get("cons", ""), description="شکار شده توسط ربات EstateMind", is_exclusive=False
                    )
                    session.add(new_prop)
                    session.commit()
                    session.refresh(new_prop)
                    
                    # تزریق به پایگاه داده معنایی (ChromaDB)
                    try: add_property_to_vector_db(new_prop.id, new_prop.title, full_text, new_prop.property_type, "فروش", new_prop.neighborhood, new_prop.price_total)
                    except: pass
                    
                    # 📱 ارسال آلارم تلگرام
                    send_telegram_alert(new_prop.title, new_prop.neighborhood, new_prop.price_total, contact_phone, "ربات خزنده‌ی دیوار")
                    
                    print(f"   ✅ فایل در سیستم ذخیره شد: {new_prop.title}")
                    time.sleep(random.uniform(3, 7)) # مکث تصادفی برای بلاک نشدن توسط دیوار
        
        except:
            pass

        context.close()
        print(f"🏁 ربات ماموریت خود را با موفقیت انجام داد و به خواب رفت.")

if __name__ == "__main__":
    if len(sys.argv) == 4: 
        human_like_crawler(city=sys.argv[1], neighborhood=sys.argv[2], user_id=int(sys.argv[3]))
    else:
        human_like_crawler("mashhad", "وکیل آباد", 1)