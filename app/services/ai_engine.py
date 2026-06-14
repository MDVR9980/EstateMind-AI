# مسیر فایل: app/services/ai_engine.py

import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# اتصال به سرورهای NVIDIA برای استفاده از مدل قدرتمند Mistral
nvidia_client = None
if os.getenv("NVIDIA_API_KEY"):
    try:
        nvidia_client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1", 
            api_key=os.getenv("NVIDIA_API_KEY"), 
            timeout=30.0
        )
    except Exception as e:
        print(f"⚠️ NVIDIA Client Error: {e}")

def analyze_property_text(ad_text: str) -> dict:
    """تحلیل متن خام آگهی (یا ویس تبدیل شده) و استخراج پارامترها"""
    
    prompt = f"""
    شما یک دستیار هوشمند املاک هستید. متن زیر که صحبت‌های یک مشاور یا متن یک آگهی است را با دقت بخوانید.
    یک خروجی دقیقاً با فرمت JSON تولید کنید که شامل فیلدهای زیر باشد:
    - title: یک عنوان کوتاه و جذاب برای فایل
    - neighborhood: محله یا منطقه
    - property_type: نوع ملک (apartment, villa, land, shop)
    - deal_type: نوع معامله (sale, rent, partnership, barter)
    - price_total: قیمت کل یا پیش‌پرداخت رهن (فقط عدد صحیح به تومان)
    - area: متراژ به عدد
    - rooms: تعداد اتاق خواب به عدد
    - has_master: آیا خواب مستر دارد؟ (true/false)
    - pros: سه نقطه قوت اصلی (به صورت یک رشته متنی پیوسته)
    - cons: نقاط ضعف احتمالی (اگر ذکر نشده بنویس "مورد خاصی ذکر نشده")
    
    دقت کن که خروجی فقط و فقط یک JSON معتبر باشد و هیچ متن اضافه‌ای قبل یا بعد آن ننویس.
    متن خام:
    {ad_text}
    """

    if not nvidia_client:
        return _mock_ai_response() # اگر کلید API ست نشده بود، برای جلوگیری از کرش سیستم دیتای فیک می‌دهد

    try:
        response = nvidia_client.chat.completions.create(
            model="mistralai/mistral-large-3-675b-instruct-2512",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1, max_tokens=1000
        )
        raw_output = response.choices[0].message.content.strip()
        
        # استخراج هوشمندانه بلاک JSON در صورتی که AI متن اضافه تولید کرد
        json_match = re.search(r'```(?:json)?(.*?)```', raw_output, re.DOTALL)
        if json_match: 
            raw_output = json_match.group(1).strip()
            
        start = raw_output.find('{')
        end = raw_output.rfind('}') + 1
        if start != -1 and end != 0:
            raw_output = raw_output[start:end]
            
        raw_output = raw_output.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        return json.loads(raw_output)
        
    except Exception as e:
        print(f"⚠️ [AI Parsing Error]: {e}")
        return _mock_ai_response()

def _mock_ai_response():
    """دیتای تستی در صورتی که اینترنت قطع باشد یا API Key ست نشده باشد"""
    return {
        "title": "آپارتمان ۱۴۰ متری فول امکانات",
        "neighborhood": "سجاد",
        "property_type": "apartment",
        "deal_type": "sale",
        "price_total": 12000000000,
        "area": 140,
        "rooms": 3,
        "has_master": True,
        "pros": "نورگیری عالی، متریال برند، دسترسی عالی به حاشیه",
        "cons": "بدون تراس"
    }