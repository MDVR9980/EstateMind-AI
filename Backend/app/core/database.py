import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///estatemind.db")

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def create_db_and_tables():
    """ساخت تمام جداول در دیتابیس در زمان بالا آمدن سرور"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """تولید یک سشن (نشست) جدید برای هر درخواست کاربر"""
    with Session(engine) as session:
        yield session