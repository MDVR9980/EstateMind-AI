import os
import shutil
import json
import io
import jwt
from datetime import datetime
from app.core.security import SECRET_KEY, ALGORITHM
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, List
from fastapi import (
    APIRouter, File, UploadFile, 
    HTTPException, Depends, Request
)
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import Session, select, or_
from app.services.ai_engine import analyze_property_text
from app.core.database import get_session
from app.core.models import Property, PropertyType, DealType, DocumentType
from app.services.vector_db import add_property_to_vector_db
from app.services.notifier import send_telegram_alert
from app.services.ai_engine import virtual_staging_api
from app.core.models import (
    User, Client, AgentNotification, 
    Property, Reminder, FunnelStage,
    Requirement,
)
from app.core.socket_manager import notify_user_sync
from app.services.ai_engine import generate_smart_comparison

nvidia_client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

router = APIRouter(prefix="/api/properties", tags=["Properties"])

# مدل Pydantic پیشرفته برای دریافت تمام جزئیات از فرم فرانت‌اند
class PropertyCreateRequest(BaseModel):
    title: str
    property_type: str
    deal_type: str
    city: str
    neighborhood: str
    address: Optional[str] = None
    built_area: float
    rooms: int
    age: Optional[int] = 0
    floor: Optional[int] = None
    has_elevator: bool = False
    has_parking: bool = False
    has_store_room: bool = False
    has_master_room: bool = False
    cabinet_type: Optional[str] = None
    floor_covering: Optional[str] = None
    document_type: str
    price_total: float
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    is_exclusive: bool = False
    description: Optional[str] = None
    image_urls: Optional[list] = []

class PropertyEditRequest(BaseModel):
    title: Optional[str] = None
    price_total: Optional[float] = None
    owner_phone: Optional[str] = None
    ai_pros: Optional[str] = None
    ai_cons: Optional[str] = None
    publisher: Optional[str] = None
    image_urls: Optional[List[str]] = None # 👈 این خط برای ذخیره تغییرات عکس/فیلم اضافه شد

class ApproveRequest(BaseModel):
    is_exclusive: bool

