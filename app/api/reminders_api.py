from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from datetime import datetime
from app.core.database import get_session
from app.core.models import Reminder

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

class ReminderCreateRequest(BaseModel):
    title: str
    description: str
    client_id: int = 0
    remind_date: str # فرمت: YYYY-MM-DDTHH:MM

@router.post("/add")
def add_reminder(data: ReminderCreateRequest, session: Session = Depends(get_session)):
    try:
        # تبدیل رشته تاریخ به فرمت استاندارد دیتابیس
        dt_obj = datetime.strptime(data.remind_date, "%Y-%m-%dT%H:%M")
        
        new_reminder = Reminder(
            user_id=1, # فعلا مشاور تستی ۱
            client_id=data.client_id if data.client_id > 0 else None,
            title=data.title,
            description=data.description,
            remind_date=dt_obj
        )
        
        session.add(new_reminder)
        session.commit()
        return {"status": "success", "message": "یادآور با موفقیت ثبت شد!"}
    except Exception as e:
        print(f"❌ Error adding reminder: {e}")
        raise HTTPException(status_code=500, detail="خطا در ذخیره یادآور")

@router.put("/{reminder_id}/complete")
def complete_reminder(reminder_id: int, session: Session = Depends(get_session)):
    reminder = session.get(Reminder, reminder_id)
    if reminder:
        reminder.is_completed = True
        session.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="یادآور یافت نشد")