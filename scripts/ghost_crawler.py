import sys
import os
import time
import random
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.sync_api import sync_playwright
from sqlmodel import Session, select
from app.core.database import engine
from app.core.models import Property, PropertyType, DealType
from app.services.ai_engine import analyze_property_text
from app.services.vector_db import add_property_to_vector_db

def human_like_crawler(city="mashhad", neighborhoods="سجاد", agency_id=1):
    hoods_list = [h.strip() for h in neighborhoods.split(",") if h.strip()]
    print(f"\n🚀 [GHOST CRAWLER START]: Agency {agency_id} | City: {city} | Hoods: {hoods_list}")
    
    with sync_playwright() as p:
        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        try:
            # 🌟 مرورگر کاملاً زیرپوستی و مخفی باز می‌شود (Headless=True)
            context = p.chromium.launch_persistent_context(
                user_data_dir="./divar_profile",
                headless=True,
                channel="chrome", 
                user_agent=human_user_agent,
                viewport={"width": 1280, "height": 800},
                args=["--disable-blink-features=AutomationControlled", "--disable-infobars", "--no-sandbox"]
            )
        except Exception as e:
            print(f"❌ خطا در باز کردن مرورگر: {e}")
            return
            
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        for neighborhood in hoods_list:
            print(f"\n📍 Scanning Neighborhood: {neighborhood}")
            search_url = f"https://divar.ir/s/{city.lower()}/buy-residential?q={neighborhood}"
            
            try:
                page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4000)

                print("⬇️ در حال اسکرول و پیدا کردن فایل‌ها...")
                for i in range(5): # اسکرول کمتر برای سرعت بیشتر
                    page.mouse.wheel(0, random.randint(1000, 2000))
                    page.wait_for_timeout(random.uniform(500, 1000))

                links = page.evaluate("""
                    Array.from(document.querySelectorAll('a')).map(a => a.href).filter(href => href.includes('/v/'))
                """)
                links = list(set(links))

                if not links:
                    print(f"⚠️ هیچ لینکی یافت نشد.")
                    continue

                print(f"🎉 {len(links)} آگهی پیدا شد! در حال فیلتر تکراری‌ها...")
                
                with Session(engine) as session:
                    # 🌟 رد کردن سریع آگهی‌های تکراری قبل از ورود به آن‌ها
                    fresh_links = []
                    for link in links:
                        token = link.split('/')[-1].split('?')[0]
                        if session.exec(select(Property).where(Property.divar_token == token)).first():
                            continue
                        fresh_links.append((token, link))
                        
                    print(f"🔥 تعداد {len(fresh_links)} آگهی کاملاً جدید یافت شد.")

                    for idx, (token, ad_url) in enumerate(fresh_links):
                        try:
                            print(f"\n[{idx+1}/{len(fresh_links)}] 🔍 ورود به: {token}")
                            clean_ad_url = f"https://divar.ir/v/{token}"
                            
                            page.goto(clean_ad_url, wait_until="domcontentloaded", timeout=30000)
                            page.wait_for_timeout(2000) 
                            
                            # 🌟 فیلتر زمانی: رد کردن آگهی‌های خیلی قدیمی
                            try:
                                time_subtitle = page.evaluate("() => { let el = document.querySelector('.kt-page-title__subtitle'); return el ? el.innerText : ''; }")
                                if "ماه پیش" in time_subtitle or "سال پیش" in time_subtitle:
                                    print("   ⏳ آگهی قدیمی است (بیش از یک ماه). رد شد.")
                                    continue
                            except: pass
                            
                            contact_phone = "نیاز به لاگین"
                            
                            # 🌟 کلیکِ فیزیکی و واقعی روی دکمه تماس (حل مشکل آبی شدن دور دکمه)
                            try:
                                btn_locator = page.locator("button:has-text('اطلاعات تماس'), button:has-text('تماس')").first
                                if btn_locator.is_visible(timeout=3000):
                                    print("   👈 کلیک فیزیکی روی دکمه تماس...")
                                    btn_locator.click()
                                    page.wait_for_timeout(2500) 
                                    
                                    modal_text = page.locator("body").inner_text()
                                    persian_to_eng = str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789')
                                    clean_text = modal_text.translate(persian_to_eng)
                                    
                                    phone_match = re.search(r'(09\d{9})', clean_text)
                                    if phone_match: contact_phone = phone_match.group(1)
                                    
                                    page.keyboard.press("Escape")
                            except Exception as ex: 
                                print(f"   ⚠️ دکمه تماس پیدا نشد.")

                            # استخراج متن
                            try:
                                ad_title = page.evaluate("() => { let h1 = document.querySelector('h1'); return h1 ? h1.innerText : ''; }")
                                ad_desc = page.evaluate("() => { return Array.from(document.querySelectorAll('.kt-description-row__text')).map(e => e.innerText).join('\\n'); }")
                                full_text = f"عنوان: {ad_title}\nتوضیحات:\n{ad_desc}"
                            except: 
                                full_text = page.locator("body").inner_text()

                            if not full_text.strip(): continue

                            print("   🧠 پردازش با NVIDIA AI...")
                            ai_data = analyze_property_text(full_text, neighborhood)
                            
                            p_type = PropertyType.APARTMENT
                            if ai_data.get("property_type") == "زمین و کلنگی": p_type = PropertyType.LAND
                            elif "ویلا" in str(ai_data.get("property_type")): p_type = PropertyType.VILLA

                            final_title = ai_data.get("title", "")
                            if not final_title or "شکار شده" in final_title: final_title = ad_title

                            print(f"   💾 ذخیره در دیتابیس CRM...")
                            new_prop = Property(
                                agency_id=agency_id, created_by_id=1, divar_token=token,
                                title=final_title, 
                                property_type=p_type, deal_type=DealType.SALE,
                                city=city, neighborhood=ai_data.get("real_neighborhood", neighborhood), address=clean_ad_url,
                                built_area=ai_data.get("built_area", 0), 
                                land_area=ai_data.get("land_area", 0),
                                rooms=ai_data.get("rooms", 0),
                                price_total=ai_data.get("price_total", 0), 
                                owner_phone=contact_phone, 
                                owner_name="مالک (دیوار)",
                                has_master_room=ai_data.get("has_master_room", False), 
                                ai_pros=ai_data.get("ai_pros", ""),
                                ai_cons=ai_data.get("ai_cons", ""), 
                                description="شکار شده توسط ربات هوشمند", is_exclusive=False
                            )
                            session.add(new_prop)
                            session.commit()
                            session.refresh(new_prop)
                            
                            try: 
                                add_property_to_vector_db(new_prop.id, new_prop.title, full_text, new_prop.property_type, "فروش", new_prop.neighborhood, new_prop.price_total)
                            except: pass
                            
                            try:
                                from app.services.notifier import send_telegram_alert
                                send_telegram_alert(new_prop.title, new_prop.neighborhood, new_prop.price_total, new_prop.owner_phone, "Ghost Crawler 🕷️", "[]", new_prop.ai_pros, new_prop.ai_cons)
                            except: pass
                            
                            print(f"   ✅ با موفقیت ذخیره شد: {final_title}")
                            time.sleep(random.uniform(2, 4))
                            
                        except Exception as inner_e:
                            print(f"   ❌ خطا در این آگهی: {inner_e}")
                            continue
            
            except Exception as e:
                print(f"❌ خطای اسکن محله: {e}")

        context.close()
        print(f"\n🏁 اسکن ربات تمام شد.")

if __name__ == "__main__":
    if len(sys.argv) == 4: human_like_crawler(city=sys.argv[1], neighborhoods=sys.argv[2], agency_id=int(sys.argv[3]))
    else: human_like_crawler()