import io
import os
from datetime import datetime
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display
import jdatetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Deal, Client, Property, FunnelStage, User, AgentMonthlyCommission
import jwt
from app.core.security import SECRET_KEY, ALGORITHM, get_current_user_api

router = APIRouter(prefix="/api/deals", tags=["Deals"])

class DealCreateRequest(BaseModel):
    client_id: int
    property_id: int
    deal_type: str
    deal_price: float
    commission_amount: float

@router.post("/add")
def add_deal(data: DealCreateRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401, detail="باید لاگین باشید")
    try:
        new_deal = Deal(
            agency_id=user.agency_id,
            user_id=user.id,
            client_id=data.client_id,
            property_id=data.property_id,
            deal_type=data.deal_type,
            deal_price=data.deal_price,
            commission_amount=data.commission_amount
        )
        session.add(new_deal)

        client = session.get(Client, data.client_id)
        if client:
            client.funnel_stage = FunnelStage.WON
            session.add(client)

        property_obj = session.get(Property, data.property_id)
        if property_obj:
            property_obj.status = "archived"
            session.add(property_obj)

        session.commit()
        return {"status": "success", "message": "قرارداد ثبت شد."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="خطا در ذخیره قرارداد")

FONT_PATH = "app/static/Vazirmatn-Regular.ttf"

def persian_text(text):
    reshaped_text = arabic_reshaper.reshape(str(text))
    return get_display(reshaped_text)

@router.get("/{deal_id}/contract-pdf")
def generate_deal_contract_pdf(deal_id: int, session: Session = Depends(get_session)):
    deal = session.get(Deal, deal_id)
    if not deal: raise HTTPException(status_code=404)
    
    client = session.get(Client, deal.client_id)
    property_obj = session.get(Property, deal.property_id) if deal.property_id else None
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    width, height = 595, 842
    
    try:
        pdfmetrics.registerFont(TTFont('Vazir', FONT_PATH))
        c.setFont("Vazir", 14)
    except: pass

    c.setStrokeColorRGB(0.1, 0.7, 0.5)
    c.setLineWidth(2)
    c.rect(30, 30, width-60, height-60)

    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 24)
    c.drawCentredString(width/2, height - 80, persian_text("رسید ثبت اولیه قرارداد معامله"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 50, height - 140, persian_text(f"کد رهگیری: #{deal.id}"))
    shamsi_date = jdatetime.datetime.fromgregorian(datetime=deal.deal_date).strftime("%Y/%m/%d")
    c.drawString(50, height - 140, persian_text(f"تاریخ: {shamsi_date}"))
    c.line(50, height - 150, width - 50, height - 150)

    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 16)
    c.drawRightString(width - 50, height - 200, persian_text("مشخصات مشتری:"))
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 70, height - 230, persian_text(f"نام: {client.name if client else ''}"))
    c.drawRightString(width - 70, height - 260, persian_text(f"تلفن: {client.phone if client else ''}"))

    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 16)
    c.drawRightString(width - 50, height - 310, persian_text("مشخصات ملک:"))
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 70, height - 340, persian_text(f"عنوان: {property_obj.title if property_obj else 'دستی'}"))
    
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 16)
    c.drawRightString(width - 50, height - 420, persian_text("اطلاعات مالی:"))
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica", 14)
    c.drawRightString(width - 70, height - 450, persian_text(f"نوع: {deal.deal_type}"))
    c.drawRightString(width - 70, height - 480, persian_text(f"مبلغ کل: {int(deal.deal_price):,} تومان"))
    
    c.line(50, 150, width - 50, 150)
    c.setFont("Vazir" if os.path.exists(FONT_PATH) else "Helvetica-Bold", 14)
    c.drawRightString(width - 80, 100, persian_text("امضا مشتری"))
    c.drawString(100, 100, persian_text("مهر آژانس"))

    c.save()
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Contract_{deal.id}.pdf"})

class MonthlyCommissionRequest(BaseModel):
    year_month: str