def get_current_user_local(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            
    if not token: return None
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        return session.exec(select(User).where(User.username == payload.get("sub"))).first()
    except: return None
    
@router.post("/voice-parse")
async def parse_voice_to_form(audio: UploadFile = File(...)):
    temp_audio_path = f"temp_voice_{audio.filename}"
    
    try:
        # ۱. ابتدا فایل صوتیِ دریافتی از کاربر را موقتاً روی سرور ذخیره می‌کنیم
        with open(temp_audio_path, "wb") as f:
            f.write(await audio.read())
            
        # ۲. فایل ذخیره شده را باز کرده و به Whisper انویدیا می‌فرستیم
        with open(temp_audio_path, "rb") as audio_file:
            transcription = nvidia_client.audio.transcriptions.create(
                model="openai/whisper-large-v3",
                file=audio_file,
                language="fa" # اجبار هوش مصنوعی به تشخیص زبان فارسی
            )
        
        # ۳. متن استخراج شده از ویس را می‌گیریم
        transcript = transcription.text
        print(f"🎙️ متن استخراج شده از ویس مشاور: {transcript}")
                
        # ۴. متن را به موتور هوش مصنوعی خودمان (Qwen/Mistral) می‌دهیم تا فرم (JSON) را پر کند
        # مقدار target_hood را فعلا خالی می‌دهیم چون در ویس محله مشخص می‌شود
        ai_extracted_data = analyze_property_text(transcript, target_hood="")
        
        # (داده‌های هاردکد و تستی حذف شدند تا اطلاعات واقعی برگردد)
        
        return {
            "status": "success",
            "transcript": transcript,
            "data": ai_extracted_data
        }
        
    except Exception as e:
        print(f"❌ Error in Voice API: {e}")
        raise HTTPException(status_code=500, detail="خطا در پردازش هوشمند فایل صوتی.")
        
    finally:
        # ۵. در پایان (چه موفقیت‌آمیز، چه ارور)، فایل صوتی موقت را از سرور پاک می‌کنیم تا هارد پر نشود
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

@router.post("/upload-temp")
async def upload_temp_media(file: UploadFile = File(...)):
    """آپلود موقت رسانه قبل از ساخته شدن کامل ملک"""
    os.makedirs("uploads/properties", exist_ok=True)
    import random
    file_ext = file.filename.split(".")[-1].lower()
    file_name = f"temp_{random.randint(100000,999999)}.{file_ext}"
    file_path = f"uploads/properties/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "url": f"/{file_path}"}

@router.put("/{property_id}/approve")
def approve_scraped_property(property_id: int, data: ApproveRequest, request: Request, session: Session = Depends(get_session)):
    """تایید فایل شکار شده و انتقال به بانک اصلی املاک"""
    user = get_current_user_local(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404)
    
    prop.status = "active"
    prop.is_exclusive = data.is_exclusive
    # ثبت نام مشاوری که فایل را تایید و وارد سیستم کرده است
    prop.created_by_id = user.id
    if not data.is_exclusive:
        prop.made_public_by_name = user.full_name
        
    session.commit()
    return {"status": "success", "message": "فایل با موفقیت وارد بانک املاک شد."}

@router.get("/pending-list")
def get_pending_properties(request: Request, session: Session = Depends(get_session)):
    """API دریافت فایل‌های شکار شده در صندوق ورودی ربات"""
    from app.core.security import get_current_user_api
    user = get_current_user_api(request, session)
    
    # فایل‌های بررسی نشده (pending) را برمی‌گرداند
    props = session.exec(select(Property).where(Property.agency_id == user.agency_id, Property.status == "pending").order_by(Property.id.desc())).all()
    return {"status": "success", "properties": props}
    
@router.get("/app-list")
def get_properties_for_app(request: Request, session: Session = Depends(get_session)):
    """API دریافت لیست فایل‌های فعال برای اپلیکیشن"""
    from app.core.security import get_current_user_api
    user = get_current_user_api(request, session)
    
    if user.role in ["SUPER_ADMIN", "MANAGER"]:
        props = session.exec(select(Property).where(Property.agency_id == user.agency_id, Property.status == "active").order_by(Property.id.desc())).all()
    else:
        from sqlmodel import or_
        props = session.exec(
            select(Property)
            .where(Property.agency_id == user.agency_id, Property.status == "active")
            .where(or_(Property.created_by_id == user.id, Property.is_exclusive == False))
            .order_by(Property.id.desc())
        ).all()
    return {"status": "success", "properties": props}

@router.post("/save")
def save_property_to_db(request: Request, data: PropertyCreateRequest, session: Session = Depends(get_session)):
    
    user = get_current_user_api(request, session)
    try:
        # مپ کردن داده‌های فرم با Enums دیتابیس
        p_type = PropertyType.APARTMENT
        if data.property_type == "villa": p_type = PropertyType.VILLA
        elif data.property_type == "land": p_type = PropertyType.LAND
        elif data.property_type == "commercial": p_type = PropertyType.COMMERCIAL
        
        d_type = DealType.SALE
        if data.deal_type == "rent": d_type = DealType.RENT
        elif data.deal_type == "partnership": d_type = DealType.PARTNERSHIP
        
        doc_type = DocumentType.SINGLE
        if data.document_type == "PROMISSORY": doc_type = DocumentType.PROMISSORY
        elif data.document_type == "ENDOWMENT": doc_type = DocumentType.ENDOWMENT

        new_property = Property(
            agency_id=user.agency_id, 
            created_by_id=user.id,
            title=data.title,
            property_type=p_type,
            deal_type=d_type,
            city=data.city,
            neighborhood=data.neighborhood,
            address=data.address,
            built_area=data.built_area,
            rooms=data.rooms,
            age=data.age,
            floor=data.floor,
            has_elevator=data.has_elevator,
            has_parking=data.has_parking,
            has_store_room=data.has_store_room,
            has_master_room=data.has_master_room,
            cabinet_type=data.cabinet_type,
            floor_covering=data.floor_covering,
            document_type=doc_type,
            price_total=data.price_total,
            owner_name=data.owner_name,
            owner_phone=data.owner_phone,
            is_exclusive=data.is_exclusive,
            description=data.description, 
            image_urls=json.dumps(data.image_urls)
        )
        
        session.add(new_property)
        session.commit()
        
        session.refresh(new_property)
        
        # ====== سیستم مچینگ هوشمند مشتریان (Live Alerts) ======
        try:
            # حالا به جای کلاینت خام، جدول Requirement (نیازهای دقیق) را می‌خوانیم
            requirements = session.exec(
                select(Requirement)
                .where(Requirement.agency_id == new_property.agency_id)
                .where(Requirement.deal_type == new_property.deal_type)
                .where(Requirement.property_type == new_property.property_type)
            ).all()

            for req in requirements:
                # چک کردن بودجه و محله
                if (req.max_budget == 0 or new_property.price_total <= req.max_budget):
                    # آیا محله فایل جدید، داخل محله‌های درخواستی مشتری هست؟
                    if new_property.neighborhood in req.preferred_neighborhoods or req.preferred_neighborhoods in new_property.neighborhood:
                        
                        client = session.get(Client, req.client_id)
                        if not client or client.funnel_stage in [FunnelStage.WON, FunnelStage.LOST]:
                            continue # اگر معامله بسته شده بود، آلارم نده
                            
                        # 1. ثبت یادآور برای مشاور
                        new_rem = Reminder(
                            user_id=req.created_by_user_id,
                            client_id=client.id,
                            property_id=new_property.id,
                            title=f"🎯 تطابق طلایی: {client.name}",
                            description=f"فایل جدید '{new_property.title}' دقیقاً در محله درخواستی و بودجه این مشتری است!",
                            remind_date=datetime.utcnow()
                        )
                        session.add(new_rem)

                        # 2. ثبت نوتیفیکیشن
                        notif = AgentNotification(user_id=req.created_by_user_id, message=f"فایل اکازیون برای {client.name} شکار شد!")
                        session.add(notif)
                        
                        # 3. پوش نوتیفیکیشن زنده
                        notify_user_sync(req.created_by_user_id, {
                            "type": "success",
                            "title": "شکار طلایی! 🎯",
                            "message": f"فایلی در محله {new_property.neighborhood} مطابق با نیاز مشتری شما ({client.name}) ثبت شد."
                        })
            
            session.commit()
        except Exception as match_err:
            print(f"⚠️ Matchmaking Alert Error: {match_err}")
        # =====================================================
        
        try:
            desc = data.description if data.description else ""
            add_property_to_vector_db(
                property_id=new_property.id,
                title=new_property.title,
                description=desc,
                prop_type=data.property_type,
                deal_type=data.deal_type,
                neighborhood=data.neighborhood,
                price=data.price_total
            )
        except Exception as vec_err:
            print(f"⚠️ Vector DB Error: {vec_err}")

        send_telegram_alert(new_property.title, new_property.neighborhood, new_property.price_total, new_property.owner_phone, "ثبت صوتی/دستی")
        
        return {"status": "success", "message": "فایل با موفقیت ذخیره شد!"}
    
    except Exception as e:
        print(f"❌ Database Save Error: {e}")
        raise HTTPException(status_code=500, detail="خطا در ذخیره اطلاعات در دیتابیس")

@router.put("/{property_id}/make-public")
def make_property_public(property_id: int, request: Request, session: Session = Depends(get_session)):
    """API تبدیل فایل شخصی به عمومی و ثبت نام مشاور"""
    from app.main import get_current_user
    user = get_current_user(request, session)
    
    prop = session.get(Property, property_id)
    if prop and prop.is_exclusive:
        prop.is_exclusive = False
        prop.made_public_by_name = user.full_name
        session.commit()
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="فایل یافت نشد یا قبلاً عمومی است")

