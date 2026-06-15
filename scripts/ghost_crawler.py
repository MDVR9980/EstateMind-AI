import sys
import os
import time
import random
import re

# شناسایی مسیر اصلی پروژه برای ایمپورت‌های دیتابیس
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.sync_api import sync_playwright
from sqlmodel import Session, select
from app.core.database import engine
from app.core.models import Property, PropertyType, DealType
from app.services.ai_engine import analyze_property_text
from app.services.vector_db import add_property_to_vector_db

def human_like_crawler(city="mashhad", neighborhoods="وکیل آباد", agency_id=1):
    hoods_list = [h.strip() for h in neighborhoods.split(",") if h.strip()]
    
    print(f"\n🚀 [GHOST CRAWLER START]: Agency {agency_id} | City: {city} | Hoods: {hoods_list}")
    
    with sync_playwright() as p:
        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir="./divar_profile",
                headless=False, # 🌟 حتما False باشد تا در صورت بروز پازل آن را ببینید
                channel="chrome", 
                user_agent=human_user_agent,
                viewport={"width": 1280, "height": 800},
                args=[
                    "--disable-blink-features=AutomationControlled", 
                    "--disable-infobars",
                    "--no-sandbox"
                ]
            )
        except Exception as e:
            print(f"❌ خطا در باز کردن مرورگر: {e}")
            return
            
        page = context.pages[0] if context.pages else context.new_page()
        
        # 🌟 مخفی کردن ردپای ربات (جایگزین افزونه‌های خراب)
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        for neighborhood in hoods_list:
            print(f"\n📍 Scanning Neighborhood: {neighborhood}")
            search_url = f"https://divar.ir/s/{city.lower()}/buy-residential?q={neighborhood}"
            
            try:
                page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(4000)

                print("⬇️ در حال اسکرول برای استخراج آگهی‌ها...")
                
                # اسکرول ساده‌تر و مطمئن‌تر
                for i in range(12):
                    page.mouse.wheel(0, random.randint(1000, 2500))
                    page.wait_for_timeout(random.uniform(1000, 2000))

                # استخراج لینک‌ها
                links = page.evaluate("""
                    Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href.includes('/v/'))
                """)
                links = list(set(links)) # حذف تکراری‌ها

                if not links:
                    print(f"⚠️ هیچ لینکی در {neighborhood} یافت نشد.")
                    continue

                print(f"🎉 {len(links)} آگهی پیدا شد! شروع عملیات استخراج...")
                
                with Session(engine) as session:
                    for idx, ad_url in enumerate(links):
                        try:
                            raw_token = ad_url.split('/')[-1]
                            token = raw_token.split('?')[0]
                            
                            # چک در دیتابیس
                            if session.exec(select(Property).where(Property.divar_token == token)).first():
                                print(f"⏭️ [{idx+1}/{len(links)}] فایل {token} قبلاً ذخیره شده است.")
                                continue
                                
                            print(f"\n[{idx+1}/{len(links)}] 🔍 ورود به آگهی: {token}")
                            
                            # 🌟 ساخت لینک تمیز برای جلوگیری از خطاهای URL
                            clean_ad_url = f"https://divar.ir/v/{token}"
                            
                            try: 
                                print(f"   🌐 در حال باز کردن صفحه...")
                                # استفاده از domcontentloaded باعث می‌شود ربات منتظر لود شدن عکس‌های سنگین نماند و گیر نکند
                                page.goto(clean_ad_url, wait_until="domcontentloaded", timeout=30000)
                                page.wait_for_timeout(3000) 
                            except Exception as nav_err: 
                                print(f"   ❌ خطا در لود صفحه آگهی: {nav_err}")
                                continue # رفتن به آگهی بعدی
                            
                            contact_phone = "نیاز به لاگین"
                            
                            try:
                                print("   👈 در حال کلیک روی دکمه تماس...")
                                btn_clicked = page.evaluate("""() => {
                                    let btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('اطلاعات تماس') || b.innerText.includes('تماس'));
                                    if(btn) { btn.click(); return true; }
                                    return false;
                                }""")
                                
                                if btn_clicked:
                                    page.wait_for_timeout(3000) 
                                    modal_text = page.locator("body").inner_text()
                                    persian_to_eng = str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789')
                                    clean_text = modal_text.translate(persian_to_eng)
                                    
                                    if "ورود" in modal_text or "ثبت نام" in modal_text:
                                        print("   ⚠️ دیوار از شما می‌خواهد لاگین کنید.")
                                    else:
                                        phone_match = re.search(r'(09\d{9})', clean_text)
                                        if phone_match: 
                                            contact_phone = phone_match.group(1)
                                            print(f"   📞 تلفن یافت شد: {contact_phone}")
                                        else:
                                            print("   ⚠️ شماره یافت نشد (شاید پازل آمده، لطفاً مرورگر را چک کنید)")
                                    page.keyboard.press("Escape")
                                else:
                                    print("   ⚠️ دکمه اطلاعات تماس پیدا نشد.")
                            except Exception as ex: 
                                print(f"   ⚠️ ارور در بخش دکمه تماس: {ex}")

                            # 📄 استخراج متن تمیز (اصلاح شده برای جلوگیری از خطای 9 عنصر)
                            try:
                                print("   📄 در حال استخراج متن...")
                                ad_title = page.evaluate("() => { let h1 = document.querySelector('h1'); return h1 ? h1.innerText : ''; }")
                                ad_desc = page.evaluate("() => { return Array.from(document.querySelectorAll('.kt-description-row__text')).map(e => e.innerText).join('\\n'); }")
                                full_text = f"عنوان: {ad_title}\nتوضیحات:\n{ad_desc}"
                            except Exception as text_err: 
                                print(f"   ⚠️ استفاده از روش جایگزین برای استخراج متن...")
                                try: full_text = page.locator("body").inner_text()
                                except: full_text = ""

                            if not full_text.strip(): 
                                print("   ❌ متن آگهی خالی بود، اسکیپ شد.")
                                continue

                            print("   🧠 در حال پردازش با هوش مصنوعی...")
                            ai_data = analyze_property_text(full_text, neighborhood)
                            
                            p_type = PropertyType.APARTMENT
                            if ai_data.get("property_type") == "زمین و کلنگی": p_type = PropertyType.LAND
                            elif "ویلا" in str(ai_data.get("property_type")): p_type = PropertyType.VILLA

                            # استخراج عنوان نهایی
                            final_title = ai_data.get("title", "")
                            if not final_title or final_title == "فایل شکار شده":
                                final_title = ad_title if 'ad_title' in locals() else "فایل استخراج شده ربات"

                            # ذخیره
                            print(f"   💾 در حال ذخیره در دیتابیس CRM...")
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
                            except Exception as vec_err:
                                print(f"   ⚠️ خطای وکتور دیتابیس: {vec_err}")
                            
                            print(f"   ✅ فایل با موفقیت ذخیره شد.")
                            time.sleep(random.uniform(4, 7))
                            
                        except Exception as inner_e:
                            print(f"   ❌ خطای غیرمنتظره در این آگهی: {inner_e}")
                            continue
            
            except Exception as e:
                print(f"❌ خطای اسکن محله: {e}")

        context.close()
        print(f"\n🏁 اسکن ربات تمام شد.")

if __name__ == "__main__":
    if len(sys.argv) == 4: 
        human_like_crawler(city=sys.argv[1], neighborhoods=sys.argv[2], agency_id=int(sys.argv[3]))
    else:
        human_like_crawler()