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
    """تحلیل عمیق و بدون خطای متن آگهی"""
    
    prompt = f"""
    شما یک کارشناس ارشد و تحلیلگر حرفه‌ای املاک هستید. متن زیر، کل اطلاعات کپی شده از یک صفحه آگهی است.
    
    قوانین استخراج:
    1. خروجی فقط و فقط JSON معتبر باشد.
    2. کلید property_type: حتماً با توجه به دسته‌بندی آگهی (مثلاً فروش آپارتمان) یکی از این موارد باشد: "آپارتمان"، "ویلایی"، "زمین و کلنگی"، "تجاری و اداری".
    3. کلید ai_pros (نقاط قوت): تمام امکانات (مانند آسانسور، پارکینگ، انباری) و ویژگی‌های مثبت (مانند BMS، روف گاردن، متریال) را به دقت در متن پیدا کنید و با ایموجی ✔️ بنویسید.
    4. کلید ai_cons (نقاط ضعف): دقت کنید! اگر امکاناتی مثل آسانسور و پارکینگ در متن وجود دارد، به هیچ وجه ننویسید که وجود ندارند! فقط مواردی مثل "نداشتن عکس واقعی" یا نواقص واقعی را با ایموجی ❌ بنویسید. اگر نقصی نبود بنویسید "نقص مشهودی یافت نشد."
    5. کلید built_area: متراژ را پیدا کرده و به عدد بنویسید.
    
    الگوی JSON:
    {{
      "title": "یک عنوان جذاب",
      "real_neighborhood": "{target_hood}",
      "property_type": "آپارتمان",
      "price_total": 0,
      "built_area": 135,
      "rooms": 2,
      "has_master_room": true,
      "ai_pros": "✔️ دارای آسانسور، پارکینگ و انباری\\n✔️ سیستم BMS و روف گاردن",
      "ai_cons": "❌ استفاده از عکس تزئینی و عدم درج عکس واقعی"
    }}
    
    متن کامل آگهی (با دقت کلمه به کلمه بخوانید):
    {ad_text[:4500]}
    """

    if not nvidia_client: return _get_fallback_data()

    for attempt in range(max_retries):
        try:
            response = nvidia_client.chat.completions.create(
                model="meta/llama-3.1-70b-instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1, # دمای پایین برای جلوگیری از هذیان گفتن
                max_tokens=1500
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