from app.services.ai_engine import generate_smart_comparison

@router.get("/{property_id}/compare")
def compare_property_ai(property_id: int, session: Session = Depends(get_session)):
    """API ارتقا یافته ارزیابی هوشمند (با تلورانس ۲۰٪ قیمت)"""
    target = session.get(Property, property_id)
    if not target: raise HTTPException(status_code=404)
    
    # محاسبه تلورانس ۲۰ درصد قیمت
    min_price = target.price_total * 0.8
    max_price = target.price_total * 1.2
    
    comparables = session.exec(
        select(Property)
        .where(Property.id != property_id)
        .where(Property.deal_type == target.deal_type)
        .where(Property.price_total >= min_price)
        .where(Property.price_total <= max_price)
        .limit(10) # تا 10 فایل رو پیدا میکنه
    ).all()
    
    if not comparables: return {"comparables_count": 0}
        
    comps_data_for_ai = [{"title": c.title, "price": c.price_total, "area": c.built_area} for c in comparables]
    ai_conclusion = generate_smart_comparison(target.title, target.price_total, target.built_area, comps_data_for_ai)
    
    target_data = {
        "title": target.title, "price": target.price_total, 
        "images": json.loads(target.image_urls) if target.image_urls else [],
        "pros": target.ai_pros or "ثبت نشده", "cons": target.ai_cons or "ثبت نشده"
    }

    comps_data = []
    for c in comparables:
        comps_data.append({
            "title": c.title, "price": c.price_total, 
            "images": json.loads(c.image_urls) if c.image_urls else [],
            "pros": c.ai_pros or "ثبت نشده", "cons": c.ai_cons or "ثبت نشده"
        })
        
    return {
        "comparables_count": len(comparables), 
        "target": target_data, 
        "comparables": comps_data, 
        "conclusion": ai_conclusion
    }

