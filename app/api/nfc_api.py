from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import Property, User
import jwt
from app.core.security import SECRET_KEY, ALGORITHM, get_current_user_api
import qrcode
import io
import json

router = APIRouter(prefix="/api/nfc", tags=["NFC & QR"])

@router.get("/generate-qr/{property_id}")
def generate_property_qr(property_id: int, request: Request, session: Session = Depends(get_session)):
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)

    prop = session.get(Property, property_id)
    if not prop: raise HTTPException(status_code=404)

    property_data = {
        "id": prop.id,
        "title": prop.title,
        "price": prop.price_total,
        "agent": user.full_name,
        "url": f"https://estatemind.ir/catalog/property/{prop.id}"
    }

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(json.dumps(property_data, ensure_ascii=False))
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/png", headers={"Content-Disposition": f"attachment; filename=qr_{property_id}.png"})