import os
import shutil
import random
import jwt
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Form
from pydantic import BaseModel
from sqlmodel import Session, select
from datetime import datetime
from app.core.database import get_session
from app.core.models import Ticket, TicketReply, TicketStatus, TicketPriority, User
from app.core.security import SECRET_KEY, ALGORITHM, get_current_user_api

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

os.makedirs("uploads/tickets", exist_ok=True)

class TicketCreateRequest(BaseModel):
    receiver_id: int
    subject: str
    message: str
    priority: str

class ReplyRequest(BaseModel):
    message: str

class StatusUpdateRequest(BaseModel):
    status: str

@router.get("/colleagues")
def get_colleagues(request: Request, session: Session = Depends(get_session)):
    """دریافت لیست همکاران داخل همان آژانس برای انتخاب گیرنده پیام"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    
    colleagues = session.exec(select(User).where(User.agency_id == user.agency_id, User.id != user.id)).all()
    return [{"id": c.id, "name": c.full_name, "role": getattr(c.role, 'value', c.role)} for c in colleagues]

@router.post("/add")
def create_ticket(request: Request, data: TicketCreateRequest, session: Session = Depends(get_session)):
    """ثبت مکاتبه سازمانی جدید"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    
    # تولید کد پیگیری رندوم مثل T-2026-00045
    t_code = f"T-2026-{random.randint(10000, 99999)}"
    
    # مپ کردن اولویت
    prio = TicketPriority.NORMAL
    if data.priority == "فوری": prio = TicketPriority.URGENT
    elif data.priority == "بالا": prio = TicketPriority.HIGH
    elif data.priority == "پایین": prio = TicketPriority.LOW

    # 1. ساخت بدنه اصلی تیکت
    new_ticket = Ticket(
        agency_id=user.agency_id,
        sender_id=user.id,
        receiver_id=data.receiver_id,
        ticket_code=t_code,
        subject=data.subject,
        priority=prio,
        status=TicketStatus.OPEN
    )
    session.add(new_ticket)
    session.commit()
    session.refresh(new_ticket)
    
    # 2. ثبت اولین پیام داخل تیکت
    first_reply = TicketReply(
        ticket_id=new_ticket.id,
        user_id=user.id,
        message=data.message
    )
    session.add(first_reply)
    session.commit()
    
    return {"status": "success", "ticket_code": t_code}

@router.post("/{ticket_id}/reply")
async def add_reply(
    ticket_id: int, 
    request: Request, 
    message: str = Form(...), 
    file: Optional[UploadFile] = File(None), 
    session: Session = Depends(get_session)
):
    """ثبت پاسخ (چت) و پیوست فایل در تیکت"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)

    ticket = session.get(Ticket, ticket_id)
    if not ticket or ticket.agency_id != user.agency_id: raise HTTPException(404)
    
    file_path = None
    if file:
        file_path = f"uploads/tickets/{ticket.id}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    reply = TicketReply(ticket_id=ticket.id, user_id=user.id, message=message, attachment_path=file_path)
    session.add(reply)
    
    # آپدیت وضعیت و زمان تیکت
    ticket.updated_at = datetime.utcnow()
    if user.id == ticket.receiver_id:
        ticket.status = TicketStatus.ANSWERED
    else:
        ticket.status = TicketStatus.PENDING
        
    session.commit()
    return {"status": "success"}

@router.put("/{ticket_id}/status")
def change_status(ticket_id: int, data: StatusUpdateRequest, request: Request, session: Session = Depends(get_session)):
    """تغییر وضعیت تیکت (باز، در حال بررسی، حل شده)"""
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)

    ticket = session.get(Ticket, ticket_id)
    if not ticket or ticket.agency_id != user.agency_id: raise HTTPException(404)
    
    status_map = {
        "باز": TicketStatus.OPEN,
        "در حال بررسی": TicketStatus.IN_PROGRESS,
        "در انتظار پاسخ": TicketStatus.PENDING,
        "حل شده": TicketStatus.RESOLVED
    }
    if data.status in status_map:
        ticket.status = status_map[data.status]
        session.commit()
        return {"status": "success"}
    raise HTTPException(400, "وضعیت نامعتبر")