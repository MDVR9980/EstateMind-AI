import os
import shutil
from fastapi import (
    Request, APIRouter, Depends,
    HTTPException, File, UploadFile, Form,
)
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.models import UploadedForm

router = APIRouter(prefix="/api/forms", tags=["Forms"])

# اطمینان از وجود پوشه برای ذخیره فایل‌ها
os.makedirs("uploads/forms", exist_ok=True)

@router.post("/upload")
async def upload_form(request: Request, title: str = Form(...), file: UploadFile = File(...), session: Session = Depends(get_session)):
    """API آپلود فایل و ذخیره آدرس آن در دیتابیس"""
    
    user = get_current_user_api(request, session)

    try:
        # ساخت مسیر ذخیره فایل
        file_path = f"uploads/forms/{file.filename}"
        
        # ذخیره فایل در هارد سرور
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # ذخیره اطلاعات در دیتابیس
        new_form = UploadedForm(agency_id=user.agency_id, title=title, file_path=file_path)
        session.add(new_form)
        session.commit()
        
        return {"status": "success", "message": "فرم با موفقیت به زونکن اضافه شد."}
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail="خطا در آپلود فایل")
    
@router.get("/app-list")
def get_forms_for_app(request: Request, session: Session = Depends(get_session)):
    from app.core.security import get_current_user_api
    user = get_current_user_api(request, session)
    if not user: raise HTTPException(status_code=401)
    
    forms = session.exec(select(UploadedForm).where(UploadedForm.agency_id == user.agency_id).order_by(UploadedForm.id.desc())).all()
    return {"status": "success", "forms": forms}