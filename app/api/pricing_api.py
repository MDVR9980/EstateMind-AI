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

class PriceAnalysisRequest(BaseModel):
    property_id: int
    neighborhood: str
    built_area: float
    rooms: int
    age: int
    has_elevator: bool = False
    has_parking: bool = False
    has_store_room: bool = False
    property_type: str = "apartment"
    deal_type: str = "sale"

@router.post("/analyze")
def analyze_property_price(data: PriceAnalysisRequest, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)

    comparables = session.exec(
        select(Property)
        .where(Property.neighborhood == data.neighborhood)
        .where(Property.status == "active")
        .where(Property.id != data.property_id)
        .limit(10)
    ).all()

    price_per_meter = []
    for prop in comparables:
        if prop.built_area and prop.built_area > 0 and prop.price_total and prop.price_total > 0:
            price_per_meter.append(prop.price_total / prop.built_area)

    avg_price_per_meter = sum(price_per_meter) / len(price_per_meter) if price_per_meter else 0

    adjustment = 0
    if data.has_elevator: adjustment += 0.05
    if data.has_parking: adjustment += 0.03
    if data.has_store_room: adjustment += 0.02

    age_depreciation = min(data.age * 0.01, 0.3) 

    suggested_price = avg_price_per_meter * data.built_area * (1 + adjustment - age_depreciation)

    ai_conclusion = ""
    if comparables:
        comps_data = [{"title": c.title, "price": c.price_total, "area": c.built_area} for c in comparables[:5]]
        ai_conclusion = generate_smart_comparison("ملک هدف", suggested_price, data.built_area, comps_data)

    return {
        "status": "success",
        "suggested_price": round(suggested_price, 0),
        "price_range": {
            "min": round(suggested_price * 0.9, 0),
            "max": round(suggested_price * 1.1, 0)
        },
        "price_per_meter": round(avg_price_per_meter, 0),
        "comparables_count": len(comparables),
        "ai_conclusion": ai_conclusion
    }