import os
from playwright.sync_api import sync_playwright

def login_to_divar():
    if not os.path.exists("./divar_profile"):
        os.makedirs("./divar_profile")

    with sync_playwright() as p:

        human_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        context = p.chromium.launch_persistent_context(
            user_data_dir="./divar_profile",
            headless=False,
            channel="chrome",
            user_agent=human_user_agent,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--window-position=50,50", 
                "--window-size=1100,800"
            ]
        )
        page = context.pages[0] if context.pages else context.new_page()
        
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        page.goto("https://divar.ir/my-divar/my-posts")
        
        print("\n👀 مرورگر باز شد! لطفا شماره موبایل خود را وارد کرده و در دیوار لاگین کنید.")
        print("⏳ پس از لاگین موفق، پنجره مرورگر را ببندید (ضربدر قرمز بالا) تا نشست شما برای ربات ذخیره شود...")
        
        try:
            page.wait_for_event("close", timeout=0)
        except: 
            pass
            
        print("✅ پنجره بسته شد. کوکی‌ها و اطلاعات لاگین شما با موفقیت ذخیره شد!")

if __name__ == "__main__":
    login_to_divar()