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
    """تحلیل عمیق متن آگهی + سیستم کشف تقلب و استخراج دقیق اعداد"""
    
    prompt = f"""
    شما یک سیستم هوشمند و کارشناس املاک هستید. متن آگهی زیر را با دقت بخوانید.
    
    مهم‌ترین قوانین:
    1. خروجی باید فقط و فقط یک JSON معتبر باشد. هیچ متن اضافه‌ای قبل یا بعد از آن ننویس.
    2. یک عنوان جذاب و کوتاه بر اساس متن برای کلید "title" بنویس.
    3. قیمت کل (price_total) را از داخل متن پیدا کن و به صورت یک عدد صحیح (Integer) بنویس. مثلا اگر نوشته 17 میلیارد، بنویس 17000000000. اگر قیمت ذکر نشده بود یا توافقی بود 0 بگذار.
    4. متراژ (land_area برای زمین/ویلا و built_area برای آپارتمان) را به صورت عدد بنویس.
    5. اگر آگهی زمین، باغ یا ویلا است، property_type را متناسب با آن پر کن.
    6. اگر محله واقعی ملک با محله هدف ("{target_hood}") متفاوت بود، is_fake_location را true بگذار.
    7. به هیچ وجه از Enter (خط جدید) داخل متن‌ها استفاده نکن.
    8. 🌟 قانون بسیار حیاتی: به هیچ وجه در داخل مقادیر متنی فارسی (مثل ai_pros یا ai_cons) از علامت نقل قول دبل‌کوتیشن (") استفاده نکنید. در صورت نیاز حتماً از تک کوتیشن (') استفاده کنید تا ساختار JSON خراب نشود.
    
    الگوی خروجی JSON (فقط همین ساختار را برگردان):
    {{
      "title": "یک عنوان جذاب و کوتاه",
      "is_fake_location": false,
      "real_neighborhood": "{target_hood}",
      "publisher": "املاک",
      "property_type": "آپارتمان",
      "deal_type": "فروش",
      "price_total": 17000000000,
      "price_mortgage": 0,
      "price_rent": 0,
      "land_area": 0,
      "built_area": 120,
      "ai_pros": "نقاط قوت کامل با زبان فارسی...",
      "ai_cons": "نقاط ضعف کامل با زبان فارسی...",
      "is_barter": false,
      "barter_description": null,
      "ai_special_features": {{"نما": "سنگ", "نورگیری": "عالی"}}
    }}
    
    متن خام آگهی:
    {ad_text[:3500]}
    """

    if not nvidia_client: return _get_fallback_data()

    for attempt in range(max_retries):
        try:
            response = nvidia_client.chat.completions.create(
                model="mistralai/mistral-large-3-675b-instruct-2512",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=1500
            )
            raw_output = response.choices[0].message.content.strip()
            
            # استخراج هوشمندانه بلاک JSON
            json_match = re.search(r'```(?:json)?(.*?)```', raw_output, re.DOTALL)
            if json_match: raw_output = json_match.group(1).strip()
            
            start = raw_output.find('{')
            end = raw_output.rfind('}') + 1
            if start != -1 and end != 0:
                raw_output = raw_output[start:end]
            
            # 🌟 پاک کردن کاراکترهای مخرب و کاماهای اضافی که باعث ارور JSON می‌شوند
            raw_output = raw_output.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
            raw_output = re.sub(r',\s*}', '}', raw_output)
            raw_output = re.sub(r',\s*]', ']', raw_output)
            
            return json.loads(raw_output)
            
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "Too Many Requests" in err_str:
                print(f"⏳ [Backend AI] Rate Limit hit! Cooling down for 10s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(10)
            else:
                print(f"⚠️ [Backend AI] Parse Error (Attempt {attempt+1}): {err_str}")
                # چاپ بخشی از خروجی خام برای دیباگ کردن در کنسول
                if 'raw_output' in locals():
                    print(f"   [متن خام هوش مصنوعی که خراب بود]: {raw_output[:150]}...") 
                time.sleep(4)
            
    return _get_fallback_data()
    
def _get_fallback_data():
    return {
        "title": "فایل شکار شده سیستم",
        "is_fake_location": False, "real_neighborhood": "نامشخص", "publisher": "نامشخص",
        "property_type": "آپارتمان", "deal_type": "فروش", "price_total": 0, "price_mortgage": 0, "price_rent": 0,
        "land_area": 0, "built_area": 0,
        "ai_pros": "سیستم به دلیل ارور در پردازش AI نتوانست مزایا را کامل استخراج کند.", 
        "ai_cons": "سیستم به دلیل ارور در پردازش AI نتوانست معایب را بررسی کند.",
        "is_barter": False, "barter_description": None, "ai_special_features": "{}"
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
        response = nvidia_client.chat.completions.create(model="mistralai/mistral-large-3-675b-instruct-2512", messages=[{"role": "user", "content": prompt}], temperature=0.1, max_tokens=1500)
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
            model="mistralai/mistral-large-3-675b-instruct-2512",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=300
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"⚠️ AI Comparison Error: {e}")
        return "سیستم در حال حاضر قادر به تحلیل هوشمند نیست."