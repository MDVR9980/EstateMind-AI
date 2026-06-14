# مسیر فایل: app/core/database.py

import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

# لود کردن متغیرهای محیطی از فایل .env
load_dotenv()

# خواندن آدرس دیتابیس (اگر نبود، دیتابیس محلی estatemind.db را می‌سازد)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///estatemind.db")

# تنظیمات مخصوص SQLite برای جلوگیری از خطاهای Multi-threading
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# ساخت موتور دیتابیس
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def create_db_and_tables():
    """ساخت تمام جداول در دیتابیس در زمان بالا آمدن سرور"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """تولید یک سشن (نشست) جدید برای هر درخواست کاربر"""
    with Session(engine) as session:
        yield session