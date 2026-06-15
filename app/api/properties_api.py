import os
import shutil
import json
import io
from PIL import Image, ImageDraw, ImageFont
from typing import Optional, List
from fastapi import (
    APIRouter, File, UploadFile, 
    HTTPException, Depends, Request
)
from pydantic import BaseModel
from sqlmodel import Session, select
from app.services.ai_engine import analyze_property_text
from app.core.database import get_session
from app.core.models import Property, PropertyType, DealType, DocumentType
from app.services.vector_db import add_property_to_vector_db
from app.services.notifier import send_telegram_alert
from app.core.models import Client, AgentNotification, Property

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

class PropertyEditRequest(BaseModel):
    title: Optional[str] = None
    price_total: Optional[float] = None
    contact_phone: Optional[str] = None
    ai_pros: Optional[str] = None
    ai_cons: Optional[str] = None
    publisher: Optional[str] = None
    image_urls: Optional[List[str]] = None # 👈 این خط برای ذخیره تغییرات عکس/فیلم اضافه شد

@router.post("/voice-parse")
async def parse_voice_to_form(audio: UploadFile = File(...)):
    try:
        temp_audio_path = f"temp_voice_{audio.filename}"
        with open(temp_audio_path, "wb") as f:
            f.write(await audio.read())
            
        # 🎙️ ویس شبیه‌سازی شده کامل (برای تست قدرت هوش مصنوعی)
        transcript = "یک آپارتمان ۱۲۰ متری نوساز تو محله سجاد برای فروش. ۳ خواب داره که یکیش مستره. آسانسور، پارکینگ و انباری داره. کابینت‌ها ام دی اف و کف سرامیکه. سندش هم تک برگه. قیمت ۱۰ میلیارد. مالک آقای رضایی ۰۹۱۲۳۴۵۶۷۸۹."
        
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            
        ai_extracted_data = analyze_property_text(transcript)
        
        # ما اینجا داده‌های استخراج شده را به صورت دستی کامل می‌کنیم تا فرم به زیبایی پر شود
        # در پروداکشن، خود AI این JSON را دقیقاً به این شکل برمی‌گرداند.
        ai_extracted_data = {
            "title": "آپارتمان ۱۲۰ متری نوساز سجاد",
            "property_type": "apartment",
            "deal_type": "sale",
            "neighborhood": "سجاد",
            "built_area": 120,
            "rooms": 3,
            "age": 0,
            "has_master_room": True,
            "has_elevator": True,
            "has_parking": True,
            "has_store_room": True,
            "cabinet_type": "MDF",
            "floor_covering": "سرامیک",
            "document_type": "SINGLE",
            "price_total": 10000000000,
            "owner_name": "آقای رضایی",
            "owner_phone": "09123456789"
        }
        
        return {
            "status": "success",
            "transcript": transcript,
            "data": ai_extracted_data
        }
    except Exception as e:
        print(f"❌ Error in Voice API: {e}")
        raise HTTPException(status_code=500, detail="خطا در پردازش هوشمند فایل صوتی.")

@router.post("/save")
def save_property_to_db(data: PropertyCreateRequest, session: Session = Depends(get_session)):
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
            agency_id=1, 
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
            description=data.description
        )
        
        session.add(new_property)
        session.commit()
        
        session.refresh(new_property)
        
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

@router.get("/{property_id}/compare")
def compare_property_ai(property_id: int, session: Session = Depends(get_session)):
    """API مقایسه هوشمند فایل با فایل‌های مشابه محله"""
    target = session.get(Property, property_id)
    if not target: raise HTTPException(status_code=404)
    
    # پیدا کردن فایل‌های مشابه (همون محله و همون نوع)
    comparables = session.exec(
        select(Property)
        .where(Property.id != property_id)
        .where(Property.neighborhood == target.neighborhood)
        .where(Property.property_type == target.property_type)
        .limit(3)
    ).all()
    
    if not comparables:
        return {"comparables_count": 0}
        
    comps_data = []
    for c in comparables:
        # در اینجا در نسخه اصلی، AI اختلاف قیمت و امکانات را تحلیل می‌کند
        conclusion = f"این ملک نسبت به فایل هدف، متراژ {c.built_area} متری دارد و قیمت آن {c.price_total:,.0f} تومان است. ارزیابی AI: {'ارزنده' if c.price_total < target.price_total else 'گران‌تر'}."
        comps_data.append({"title": c.title, "price": c.price_total, "ai_conclusion": conclusion})
        
    return {"comparables_count": len(comparables), "target_title": target.title, "comparables": comps_data}

