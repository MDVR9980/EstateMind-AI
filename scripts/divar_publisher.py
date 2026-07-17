import json
import sys
import os
import time
from playwright.sync_api import sync_playwright

# اضافه کردن مسیر روت پروژه برای دسترسی به دیتابیس
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlmodel import Session
from app.core.database import engine
from app.core.models import Property

def publish_to_divar(property_id: int):
    print(f"🚀 [Divar Publisher] Start for Property ID: {property_id}")
    
    # ۱. استخراج اطلاعات فایل از دیتابیس
    with Session(engine) as session:
        prop = session.get(Property, property_id)
        if not prop:
            print("❌ Property not found!")
            return
        
        # پاک‌سازی کاملاً امن با json.dumps برای جلوگیری از شکسته شدن جاوااسکریپت
        js_title = json.dumps(prop.title or "")
        js_price = json.dumps(str(int(prop.price_total)) if prop.price_total else "")
        js_area = json.dumps(str(int(prop.built_area)) if prop.built_area else "")
        
        desc = prop.description or ""
        if prop.ai_pros: desc += f"\n\n✨ نقاط قوت:\n{prop.ai_pros}"
        if prop.ai_cons: desc += f"\n\n⚠️ موارد قابل توجه:\n{prop.ai_cons}"
        js_desc = json.dumps(desc)

    # ۲. راه‌اندازی مرورگر و تزریق جادوی ربات
    with sync_playwright() as p:
        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        context = p.chromium.launch_persistent_context(
            user_data_dir="./divar_profile", # استفاده از کوکی‌های ذخیره شده قبلی
            headless=False, # حتما باید False باشد تا مشاور ببیند
            channel="chrome",
            user_agent=human_user_agent,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print("\n👀 مرورگر باز شد! هدایت به صفحه ثبت آگهی دیوار...")
        page.goto("https://divar.ir/new", timeout=60000)
        
        # ۳. تزریق پنل جادوییِ ربات روی صفحه دیوار!
        page.evaluate(f"""
            let panel = document.createElement('div');
            panel.style.position = 'fixed'; panel.style.bottom = '20px'; panel.style.right = '20px';
            panel.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'; panel.style.color = '#fff';
            panel.style.padding = '20px'; panel.style.borderRadius = '20px';
            panel.style.zIndex = '999999'; panel.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
            panel.style.backdropFilter = 'blur(10px)';
            panel.style.direction = 'rtl'; panel.style.fontFamily = 'Tahoma';
            panel.style.width = '300px';
            panel.innerHTML = `
                <h3 style="margin-top:0; color:#10b981; font-size:16px;">🤖 دستیار انتشار EstateMind</h3>
                <p style="font-size:12px; line-height:1.6; color:#cbd5e1;">۱. ابتدا دسته‌بندی آگهی (مثلاً آپارتمان) را در دیوار انتخاب کنید.<br>۲. وقتی فرم دیوار باز شد، روی دکمه زیر کلیک کنید.</p>
                <button id="autofill-btn" style="background:linear-gradient(to right, #3b82f6, #6366f1); color:#fff; border:none; padding:10px; border-radius:12px; cursor:pointer; font-weight:bold; width:100%; box-shadow:0 4px 6px rgba(0,0,0,0.1);">پر کردن خودکار فرم 🪄</button>
            `;
            document.body.appendChild(panel);

            document.getElementById('autofill-btn').onclick = function() {{
                try {{
                    // پر کردن عنوان (دقت کنید متغیرها بدون کوتیشن تزریق می‌شوند چون json.dumps خودش کوتیشن دارد)
                    let titleInput = document.querySelector('input[placeholder*="عنوان"], input[name="title"]');
                    if(titleInput) {{ titleInput.value = {js_title}; titleInput.dispatchEvent(new Event('input', {{bubbles: true}})); }}
                    
                    // پر کردن قیمت
                    let priceInputs = document.querySelectorAll('input[type="text"]');
                    priceInputs.forEach(i => {{ 
                        if(i.placeholder.includes("تومان")) {{ i.value = {js_price}; i.dispatchEvent(new Event('input', {{bubbles: true}})); }} 
                    }});
                    
                    // پر کردن متراژ
                    let areaInput = document.querySelector('input[placeholder*="متر"]');
                    if(areaInput) {{ areaInput.value = {js_area}; areaInput.dispatchEvent(new Event('input', {{bubbles: true}})); }}
                    
                    // پر کردن توضیحات
                    let descInput = document.querySelector('textarea');
                    if(descInput) {{ descInput.value = {js_desc}; descInput.dispatchEvent(new Event('input', {{bubbles: true}})); }}
                    
                    this.innerText = "✅ فرم با موفقیت پر شد!";
                    this.style.background = "#10b981";
                }} catch(e) {{
                    alert("لطفا ابتدا دسته‌بندی را انتخاب کنید تا فیلدها ظاهر شوند!");
                }}
            }};
        """)
        
        print("⏳ منتظر اقدام مشاور...")
        try:
            page.wait_for_event("close", timeout=0)
        except:
            pass
        print("✅ پنجره مرورگر بسته شد.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        publish_to_divar(int(sys.argv[1]))
    else:
        print("❌ Property ID not provided.")