import os
import re
import json
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

try:
    nvidia_client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1", 
        api_key=os.getenv("NVIDIA_API_KEY"), 
        timeout=60.0
    )
except Exception as e: 
    nvidia_client = None
    print(f"⚠️ NVIDIA Client Error: {e}")

def analyze_property_text(ad_text: str, target_hood: str, max_retries=4) -> dict:
    """تحلیل عمیق متن آگهی و استخراج دقیق اطلاعات"""
    
    prompt = f"""
    شما یک کارشناس ارشد املاک هستید. متن آگهی زیر را با دقت بخوانید.
    
    قوانین بسیار مهم:
    1. خروجی باید فقط و فقط یک JSON معتبر باشد.
    2. یک عنوان جذاب برای کلید "title" بنویسید.
    3. قیمت کل (price_total) را پیدا کنید و به صورت عدد بنویسید (مثلاً 17000000000). اگر نبود 0 بگذارید.
    4. متراژ را برای built_area بنویسید.
    5. برای ai_pros (نقاط قوت) حداقل ۳ ویژگی مثبت ملک را با جزئیات کامل و لحن مشاور املاک بنویسید.
    6. برای ai_cons (نقاط ضعف) حداقل ۲ نقطه ضعف احتمالی (مثل قیمت، سال ساخت، موقعیت) را بنویسید.
    7. به هیچ وجه از Enter (خط جدید) داخل متن‌ها استفاده نکنید.
    
    الگوی خروجی JSON:
    {{
      "title": "یک عنوان جذاب",
      "real_neighborhood": "{target_hood}",
      "property_type": "آپارتمان",
      "price_total": 17000000000,
      "built_area": 120,
      "rooms": 2,
      "has_master_room": true,
      "ai_pros": "نورگیری بسیار عالی، نقشه بدون پرتی و لوکیشن بی‌نظیر...",
      "ai_cons": "سال ساخت نسبتا بالا، نیاز به بازسازی جزئی..."
    }}
    
    متن خام آگهی:
    {ad_text[:3500]}
    """

    if not nvidia_client: return _get_fallback_data()

    for attempt in range(max_retries):
        try:
            response = nvidia_client.chat.completions.create(
                model="meta/llama-3.1-70b-instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=1500
            )
            raw_output = response.choices[0].message.content.strip()
            
            json_match = re.search(r'```(?:json)?(.*?)```', raw_output, re.DOTALL)
            if json_match: raw_output = json_match.group(1).strip()
            
            start = raw_output.find('{')
            end = raw_output.rfind('}') + 1
            if start != -1 and end != 0: raw_output = raw_output[start:end]
            
            # شاه‌کلید شما برای جلوگیری از کرش JSON
            raw_output = raw_output.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
            raw_output = raw_output.replace('"', '\\"').replace('\\"', '"') # فیکس کردن کوتیشن‌ها
            
            return json.loads(raw_output)
            
        except Exception as e:
            print(f"⚠️ [Backend AI] Error (Attempt {attempt+1}): {e}")
            time.sleep(3)
            
    return _get_fallback_data()
    
def _get_fallback_data():
    return {
        "title": "فایل استخراج شده", "real_neighborhood": "نامشخص", "property_type": "آپارتمان",
        "price_total": 0, "built_area": 0, "rooms": 0, "has_master_room": False,
        "ai_pros": "اطلاعات کافی در متن آگهی یافت نشد.", 
        "ai_cons": "نیاز به بررسی حضوری ملک."
    }

def compare_and_valuate(target_prop: dict, comparables: list) -> list:
    prompt = f"""
    شما یک کارشناس ارشد قیمت‌گذاری املاک هستید. مقایسه یک "ملک هدف" با چند "ملک مشابه".
    ملک هدف: {json.dumps(target_prop, ensure_ascii=False)}
    املاک مشابه: {json.dumps(comparables, ensure_ascii=False)}
    
    خروجی را فقط به صورت یک آرایه JSON برگردانید.
    مثال:
    [
        {{"comp_id": 1, "conclusion": "متن مقایسه..."}}
    ]
    """
    try:
        response = nvidia_client.chat.completions.create(model="meta/llama-3.1-70b-instruct", messages=[{"role": "user", "content": prompt}], temperature=0.1, max_tokens=1500)
        raw_output = response.choices[0].message.content.strip()
        
        json_match = re.search(r'```(?:json)?(.*?)```', raw_output, re.DOTALL)
        if json_match: raw_output = json_match.group(1).strip()
        
        start = raw_output.find('[')
        end = raw_output.rfind(']') + 1
        if start != -1 and end != 0:
            raw_output = raw_output[start:end]
            
        raw_output = raw_output.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        return json.loads(raw_output)
    except: return []

def parse_property_from_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    return {"error": "Voice AI disabled."}

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
            model="qwen/qwen2.5-72b-instruct",
            # model="meta/llama-3.1-70b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=300
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ AI Comparison Error: {e}")
        return "سیستم در حال حاضر قادر به تحلیل هوشمند نیست."