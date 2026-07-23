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

def human_like_crawler(city="mashhad", neighborhoods="سجاد", agency_id=1, target_count=50):
    """
    ربات خزنده‌ی نامرئی و انسان‌نما برای استخراج آگهی‌های غیرتکراری از دیوار
    :param city: نام شهر (مثلا mashhad)
    :param neighborhoods: محله‌ها (جدا شده با کاما)
    :param agency_id: آیدی آژانس مربوطه
    :param target_count: تعداد دقیق فایل‌های جدید غیرتکراری که باید شکار شوند (مثلا 50 یا 100)
    """
    hoods_list = [h.strip() for h in neighborhoods.split(",") if h.strip()]
    print(f"\n🚀 [GHOST CRAWLER START]: Agency {agency_id} | City: {city} | Target Count: {target_count} | Hoods: {hoods_list}")
    
    total_scraped_count = 0
    
    with sync_playwright() as p:
        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir="./divar_profile",
                headless=True, # کاملا مخفی در بک‌گراند
                channel="chrome", 
                user_agent=human_user_agent,
                viewport={"width": 1920, "height": 1080},
                args=["--disable-blink-features=AutomationControlled", "--disable-infobars", "--no-sandbox"]
            )
        except Exception as e:
            print(f"❌ خطا در باز کردن مرورگر: {e}")
            return
            
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        for neighborhood in hoods_list:
            if total_scraped_count >= target_count:
                print(f"🎯 به حد نصاب درخواستی ({target_count} فایل) رسیدیم. استوپ اسکن.")
                break

            print(f"\n📍 Scanning Neighborhood: {neighborhood}")
            search_url = f"https://divar.ir/s/{city.lower()}/buy-residential?q={neighborhood}"
            
            try:
                page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4000)

                # بستن پاپ‌آپ‌های مزاحم نقشه
                try: 
                    page.evaluate("document.querySelectorAll('button').forEach(b => { if(b.innerText.includes('بستن نقشه')) b.click(); })")
                except: 
                    pass

                print("⬇️ در حال اسکرول عمیق و جمع‌آوری نامرئی لینک‌ها...")
                
                # ثبت شنونده جهت جمع‌آوری لینک‌ها هنگام اسکرول
                page.evaluate("""
                    window.ghostLinks = new Set();
                    window.recordLinks = setInterval(() => {
                        document.querySelectorAll('a[href^="/v/"]').forEach(a => window.ghostLinks.add(a.getAttribute('href')));
                    }, 500);
                """)

                # اسکرول هوشمند و انسانی به پایین
                scroll_cycles = 0
                max_scroll_cycles = 25
                
                while scroll_cycles < max_scroll_cycles and total_scraped_count < target_count:
                    scroll_cycles += 1
                    page.mouse.wheel(0, random.randint(1500, 3000))
                    if random.random() > 0.3: 
                        page.keyboard.press("PageDown")
                    page.wait_for_timeout(random.uniform(1500, 2500))

                page.evaluate("clearInterval(window.recordLinks);")
                links = page.evaluate("Array.from(window.ghostLinks)")

                if not links:
                    print(f"⚠️ هیچ لینکی در محله {neighborhood} یافت نشد.")
                    continue

                print(f"🎉 تعداد {len(links)} لینک آگهی شناسایی شد. در حال فیلتر تکراری‌ها در دیتابیس...")
                
                with Session(engine) as session:
                    fresh_links = []
                    for link in links:
                        raw_token = link.split('/')[-1]
                        token = raw_token.split('?')[0]
                        
                        # بررسی ضد تکرار مستقیم در دیتابیس CRM
                        if session.exec(select(Property).where(Property.divar_token == token)).first():
                            continue
                        fresh_links.append((token, link))
                        
                    print(f"🔥 تعداد {len(fresh_links)} آگهی جدید و غیرتکراری آماده استخراج است.")

                    for idx, (token, ad_url) in enumerate(fresh_links):
                        if total_scraped_count >= target_count:
                            print(f"🎉 حد نصاب {target_count} فایل تکمیل شد!")
                            break

                        try:
                            print(f"\n[{total_scraped_count + 1}/{target_count}] 🔍 ورود به فایل: {token}")
                            clean_ad_url = f"https://divar.ir/v/{token}"
                            
                            page.goto(clean_ad_url, wait_until="domcontentloaded", timeout=30000)
                            page.wait_for_timeout(2500) 
                            
                            # فیلتر آگهی‌های خیلی قدیمی (بیش از ۳ هفته)
                            try:
                                time_subtitle = page.evaluate("() => { let el = document.querySelector('.kt-page-title__subtitle'); return el ? el.innerText : ''; }")
                                if "ماه پیش" in time_subtitle or "سال پیش" in time_subtitle or "۴ هفته" in time_subtitle:
                                    print("   ⏳ آگهی قدیمی است. رد شد.")
                                    continue
                            except:
                                pass

                            # استخراج اطلاعات صفحه (عنوان، قیمت، عکس‌ها و کل متن)
                            scraped_data = page.evaluate("""() => {
                                let data = { title: "", price: 0, images: [], desc: "" };
                                
                                let h1 = document.querySelector('h1');
                                if (h1) data.title = h1.innerText;
                                
                                data.desc = document.body.innerText;
                                
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

                            if not scraped_data['title']:
                                continue

                            # کلیک روی دکمه اطلاعات تماس و استخراج شماره تلفن با Regex
                            contact_phone = ""
                            try:
                                btn_locator = page.locator("button:has-text('اطلاعات تماس'), button:has-text('تماس')").first
                                if btn_locator.is_visible(timeout=3000):
                                    btn_locator.click()
                                    page.wait_for_timeout(2000) 
                                    
                                    page_text = page.locator("body").inner_text()
                                    clean_text = page_text.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789'))
                                    phone_match = re.search(r'(09\d{9})', clean_text)
                                    if phone_match: 
                                        contact_phone = phone_match.group(1)
                                    page.keyboard.press("Escape")
                            except:
                                pass

                            # آنالیز هوش مصنوعی جهت کشف خصوصیات، متراژ و امکانات
                            print("   🧠 آنالیز هوشمند متن با AI...")
                            full_text_for_ai = f"عنوان: {scraped_data['title']}\nتوضیحات: {scraped_data['desc']}"
                            ai_data = analyze_property_text(full_text_for_ai, target_hood=neighborhood)
                            
                            p_type = PropertyType.APARTMENT
                            p_type_str = str(ai_data.get("property_type", ""))
                            if "ویلا" in p_type_str: 
                                p_type = PropertyType.VILLA
                            elif "زمین" in p_type_str or "کلنگی" in p_type_str: 
                                p_type = PropertyType.LAND
                            elif "تجاری" in p_type_str or "اداری" in p_type_str: 
                                p_type = PropertyType.COMMERCIAL

                            final_price = scraped_data['price'] if scraped_data['price'] > 0 else ai_data.get("price_total", 0)
                            
                            # ذخیره در دیتابیس CRM
                            new_prop = Property(
                                agency_id=agency_id,
                                created_by_id=1,
                                divar_token=token,
                                title=scraped_data['title'],
                                property_type=p_type,
                                deal_type=DealType.SALE, 
                                city=city,
                                neighborhood=ai_data.get("real_neighborhood", neighborhood),
                                address=clean_ad_url,
                                built_area=ai_data.get("built_area", 0),
                                rooms=ai_data.get("rooms", 0),
                                price_total=final_price,
                                owner_phone=contact_phone or "ندارد",
                                owner_name="مالک (دیوار)",
                                has_master_room=ai_data.get("has_master_room", False), 
                                ai_pros=ai_data.get("ai_pros", ""),
                                ai_cons=ai_data.get("ai_cons", ""), 
                                description="شکار شده توسط ربات هوشمند Ghost Crawler",
                                is_exclusive=False,
                                status="pending", # ابتدا وارد صندوق ربات می‌شود
                                image_urls=json.dumps(scraped_data['images'])
                            )
                            session.add(new_prop)
                            session.commit()
                            session.refresh(new_prop)
                            
                            total_scraped_count += 1

                            # اضافه کردن به دیتابیس برداری (ChromaDB) برای مچینگ خریداران
                            try:
                                add_property_to_vector_db(
                                    new_prop.id, new_prop.title, scraped_data['desc'], 
                                    str(new_prop.property_type), "فروش", 
                                    new_prop.neighborhood, new_prop.price_total
                                )
                            except Exception as vec_e:
                                print(f"   ⚠️ Vector DB error: {vec_e}")

                            # ارسال آلارم تلگرام به مشاورین
                            try:
                                from app.services.notifier import send_telegram_alert
                                send_telegram_alert(
                                    new_prop.title, new_prop.neighborhood, 
                                    new_prop.price_total, new_prop.owner_phone, 
                                    "Ghost Crawler 🕷️", new_prop.image_urls, 
                                    new_prop.ai_pros, new_prop.ai_cons
                                )
                            except Exception as tel_e:
                                print(f"   ⚠️ Telegram alert error: {tel_e}")

                            print(f"   ✅ فایل با موفقیت ذخیره شد ({total_scraped_count}/{target_count})")
                            time.sleep(random.uniform(4, 7)) # تاخیر انسانی
                            
                        except Exception as inner_e:
                            print(f"   ❌ خطا در استخراج این آگهی: {inner_e}")
                            continue
            
            except Exception as e:
                print(f"❌ خطای اسکن محله {neighborhood}: {e}")

        context.close()
        print(f"\n🏁 اسکن ربات تمام شد. مجموع فایل‌های جدید استخراج شده: {total_scraped_count}")

if __name__ == "__main__":
    # دریافت ورودی‌ها از خط فرمان (CLI): city, neighborhoods, agency_id, target_count
    city_arg = sys.argv[1] if len(sys.argv) > 1 else "mashhad"
    hoods_arg = sys.argv[2] if len(sys.argv) > 2 else "سجاد"
    agency_arg = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    count_arg = int(sys.argv[4]) if len(sys.argv) > 4 else 50

    human_like_crawler(city=city_arg, neighborhoods=hoods_arg, agency_id=agency_arg, target_count=count_arg)