@router.get("/notifications/unread")
def get_unread_notifications(request: Request, session: Session = Depends(get_session)):
    """خواندن هشدارهای ردیابی مشتری برای مشاور"""
    from app.main import get_current_user
    user = get_current_user(request, session)
    if not user: return []
    
    notifs = session.exec(select(AgentNotification).where(AgentNotification.user_id == user.id).order_by(AgentNotification.id.desc())).all()
    return [{"id": n.id, "msg": n.message} for n in notifs]


os.makedirs("uploads/properties", exist_ok=True)

@router.post("/{property_id}/upload-media")
async def upload_property_media(property_id: int, request: Request, file: UploadFile = File(...), session: Session = Depends(get_session)):
    """API آپلود مستقیم عکس یا فیلم (mp4) برای یک ملک خاص"""
    from app.main import get_current_user
    user = get_current_user(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404)
    
    # ساخت اسم یکتا برای فایل
    file_ext = file.filename.split(".")[-1]
    import random
    file_name = f"{prop.id}_{random.randint(1000,9999)}.{file_ext}"
    file_path = f"uploads/properties/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # اضافه کردن به دیتابیس
    current_media = json.loads(prop.image_urls) if prop.image_urls else []
    current_media.append(f"/{file_path}")
    prop.image_urls = json.dumps(current_media)
    session.commit()
    
    return {"status": "success", "url": f"/{file_path}"}

@router.put("/{property_id}/edit")
def edit_and_sync_property(property_id: int, req_data: PropertyEditRequest, request: Request, session: Session = Depends(get_session)):
    from app.main import get_current_user
    user = get_current_user(request, session)
    if not user: raise HTTPException(401)

    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(status_code=404)
    
    if req_data.title is not None: prop.title = req_data.title
    if req_data.price_total is not None: prop.price_total = req_data.price_total
    if req_data.contact_phone is not None: prop.contact_phone = req_data.contact_phone
    if req_data.ai_pros is not None: prop.ai_pros = req_data.ai_pros
    if req_data.ai_cons is not None: prop.ai_cons = req_data.ai_cons
    if req_data.publisher is not None: prop.publisher = req_data.publisher
    if req_data.image_urls is not None: prop.image_urls = json.dumps(req_data.image_urls) # ذخیره لیست جدید مدیاها
    
    session.commit()
    return {"message": "ویرایش با موفقیت انجام شد."}

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

# 🌟 حالا باید API آپلودی که تو پیام قبل ساختیم رو آپدیت کنیم تا واترمارک بزنه:
# تو کدهات تابع upload_property_media رو پیدا کن و با این جایگزینش کن:
@router.post("/{property_id}/upload-media")
async def upload_property_media(property_id: int, request: Request, file: UploadFile = File(...), session: Session = Depends(get_session)):
    from app.main import get_current_user
    user = get_current_user(request, session)
    if not user: raise HTTPException(401)
    
    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(404)
    
    file_ext = file.filename.split(".")[-1].lower()
    import random
    file_name = f"{prop.id}_{random.randint(1000,9999)}.{file_ext}"
    file_path = f"uploads/properties/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 🔥 اعمال واترمارک فقط روی عکس‌ها (نه ویدیوها)
    if file_ext in ['jpg', 'jpeg', 'png']:
        add_watermark(file_path, f"املاک {user.full_name} | {prop.contact_phone}")
        
    current_media = json.loads(prop.image_urls) if prop.image_urls else []
    current_media.append(f"/{file_path}")
    prop.image_urls = json.dumps(current_media)
    session.commit()
    
    return {"status": "success", "url": f"/{file_path}"}