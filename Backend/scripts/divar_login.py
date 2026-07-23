import sys
import os
from playwright.sync_api import sync_playwright

def open_divar_for_login():
    print("🌐 در حال باز کردن مرورگر جهت لاگین دستی در دیوار...")
    profile_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "divar_profile")
    
    with sync_playwright() as p:
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        browser = p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False, # مرورگر باز می‌شود تا لاگین کنید
            channel="chrome",
            user_agent=user_agent,
            viewport={"width": 1280, "height": 800},
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto("https://divar.ir/my-divar/my-posts", timeout=60000)
        print("✅ مرورگر باز شد. پس از ورود، مرورگر را ببندید.")
        
        # منتظر می‌ماند تا کاربر لاگین کند و مرورگر را ببندد
        try:
            page.wait_for_timeout(300000) # ۵ دقیقه زمان برای ورود
        except Exception:
            pass
        browser.close()

if __name__ == "__main__":
    open_divar_for_login()