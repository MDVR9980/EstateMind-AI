import sys
import os
import time
import random
import re
import json

# شناسایی مسیر اصلی پروژه برای ایمپورت‌های دیتابیس و توابع
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
            context = p.chromium.launch_persistent_context(
                user_data_dir="./divar_profile",
                headless=True, # کاملا مخفی
                channel="chrome", 
                user_agent=human_user_agent,
                viewport={"width": 1920, "height": 1080},
                args=["--disable-blink-features=AutomationControlled", "--disable-infobars", "--no-sandbox"]
            )
        except Exception as e:
            print(f"❌ خطا در باز کردن مرورگر: {e}"); return
            
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        for neighborhood in hoods_list:
            print(f"\n📍 Scanning Neighborhood: {neighborhood}")
            search_url = f"https://divar.ir/s/{city.lower()}/buy-residential?q={neighborhood}"
            
            try:
                page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4000)

                # بستن پاپ‌آپ‌های مزاحم نقشه
                try: page.evaluate("document.querySelectorAll('button').forEach(b => { if(b.innerText.includes('بستن نقشه')) b.click(); })")
                except: pass

                print("⬇️ در حال اسکرول عمیق و جمع‌آوری نامرئی لینک‌ها...")
                # 🌟 ترفند استخراج لینک‌ها حین اسکرول (جلوگیری از محو شدن لینک‌ها در DOM)
                page.evaluate("""
                    window.ghostLinks = new Set();
                    window.recordLinks = setInterval(() => {
                        document.querySelectorAll('a[href^="/v/"]').forEach(a => window.ghostLinks.add(a.getAttribute('href')));
                    }, 500);
                """)

                # 🌟 اسکرول عمیق برای لود فایل‌های بیشتر (حدود ۲ تا ۳ هفته اخیر بسته به محله)
                for _ in range(30):
                    page.mouse.wheel(0, random.randint(1500, 3000))
                    if random.random() > 0.3: page.keyboard.press("PageDown")
                    page.wait_for_timeout(random.uniform(1500, 2500))
                    
                    try: page.evaluate("document.querySelectorAll('div').forEach(d => { if(d.scrollHeight > window.innerHeight) d.scrollBy(0, 1000); })")
                    except: pass

                page.evaluate("clearInterval(window.recordLinks);")
                links = page.evaluate("Array.from(window.ghostLinks)")

                if not links:
                    print(f"⚠️ هیچ لینکی در {neighborhood} یافت نشد.")
                    continue

                print(f"🎉 تعداد {len(links)} آگهی پیدا شد! در حال فیلتر تکراری‌ها...")
                
                with Session(engine) as session:
                    # 🌟 سیستم ضد تکرار (ارتباط مستقیم و فوق‌سریع با دیتابیس به جای زدن API)
                    fresh_links = []
                    for link in links:
                        raw_token = link.split('/')[-1]
                        token = raw_token.split('?')[0] # پاکسازی توکن
                        
                        # چک کردن در دیتابیس CRM (اگر بود، اصلاً سراغش نرو)
                        if session.exec(select(Property).where(Property.divar_token == token)).first():
                            continue
                        fresh_links.append((token, link))
                        
                    print(f"🔥 تعداد {len(fresh_links)} آگهی کاملاً جدید یافت شد.")

                    for idx, (token, ad_url) in enumerate(fresh_links):
                        try:
                            print(f"\n[{idx+1}/{len(fresh_links)}] 🔍 ورود به: {token}")
                            clean_ad_url = f"https://divar.ir/v/{token}"
                            
                            page.goto(clean_ad_url, wait_until="domcontentloaded", timeout=30000)
                            page.wait_for_timeout(3000) 
                            
                            # 🌟 فیلتر زمانی: رد کردن آگهی‌های خیلی قدیمی (بیشتر از ۳ هفته)
                            try:
                                time_subtitle = page.evaluate("() => { let el = document.querySelector('.kt-page-title__subtitle'); return el ? el.innerText : ''; }")
                                if "ماه پیش" in time_subtitle or "سال پیش" in time_subtitle or "۴ هفته" in time_subtitle:
                                    print("   ⏳ آگهی قدیمی است. رد شد.")
                                    continue
                            except: pass

                            # 🌟 ۱. استخراج تهاجمی عکس‌ها، قیمت و عنوان
                            scraped_data = page.evaluate("""() => {
                                let data = { title: "", price: 0, images: [], desc: "" };
                                
                                let h1 = document.querySelector('h1');
                                if (h1) data.title = h1.innerText;
                                
                                // 🌟 چشم ربات باز شد: خواندن تمام جدول‌ها و ویژگی‌ها علاوه بر توضیحات
                                let allText = "";
                                document.querySelectorAll('.kt-unexpandable-row, .kt-group-row-item, .kt-description-row__text').forEach(el => {
                                    allText += el.innerText.trim() + " \\n ";
                                });
                                data.desc = allText;
                                
                                document.querySelectorAll('img').forEach(img => {
                                    let src = img.src || img.getAttribute('data-src') || img.srcset;
                                    if(src && (src.includes('divarcdn') || src.includes('divar') || src.includes('http'))) {
                                        let cleanSrc = src.split(' ')[0]; 
                                        if(cleanSrc.length > 20 && !cleanSrc.includes('svg')) {
                                            data.images.push(cleanSrc);
                                        }
                                    }
                                });
                                data.images = [...new Set(data.images)];
                                
                                let rows = document.querySelectorAll('.kt-unexpandable-row');
                                rows.forEach(row => {
                                    let titleEl = row.querySelector('.kt-unexpandable-row__title');
                                    let valEl = row.querySelector('.kt-unexpandable-row__value');
                                    if (titleEl && valEl && (titleEl.innerText.includes('قیمت کل') || (titleEl.innerText.includes('قیمت') && !titleEl.innerText.includes('متر')))) {
                                        let numStr = valEl.innerText.replace(/[^0-9۰-۹]/g, '');
                                        let engNum = numStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
                                        if(engNum.length > 5) { data.price = parseInt(engNum); }
                                    }
                                });
                                return data;
                            }""")

                            if not scraped_data['title']: continue

                            # کلیک روی دکمه تماس و استخراج شماره
                            contact_phone = ""
                            try:
                                btn_locator = page.locator("button:has-text('اطلاعات تماس'), button:has-text('تماس')").first
                                if btn_locator.is_visible(timeout=3000):
                                    btn_locator.click()
                                    page.wait_for_timeout(2000) 
                                    
                                    page_text = page.locator("body").inner_text()
                                    clean_text = page_text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789'))
                                    phone_match = re.search(r'(09\d{9})', clean_text)
                                    if phone_match: contact_phone = phone_match.group(1)
                                    page.keyboard.press("Escape")
                            except: pass

                            # 🌟 ارتباط مستقیم با فایل ai_engine.py در پروژه (بدون نیاز به n8n یا API)
                            print("   🧠 پردازش با AI (تحلیل متن و کشف نقاط ضعف/قوت)...")
                            full_text_for_ai = f"عنوان: {scraped_data['title']}\nتوضیحات: {scraped_data['desc']}"
                            ai_data = analyze_property_text(full_text_for_ai, neighborhood)
                            
                            p_type = PropertyType.APARTMENT
                            if "ویلا" in str(ai_data.get("property_type")): p_type = PropertyType.VILLA
                            elif "زمین" in str(ai_data.get("property_type")): p_type = PropertyType.LAND

                            print(f"   💾 ذخیره در دیتابیس CRM...")
                            final_price = scraped_data['price'] if scraped_data['price'] > 0 else ai_data.get("price_total", 0)
                            
                            new_prop = Property(
                                agency_id=agency_id, created_by_id=1, divar_token=token,
                                title=scraped_data['title'], property_type=p_type, deal_type=DealType.SALE, 
                                city=city, neighborhood=ai_data.get("real_neighborhood", neighborhood), address=clean_ad_url,
                                built_area=ai_data.get("built_area", 0), rooms=ai_data.get("rooms", 0),
                                price_total=final_price, owner_phone=contact_phone or "ندارد", owner_name="مالک (دیوار)",
                                has_master_room=ai_data.get("has_master_room", False), 
                                ai_pros=ai_data.get("ai_pros", ""), ai_cons=ai_data.get("ai_cons", ""), 
                                description="شکار شده توسط ربات هوشمند", is_exclusive=False,
                                image_urls=json.dumps(scraped_data['images'])
                            )
                            session.add(new_prop)
                            session.commit()
                            session.refresh(new_prop)
                            
                            # وکتور دیتابیس برای مچینگ خریداران
                            try: add_property_to_vector_db(new_prop.id, new_prop.title, scraped_data['desc'], new_prop.property_type, "فروش", new_prop.neighborhood, new_prop.price_total)
                            except: pass
                            
                            # ارسال آلارم تلگرام
                            try:
                                from app.services.notifier import send_telegram_alert
                                send_telegram_alert(new_prop.title, new_prop.neighborhood, new_prop.price_total, new_prop.owner_phone, "Ghost Crawler 🕷️", new_prop.image_urls, new_prop.ai_pros, new_prop.ai_cons)
                            except: pass
                            
                            print(f"   ✅ با موفقیت ذخیره شد.")
                            time.sleep(random.uniform(5, 8)) # صبر طبیعی مثل انسان
                            
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