import io
import os
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display
import jdatetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Deal, Client, Property, FunnelStage

router = APIRouter(prefix="/api/deals", tags=["Deals"])

class DealCreateRequest(BaseModel):
    client_id: int
    property_id: int
    deal_type: str
    deal_price: float
    commission_amount: float

@router.post("/add")
def add_deal(data: DealCreateRequest, session: Session = Depends(get_session)):
    """API ثبت قرارداد جدید و محاسبه کمیسیون در سیستم"""
    try:
        # ۱. ساخت رکورد قرارداد
        new_deal = Deal(
            agency_id=1, # فعلاً آژانس تستی
            user_id=1,   # فعلاً مشاور تستی
            client_id=data.client_id,
            property_id=data.property_id,
            deal_type=data.deal_type,
            deal_price=data.deal_price,
            commission_amount=data.commission_amount
        )
        session.add(new_deal)

        # ۲. آپدیت هوشمندانه وضعیت مشتری در قیف فروش (انتقال به 'قرارداد موفق')
        client = session.get(Client, data.client_id)
        if client:
            client.funnel_stage = FunnelStage.WON
            session.add(client)

        # ۳. تغییر وضعیت فایل ملک به 'فروخته/اجاره شده' (آرشیو)
        property_obj = session.get(Property, data.property_id)
        if property_obj:
            property_obj.status = "archived"
            session.add(property_obj)

        session.commit()
        return {"status": "success", "message": "قرارداد ثبت شد و کمیسیون به داشبورد مالی اضافه گردید."}
        
    except Exception as e:
        print(f"❌ Error in Deal API: {e}")
        raise HTTPException(status_code=500, detail="خطا در ذخیره اطلاعات قرارداد")
    
FONT_PATH = "app/static/Vazirmatn-Regular.ttf"

def persian_text(text):
    """تابع تبدیل متن فارسی برای چاپ در PDF (رفع مشکل برعکس نوشته شدن)"""
    reshaped_text = arabic_reshaper.reshape(str(text))
    bidi_text = get_display(reshaped_text)
    return bidi_text

@router.get("/{deal_id}/contract-pdf")
def generate_deal_contract_pdf(deal_id: int, session: Session = Depends(get_session)):
    deal = session.get(Deal, deal_id)
    if not deal: raise HTTPException(status_code=404, detail="معامله یافت نشد")
    
    client = session.get(Client, deal.client_id)
    property_obj = session.get(Property, deal.property_id) if deal.property_id else None
    
    # تنظیمات ساخت PDF در مموری
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    width, height = 595, 842 # ابعاد A4

    # اگر فونت وزیرمتن را دانلود و در مسیر گذاشتی، این بخش کار میکند. در غیر اینصورت خطا را رد میکند.
    try:
        pdfmetrics.registerFont(TTFont('Vazir', FONT_PATH))
        c.setFont("Vazir", 14)
    except: pass # فونت پیدا نشد، از پیش فرض استفاده کن

    # --- طراحی هدر قرارداد ---
    c.setStrokeColorRGB(0.1, 0.7, 0.5) # سبز
    c.setLineWidth(2)
    c.rect(30, 30, width-60, height-60) # کادر دور
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 80, persian_text("رسید ثبت اولیه قرارداد معامله"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 50, height - 140, persian_text(f"کد رهگیری سیستم: #{deal.id}"))
    shamsi_date = jdatetime.datetime.fromgregorian(datetime=deal.deal_date).strftime("%Y/%m/%d - %H:%M")
    c.drawString(50, height - 140, persian_text(f"تاریخ ثبت: {shamsi_date}"))
    
    c.line(50, height - 150, width - 50, height - 150) # خط جداکننده

    # --- مشخصات طرفین و ملک ---
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 16)
    c.drawRightString(width - 50, height - 200, persian_text("مشخصات طرف اول (مشتری):"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 70, height - 230, persian_text(f"نام و نام خانوادگی: {client.name if client else 'نامشخص'}"))
    c.drawRightString(width - 70, height - 260, persian_text(f"شماره تماس: {client.phone if client else 'نامشخص'}"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 16)
    c.drawRightString(width - 50, height - 310, persian_text("مشخصات ملک مورد معامله:"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    prop_title = property_obj.title if property_obj else "بدون فایل سیستم (ثبت دستی)"
    prop_hood = property_obj.neighborhood if property_obj else "نامشخص"
    c.drawRightString(width - 70, height - 340, persian_text(f"عنوان ملک: {prop_title}"))
    c.drawRightString(width - 70, height - 370, persian_text(f"محله: {prop_hood}"))
    
    # --- مشخصات مالی ---
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 16)
    c.drawRightString(width - 50, height - 420, persian_text("اطلاعات مالی معامله:"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 70, height - 450, persian_text(f"نوع قرارداد: {deal.deal_type}"))
    c.drawRightString(width - 70, height - 480, persian_text(f"ارزش کل معامله: {int(deal.deal_price):,} تومان"))
    if deal.rent_price > 0:
        c.drawRightString(width - 70, height - 510, persian_text(f"مبلغ اجاره ماهیانه: {int(deal.rent_price):,} تومان"))
    
    c.line(50, 150, width - 50, 150) # خط جداکننده پایین
    
    # --- امضاها ---
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 14)
    c.drawRightString(width - 80, 100, persian_text("امضا و اثر انگشت مشتری"))
    c.drawString(100, 100, persian_text("امضا و مهر مدیریت آژانس"))

    c.save()
    buffer.seek(0)
    
    # نام فایل دانلودی
    file_name = f"Contract_{deal.id}_{shamsi_date.replace('/', '-')}.pdf"
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={file_name}"}
    )