import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

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

def analyze_property_text(ad_text: str, target_hood: str = "نامشخص") -> dict:
    """تحلیل عمیق متن آگهی + سیستم کشف تقلب و استخراج دقیق اعداد"""
    prompt = f"""
    شما یک کارشناس املاک هستید. متن آگهی زیر را بخوانید و فقط یک خروجی JSON بدهید.
    1. قیمت کل (price_total) را عدد صحیح بنویس. اگر توافقی بود 0 بگذار.
    2. اگر ملک رهن و اجاره بود، مقادیر price_mortgage و price_rent را پر کن.
    3. متراژ را در built_area بنویس.
    4. اگر محله واقعی ملک با "{target_hood}" متفاوت بود، is_fake_location را true بگذار.
    5. نقاط قوت و ضعف را به فارسی روان و کامل بنویس. (بدون استفاده از دبل‌کوتیشن " در داخل متن‌ها).
    
    الگوی خروجی:
    {{
      "is_fake_location": false,
      "neighborhood": "سجاد",
      "publisher": "املاک",
      "property_type": "apartment",
      "deal_type": "sale",
      "price_total": 10000000000,
      "price_mortgage": 0,
      "price_rent": 0,
      "built_area": 120,
      "rooms": 2,
      "has_master_room": true,
      "ai_pros": "نقاط قوت کامل...",
      "ai_cons": "نقاط ضعف کامل..."
    }}
    
    متن خام آگهی:
    {ad_text[:3000]}
    """

    if not nvidia_client:
        return _mock_ai_response()

    try:
        response = nvidia_client.chat.completions.create(
            model="mistralai/mistral-large-3-675b-instruct-2512",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1, max_tokens=1000
        )
        raw_output = response.choices[0].message.content.strip()
        json_match = re.search(r'```(?:json)?(.*?)```', raw_output, re.DOTALL)
        if json_match: raw_output = json_match.group(1).strip()
        start = raw_output.find('{')
        end = raw_output.rfind('}') + 1
        if start != -1 and end != 0: raw_output = raw_output[start:end]
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

def generate_smart_comparison(target_title, target_price, target_area, comparables) -> str:
    """تولید یک پاراگراف تحلیلی برای مقایسه یک ملک با فایل‌های مشابه"""
    if not nvidia_client:
        return "⚠️ هوش مصنوعی متصل نیست. (حالت تستی: این فایل نسبت به بقیه ارزنده تر است)."
        
    comps_text = "\n".join([f"- {c['title']}: {c['price']} تومان ({c['area']} متر)" for c in comparables])
    
    prompt = f"""
    شما یک مشاور املاک ارشد هستید. 
    یک فایل هدف داریم: "{target_title}" با قیمت {target_price} تومان و متراژ {target_area} متر.
    
    فایل‌های مشابه در همین محله این موارد هستند:
    {comps_text}
    
    لطفاً در یک پاراگراف کوتاه (حداکثر ۳-۴ خط)، به زبان فارسی روان و لحن حرفه‌ای، فایل هدف را با این فایل‌های مشابه مقایسه کن و بگو آیا فایل هدف "ارزنده"، "نرمال" یا "گران" است.
    """

    try:
        response = nvidia_client.chat.completions.create(
            model="mistralai/mistral-large-3-675b-instruct-2512",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=300
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ AI Comparison Error: {e}")
        return "سیستم در حال حاضر قادر به تحلیل هوشمند نیست."