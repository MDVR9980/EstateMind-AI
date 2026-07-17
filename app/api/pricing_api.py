from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional
from app.core.database import get_session
from app.core.models import Property, User
from app.services.ai_engine import generate_smart_comparison
import jwt
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/pricing", tags=["Smart Pricing"])

def get_current_user_api(request: Request, session: Session):
    token = request.cookies.get("access_token")
    if not token: return None
    try:
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        return session.exec(select(User).where(User.username == payload.get("sub"))).first()
    except: return None

@router.get("/analyze/{property_id}")
def analyze_property_price(property_id: int, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)

    target_prop = session.get(Property, property_id)
    if not target_prop: raise HTTPException(status_code=404, detail="فایل یافت نشد")

    # پیدا کردن فایل‌های مشابه در همان محله
    comparables = session.exec(
        select(Property)
        .where(Property.neighborhood == target_prop.neighborhood)
        .where(Property.property_type == target_prop.property_type)
        .where(Property.id != target_prop.id)
        .limit(10)
    ).all()

    price_per_meter = []
    for prop in comparables:
        if prop.built_area and prop.built_area > 0 and prop.price_total and prop.price_total > 0:
            price_per_meter.append(prop.price_total / prop.built_area)

    # اگر فایل مشابهی نبود، قیمت خود فایل را پایه قرار می‌دهیم
    avg_price_per_meter = sum(price_per_meter) / len(price_per_meter) if price_per_meter else (target_prop.price_total / target_prop.built_area if target_prop.built_area else 0)

    # تاثیر امکانات روی قیمت
    adjustment = 0
    if target_prop.has_elevator: adjustment += 0.05
    if target_prop.has_parking: adjustment += 0.03
    if target_prop.has_store_room: adjustment += 0.02

    age_depreciation = min((target_prop.age or 0) * 0.01, 0.3) 

    suggested_price = avg_price_per_meter * (target_prop.built_area or 0) * (1 + adjustment - age_depreciation)

    if suggested_price == 0:
        suggested_price = target_prop.price_total

    return {
        "status": "success",
        "property_title": target_prop.title,
        "owner_price": target_prop.price_total,
        "suggested_price": round(suggested_price, 0),
        "scenarios": {
            "conservative": {"price": round(suggested_price * 0.9, 0), "days": "۵ الی ۱۰ روز (فروش فوری)"},
            "market": {"price": round(suggested_price, 0), "days": "۱۵ الی ۳۰ روز (نرمال)"},
            "aggressive": {"price": round(suggested_price * 1.15, 0), "days": "بیش از ۶۰ روز (احتمال رسوب)"}
        }
    }