@router.post("/calculate-monthly")
def calculate_monthly_commissions(data: MonthlyCommissionRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user or user.role not in ["MANAGER", "SUPER_ADMIN"]: raise HTTPException(403)
    
    deals = session.exec(select(Deal).where(Deal.agency_id == user.agency_id)).all()
    month_deals = [d for d in deals if d.deal_date.strftime("%Y-%m") == data.year_month]
    
    agent_commissions = {}
    for deal in month_deals:
        agent_id = deal.user_id
        if agent_id not in agent_commissions:
            agent = session.get(User, agent_id)
            agent_commissions[agent_id] = {
                "total_deals": 0, "total_value": 0, "total_commission": 0, 
                "agent_share_amount": 0, "office_share_amount": 0, "agent_ref": agent
            }
        
        agent_obj = agent_commissions[agent_id]["agent_ref"]
        
        # 🌟 استخراج درصد داینامیک بر اساس نوع قرارداد
        rate = 0.5
        if agent_obj:
            if "فروش" in deal.deal_type: rate = agent_obj.commission_sale
            elif "اجاره" in deal.deal_type: rate = agent_obj.commission_rent
            elif "مشارکت" in deal.deal_type: rate = agent_obj.commission_partnership
            
        a_share = deal.commission_amount * rate
        o_share = deal.commission_amount * (1 - rate)
            
        agent_commissions[agent_id]["total_deals"] += 1
        agent_commissions[agent_id]["total_value"] += deal.deal_price
        agent_commissions[agent_id]["total_commission"] += deal.commission_amount
        agent_commissions[agent_id]["agent_share_amount"] += a_share
        agent_commissions[agent_id]["office_share_amount"] += o_share

    for agent_id, c_data in agent_commissions.items():
        existing = session.exec(select(AgentMonthlyCommission).where(AgentMonthlyCommission.user_id == agent_id, AgentMonthlyCommission.year_month == data.year_month)).first()
        
        if existing:
            existing.total_deals = c_data["total_deals"]
            existing.total_deal_value = c_data["total_value"]
            existing.total_commission = c_data["total_commission"]
            existing.agent_share = c_data["agent_share_amount"]
            existing.office_share = c_data["office_share_amount"]
        else:
            new_record = AgentMonthlyCommission(
                user_id=agent_id, agency_id=user.agency_id, year_month=data.year_month, 
                total_deals=c_data["total_deals"], total_deal_value=c_data["total_value"], 
                total_commission=c_data["total_commission"], 
                agent_share=c_data["agent_share_amount"], office_share=c_data["office_share_amount"]
            )
            session.add(new_record)

    session.commit()
    return {"status": "success", "message": "محاسبات کمیسیون آپدیت شد."}

@router.get("/app-financials")
def get_financials_for_app(request: Request, session: Session = Depends(get_session)):
    """API دریافت گزارشات مالی و کمیسیون‌ها مخصوص موبایل"""
    from app.core.security import get_current_user_api
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    
    if user.role in ["SUPER_ADMIN", "MANAGER"]:
        deals = session.exec(select(Deal).where(Deal.agency_id == user.agency_id).order_by(Deal.id.desc())).all()
    else:
        deals = session.exec(select(Deal).where(Deal.user_id == user.id).order_by(Deal.id.desc())).all()
        
    total_revenue = sum(d.commission_amount for d in deals) if deals else 0
    
    # 👈 محاسبه پویای سهم مشاور بر اساس نوع هر قرارداد جهت جلوگیری از ارور
    agent_share = 0
    for d in deals:
        rate = 0.5  # مقدار پیش‌فرض ۵۰ درصد
        if "فروش" in d.deal_type:
            rate = getattr(user, 'commission_sale', 0.5)
        elif "اجاره" in d.deal_type:
            rate = getattr(user, 'commission_rent', 0.5)
        elif "مشارکت" in d.deal_type:
            rate = getattr(user, 'commission_partnership', 0.5)
        agent_share += d.commission_amount * rate

    office_share = total_revenue - agent_share
    
    deals_data = []
    for d in deals[:10]:
        deals_data.append({
            "id": d.id,
            "type": d.deal_type,
            "price": d.deal_price,
            "commission": d.commission_amount,
            "date": d.deal_date.strftime('%Y-%m-%d')
        })
        
    return {
        "status": "success",
        "stats": {
            "total_revenue": total_revenue,
            "agent_share": agent_share,
            "office_share": office_share
        },
        "recent_deals": deals_data
    }