@router.get("/notifications/unread")
def get_unread_notifications(request: Request, session: Session = Depends(get_session)):
    """خواندن هشدارهای ردیابی مشتری برای مشاور"""
    from app.main import get_current_user
    user = get_current_user(request, session)
    if not user: return []
    
    notifs = session.exec(select(AgentNotification).where(AgentNotification.user_id == user.id).order_by(AgentNotification.id.desc())).all()
    return [{"id": n.id, "msg": n.message} for n in notifs]

# ==========================================
# 🗺️ API ارسال اطلاعات برای نقشه هوشمند
# ==========================================
@router.get("/map-data")
def get_map_data(request: Request, session: Session = Depends(get_session)):
    from app.main import get_current_user
    user = get_current_user(request, session)
    if not user: raise HTTPException(401)
    
    # گرفتن تمام فایل‌های آژانس
    properties = session.exec(select(Property).where(Property.agency_id == user.agency_id)).all()
    
    map_items = []
    for p in properties:
        # چون دیوار لوکیشن دقیق نمیده، ما بر اساس قیمت فایل رو ارزیابی میکنیم
        # برای نمایش رو نقشه، مختصات حدودی محله‌ها رو نیاز داریم (میتونیم از API نشان بگیریم، اما اینجا سیمولیت میکنیم)
        # پین سبز = اکازیون، پین قرمز = گران، پین آبی = عادی
        color = "blue"
        if p.price_total:
            if p.price_total < 5000000000: color = "green"
            elif p.price_total > 15000000000: color = "red"

        map_items.append({
            "id": p.id,
            "title": p.title,
            "neighborhood": p.neighborhood,
            "price": f"{int(p.price_total):,} تومان" if p.price_total else "توافقی",
            "type": p.deal_type,
            "color": color
        })
        
    return {"status": "success", "data": map_items}

# ==========================================
# 🖼️ تابع جادویی واترمارک اتوماتیک روی عکس‌ها
# ==========================================
def add_watermark(image_path: str, text: str = "EstateMind AI CRM"):
    try:
        from PIL import Image, ImageDraw, ImageFont
        # باز کردن عکس اصلی
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        
        # ساخت یک لایه شفاف برای واترمارک
        txt_layer = Image.new('RGBA', img.size, (255,255,255,0))
        draw = ImageDraw.Draw(txt_layer)
        
        # تنظیم فونت (اگر فونت نبود، از پیش‌فرض استفاده میکنه)
        try: font = ImageFont.truetype("app/static/Vazirmatn-Regular.ttf", int(width/20))
        except: font = ImageFont.load_default()
        
        # محاسبه سایز متن برای قرار دادن در مرکز متمایل به پایین
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
        
        x = (width - text_w) / 2
        y = height - text_h - 50
        
        # رسم متن با رنگ سفید و سایه مشکی (نیمه شفاف)
        draw.text((x+2, y+2), text, font=font, fill=(0, 0, 0, 128)) # سایه
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 180)) # متن اصلی
        
        # ترکیب لایه واترمارک با عکس اصلی
        watermarked = Image.alpha_composite(img, txt_layer)
        
        # ذخیره مجدد عکس
        watermarked.convert("RGB").save(image_path, "JPEG", quality=90)
    except Exception as e:
        print(f"Watermark Error: {e}")

# ==========================================
# 📸 API آپلود ویدیو و عکس + اعمال واترمارک
# ==========================================
os.makedirs("uploads/properties", exist_ok=True)

@router.post("/{property_id}/upload-media")
async def upload_property_media(property_id: int, request: Request, file: UploadFile = File(...), session: Session = Depends(get_session)):
    """API قدرتمند آپلود عکس و فیلم (MP4)"""
    user = get_current_user_local(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404)
    
    # اطمینان از وجود پوشه ذخیره‌سازی
    os.makedirs("uploads/properties", exist_ok=True)
    
    file_ext = file.filename.split(".")[-1].lower()
    import random
    file_name = f"prop_{prop.id}_{random.randint(10000,99999)}.{file_ext}"
    file_path = f"uploads/properties/{file_name}"
    
    # ذخیره امن فایل
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # ثبت مسیر در دیتابیس
    import json
    current_media = []
    if hasattr(prop, 'image_urls') and prop.image_urls:
        try: current_media = json.loads(prop.image_urls)
        except: pass
        
    current_media.append(f"/{file_path}")
    prop.image_urls = json.dumps(current_media)
    session.commit()
    
    return {"status": "success", "url": f"/{file_path}"}

