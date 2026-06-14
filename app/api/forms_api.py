import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import UploadedForm

router = APIRouter(prefix="/api/forms", tags=["Forms"])

# اطمینان از وجود پوشه برای ذخیره فایل‌ها
os.makedirs("uploads/forms", exist_ok=True)

@router.post("/upload")
async def upload_form(title: str = Form(...), file: UploadFile = File(...), session: Session = Depends(get_session)):
    """API آپلود فایل و ذخیره آدرس آن در دیتابیس"""
    try:
        # ساخت مسیر ذخیره فایل
        file_path = f"uploads/forms/{file.filename}"
        
        # ذخیره فایل در هارد سرور
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # ذخیره اطلاعات در دیتابیس
        new_form = UploadedForm(agency_id=1, title=title, file_path=file_path)
        session.add(new_form)
        session.commit()
        
        return {"status": "success", "message": "فرم با موفقیت به زونکن اضافه شد."}
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail="خطا در آپلود فایل")