import sys
import os
import time
import random
import re

# اضافه کردن مسیر اصلی پروژه به sys.path تا ماژول‌های app شناخته بشن
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.sync_api import sync_playwright
from sqlmodel import Session, select
from app.core.database import engine
from app.core.models import Property, PropertyType, DealType
from app.services.ai_engine import analyze_property_text
from app.services.vector_db import add_property_to_vector_db

def human_like_crawler(city: str, neighborhood: str, user_id: int):
    print(f"\n🚀 [GHOST CRAWLER START]: City: {city} | Hood: {neighborhood}")
    
    with sync_playwright() as p:
        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        try:
            # استفاده از نشست لاگین شده!
            context = p.chromium.launch_persistent_context(
                user_data_dir="./divar_profile", # همون پوشه‌ای که تو divar_login.py ساختی
                headless=True, # ربات در پس‌زمینه کار میکنه
                channel="chrome", 
                user_agent=human_user_agent,
                args=["--disable-blink-features=AutomationControlled"]
            )
        except Exception as e:
            print(f"❌ خطا در باز کردن مرورگر. (احتمالاً مرورگر لاگین هنوز باز است. آن را ببندید): {e}")
            return
            
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        search_url = f"https://divar.ir/s/{city.lower()}/buy-residential?q={neighborhood}"
        
        try:
            print("⏳ در حال لود کردن صفحه اصلی...")
            page.goto(search_url, timeout=60000)
            page.wait_for_timeout(4000)

            # استخراج تمام لینک‌های آگهی موجود در صفحه
            links = page.evaluate("""
                Array.from(document.querySelectorAll('a[href^="/v/"]')).map(a => a.href)
            """)
            
            # برای جلوگیری از طولانی شدن بیش از حد، فعلا 5 تای اول رو برمیداریم (میتونی بیشترش کنی)
            links = list(set(links))[:5]

            if not links:
                print(f"⚠️ هیچ لینکی در {neighborhood} یافت نشد.")
                context.close()
                return

            print(f"🎉 {len(links)} آگهی پیدا شد. در حال ورود و استخراج شماره تلفن...")
            
            with Session(engine) as session:
                for idx, ad_url in enumerate(links):
                    raw_token = ad_url.split('/')[-1]
                    token = raw_token.split('?')[0]
                    
                    # اگر فایل از قبل تو سیستم ما بود، اسکیپ کن
                    if session.exec(select(Property).where(Property.divar_token == token)).first():
                        print(f"⏭️ فایل {token} قبلاً ثبت شده بود. رد شد.")
                        continue
                        
                    print(f"\n[{idx+1}/{len(links)}] 🔍 ورود به آگهی: {token}")
                    
                    try: 
                        page.goto(ad_url, timeout=30000)
                        page.wait_for_timeout(3000) # صبر برای لود کامل
                    except Exception as e: 
                        print("خطا در لود آگهی")
                        continue
                    
                    contact_phone = "نیاز به لاگین"
                    
                    # 💥 بخش جذاب: کلیک روی دکمه اطلاعات تماس 💥
                    try:
                        print("   👈 در حال کلیک روی دکمه اطلاعات تماس...")
                        page.evaluate("""
                            document.querySelectorAll('button').forEach(b => { 
                                if(b.innerText.includes('اطلاعات تماس') || b.innerText.includes('تماس')) b.click(); 
                            });
                        """)
                        page.wait_for_timeout(2500) # صبر برای باز شدن پاپ‌آپ شماره
                        
                        # خواندن کل متن صفحه (که الان پاپ‌آپ شماره هم توشه)
                        modal_text = page.locator("body").inner_text()
                        
                        # تبدیل اعداد فارسی به انگلیسی
                        persian_to_eng = str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789')
                        clean_text = modal_text.translate(persian_to_eng)
                        
                        # جستجوی شماره موبایل با Regex
                        phone_match = re.search(r'(09\d{9})', clean_text)
                        if phone_match: 
                            contact_phone = phone_match.group(1)
                            print(f"   📞 شماره پیدا شد: {contact_phone}")
                        else:
                            print("   ⚠️ شماره پیدا نشد (شاید لاگین نیستید یا کاربر شماره را مخفی کرده)")
                    except Exception as ex: 
                        print(f"   ⚠️ خطا در استخراج شماره: {ex}")

                    # استخراج متن آگهی برای هوش مصنوعی
                    try: full_text = page.locator("body").inner_text()
                    except: full_text = ""

                    if not full_text.strip(): continue

                    # تحلیل با AI
                    print("   🧠 ارسال به هوش مصنوعی برای تحلیل...")
                    ai_data = analyze_property_text(full_text)
                    
                    p_type = PropertyType.APARTMENT
                    if ai_data.get("property_type") == "villa": p_type = PropertyType.VILLA
                    elif ai_data.get("property_type") == "land": p_type = PropertyType.LAND

                    # ثبت در دیتابیس
                    new_prop = Property(
                        agency_id=1, created_by_id=user_id, divar_token=token,
                        title=ai_data.get("title", "فایل شکار شده"), property_type=p_type, deal_type=DealType.SALE,
                        city=city, neighborhood=ai_data.get("neighborhood", neighborhood), address=ad_url,
                        built_area=ai_data.get("area", 0), rooms=ai_data.get("rooms", 0),
                        price_total=ai_data.get("price_total", 0), 
                        owner_phone=contact_phone, # <--- ذخیره شماره تلفن 
                        owner_name="مالک (دیوار)",
                        has_master_room=ai_data.get("has_master", False), ai_pros=ai_data.get("pros", ""),
                        ai_cons=ai_data.get("cons", ""), description="شکار شده توسط ربات", is_exclusive=False
                    )
                    session.add(new_prop)
                    session.commit()
                    session.refresh(new_prop)
                    
                    # ذخیره در وکتور دیتابیس
                    try: add_property_to_vector_db(new_prop.id, new_prop.title, full_text, new_prop.property_type, "فروش", new_prop.neighborhood, new_prop.price_total)
                    except: pass
                    
                    print(f"   ✅ فایل با موفقیت در سیستم ذخیره شد!")
                    time.sleep(random.uniform(2, 5)) # مکث برای بلاک نشدن
        
        except Exception as global_err:
            print(f"❌ خطای کلی در ربات: {global_err}")

        context.close()
        print(f"🏁 ربات به خواب رفت.")

if __name__ == "__main__":
    if len(sys.argv) == 4: 
        human_like_crawler(city=sys.argv[1], neighborhood=sys.argv[2], user_id=int(sys.argv[3]))
    else:
        human_like_crawler("mashhad", "وکیل آباد", 1)