# ==========================================
# ✏️ API ویرایش اطلاعات فایل
# ==========================================
@router.put("/{property_id}/edit")
def edit_and_sync_property(property_id: int, req_data: PropertyEditRequest, request: Request, session: Session = Depends(get_session)):
    """API ویرایش با رفع باگ احراز هویت"""
    user = get_current_user_local(request, session) # <--- باگ اینجا بود، فیکس شد
    if not user: raise HTTPException(401)

    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(status_code=404)
    
    if req_data.title is not None: prop.title = req_data.title
    if req_data.price_total is not None: prop.price_total = req_data.price_total
    if req_data.owner_phone is not None: prop.owner_phone = req_data.owner_phone
    if req_data.ai_pros is not None: prop.ai_pros = req_data.ai_pros
    if req_data.ai_cons is not None: prop.ai_cons = req_data.ai_cons
    if req_data.publisher is not None: prop.publisher = req_data.publisher
    if req_data.image_urls is not None: prop.image_urls = json.dumps(req_data.image_urls)
    
    session.commit()
    return {"message": "ویرایش با موفقیت انجام شد."}

@router.get("/{property_id}/match-buyers")
def match_buyers_for_property(property_id: int, request: Request, session: Session = Depends(get_session)):
    """پیدا کردن خریدارانی که بودجه‌شان به این ملک می‌خورد"""
    from app.core.auth import get_user_from_request
    user = get_user_from_request(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404)
    
    # پیدا کردن مشتریان آژانس که بودجه‌شون از قیمت ملک بیشتره یا توافقیه
    clients = session.exec(select(Client).where(Client.agency_id == user.agency_id)).all()
    matches = []
    for c in clients:
        if c.budget_limit >= prop.price_total or c.budget_limit == 0:
            matches.append({"id": c.id, "name": c.name, "phone": c.phone, "budget": c.budget_limit})
            
    return {"status": "success", "matches": matches[:5]} # ارسال ۵ خریدار برتر

@router.delete("/{property_id}")
def delete_property(property_id: int, request: Request, session: Session = Depends(get_session)):
    """API حذف فایل"""
    user = get_current_user_local(request, session)
    if not user or user.role not in ["MANAGER", "SUPER_ADMIN"]: 
        raise HTTPException(status_code=403, detail="عدم دسترسی")
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(status_code=404)
    
    session.delete(prop)
    session.commit()
    return {"status": "success"}

@router.get("/{property_id}")
def get_property_details(property_id: int, session: Session = Depends(get_session)):
    """API دریافت جزئیات یک فایل برای نمایش در فرم ویرایش"""
    prop = session.get(Property, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="فایل یافت نشد")
    return prop

# --- اضافه کردن روت تولید هوشمند مزایا و معایب ---
@router.post("/{property_id}/generate-ai-details")
def generate_ai_details(property_id: int, session: Session = Depends(get_session)):
    """تحلیل فایل ثبت شده دستی توسط هوش مصنوعی و تولید مزایا و معایب"""
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404)
    
    # ساخت یک متن ترکیبی برای ارسال به هوش مصنوعی
    raw_text = f"ملک {prop.title} در محله {prop.neighborhood} با متراژ {prop.built_area} و {prop.rooms} خواب. قیمت {prop.price_total}. {prop.description}"
    
    from app.services.ai_engine import analyze_property_text
    ai_data = analyze_property_text(raw_text, prop.neighborhood)
    
    prop.ai_pros = ai_data.get("ai_pros", "موقعیت مکانی مناسب و نورگیری خوب.")
    prop.ai_cons = ai_data.get("ai_cons", "نیاز به بررسی دقیق‌تر سن بنا.")
    session.commit()
    
    return {"status": "success", "pros": prop.ai_pros, "cons": prop.ai_cons}

class PublicPropertyCreateRequest(BaseModel):
    agency_id: int
    title: str
    property_type: str
    deal_type: str
    neighborhood: str
    built_area: float
    price_total: float
    owner_name: str
    owner_phone: str
    description: str

