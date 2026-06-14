from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from app.core.database import get_session
from app.core.models import Ticket, TicketStatus

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

class TicketCreateRequest(BaseModel):
    subject: str
    message: str

@router.post("/add")
def add_ticket(data: TicketCreateRequest, session: Session = Depends(get_session)):
    """API ثبت تیکت جدید در سیستم پشتیبانی"""
    try:
        new_ticket = Ticket(
            user_id=1, # فعلاً یوزر ادمین پیش‌فرض
            subject=data.subject,
            message=data.message,
            status=TicketStatus.PENDING
        )
        session.add(new_ticket)
        session.commit()
        
        return {"status": "success", "message": "تیکت شما با موفقیت ثبت شد."}
    except Exception as e:
        print(f"❌ Error adding ticket: {e}")
        raise HTTPException(status_code=500, detail="خطا در ثبت تیکت")