@router.post("/public-save")
def save_property_from_owner(data: PublicPropertyCreateRequest, session: Session = Depends(get_session)):
    """API ذخیره فایل مستقیم توسط صاحب ملک (بدون نیاز به احراز هویت)"""
    try:
        p_type = PropertyType.APARTMENT
        if data.property_type == "villa": p_type = PropertyType.VILLA
        elif data.property_type == "land": p_type = PropertyType.LAND

        d_type = DealType.SALE
        if data.deal_type == "rent": d_type = DealType.RENT
        
        new_property = Property(
            agency_id=data.agency_id, 
            title=data.title,
            property_type=p_type,
            deal_type=d_type,
            city="مشهد", # پیش‌فرض یا گرفتن از فرم
            neighborhood=data.neighborhood,
            built_area=data.built_area,
            price_total=data.price_total,
            owner_name=data.owner_name,
            owner_phone=data.owner_phone,
            description=f"ثبت شده توسط مالک از طریق فرم آنلاین:\n{data.description}",
            is_exclusive=True, # فایلی که مالک مستقیم میده معمولا شخصیه
            status="active",
            publisher="مالک (ثبت آنلاین)"
        )
        
        session.add(new_property)
        session.commit()
        return {"status": "success", "message": "ملک شما با موفقیت در سیستم آژانس ثبت شد."}
    except Exception as e:
        print(f"❌ Owner Submit Error: {e}")
        raise HTTPException(status_code=500, detail="خطا در ثبت اطلاعات")

@router.get("/list")
def get_properties_list(request: Request, session: Session = Depends(get_session)):
    """API اختصاصی برای ارسال لیست فایل‌ها به اپلیکیشن موبایل"""
    user = get_current_user_api(request, session)
    if not user: 
        raise HTTPException(status_code=401, detail="باید لاگین باشید")
    
    # فیلتر امنیتی: مدیر همه را می‌بیند، مشاور فقط فایل‌های خودش و عمومی‌ها را
    if user.role in ["SUPER_ADMIN", "MANAGER"]:
        props = session.exec(select(Property).where(Property.agency_id == user.agency_id).order_by(Property.id.desc())).all()
    else:
        from sqlmodel import or_
        props = session.exec(
            select(Property)
            .where(Property.agency_id == user.agency_id)
            .where(or_(Property.created_by_id == user.id, Property.is_exclusive == False))
            .order_by(Property.id.desc())
        ).all()

from app.services.ai_engine import virtual_staging_api

@router.post("/{property_id}/virtual-stage")
def perform_virtual_staging(property_id: int, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_local(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop or not prop.image_urls or prop.image_urls == "[]":
        raise HTTPException(400, "ملک عکسی برای دکور شدن ندارد.")
        
    import json
    images = json.loads(prop.image_urls)
    first_image_path = images[0].lstrip("/") # گرفتن اولین عکس
    
    # اجرای چیدمان مجازی
    staged_image = virtual_staging_api(first_image_path)
    
    # اضافه کردن عکس دکور شده به گالری
    images.append(f"/{staged_image}?staged=true")
    prop.image_urls = json.dumps(images)
    session.commit()
    
    return {"status": "success", "message": "چیدمان مجازی با موفقیت انجام شد."}

@router.get("/trash-list")
def get_trash_properties(request: Request, session: Session = Depends(get_session)):
    """دریافت فایل‌های زباله‌دان"""
    from app.core.security import get_current_user_api
    user = get_current_user_api(request, session)
    props = session.exec(select(Property).where(Property.agency_id == user.agency_id, Property.status == "trash").order_by(Property.id.desc())).all()
    return {"status": "success", "properties": props}

@router.put("/{property_id}/trash")
def move_to_trash(property_id: int, request: Request, session: Session = Depends(get_session)):
    """انتقال فایل به زباله‌دان (Soft Delete)"""
    user = get_current_user_local(request, session)
    if not user: raise HTTPException(401)
    prop = session.get(Property, property_id)
    if prop:
        prop.status = "trash"
        session.commit()
    return {"status": "success"}

@router.put("/{property_id}/restore")
def restore_property(property_id: int, request: Request, session: Session = Depends(get_session)):
    """بازگردانی فایل از زباله‌دان به لیست فعال"""
    user = get_current_user_local(request, session)
    if not user: raise HTTPException(401)
    prop = session.get(Property, property_id)
    if prop:
        prop.status = "active"
        session.commit()
    return {"status": "success"}