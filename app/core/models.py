from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

# Enums (مقادیر ثابت سیستم)
class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    MANAGER = "MANAGER"
    AGENT = "AGENT"

class FunnelStage(str, Enum):
    LEAD = "لید جدید"
    VISIT = "بازدید"
    DECISION = "تصمیم‌گیری"
    MEETING = "جلسه در دفتر"
    WON = "قرارداد موفق"
    LOST = "معامله ناموفق"

class PropertyType(str, Enum): 
    APARTMENT = "آپارتمان"
    VILLA = "ویلایی"
    LAND = "زمین و کلنگی"
    COMMERCIAL = "تجاری و اداری"

class DealType(str, Enum): 
    SALE = "فروش"
    RENT = "رهن و اجاره"
    PARTNERSHIP = "مشارکت در ساخت"
    BARTER = "تهاتر"

class DocumentType(str, Enum):
    SINGLE = "سند تک برگ"
    PROMISSORY = "قولنامه‌ای"
    ENDOWMENT = "اوقافی"
    COOPERATIVE = "تعاونی"
    OTHER = "سایر"

# Database Tables (جداول دیتابیس)
class Agency(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    owner_name: str
    phone: str = Field(unique=True)
    city: str = Field(default="تهران")
    subscription_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: Optional[int] = Field(default=None, foreign_key="agency.id") 
    full_name: str
    username: str = Field(unique=True, index=True) 
    hashed_password: str
    role: UserRole = Field(default=UserRole.AGENT)
    target_neighborhoods: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Property(SQLModel, table=True):
    """جدول فایل‌های املاک (با جزئیات کامل مطابق سیستم جدید)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    
    title: str
    property_type: PropertyType
    deal_type: DealType
    city: str = Field(default="مشهد")
    neighborhood: str = Field(index=True)
    address: Optional[str] = None #
    
    built_area: Optional[float] = Field(default=0)
    land_area: Optional[float] = Field(default=0)
    rooms: int = Field(default=0)
    age: Optional[int] = Field(default=0)
    floor: Optional[int] = None 
    total_floors: Optional[int] = None
    
    has_elevator: bool = Field(default=False)
    has_parking: bool = Field(default=False)
    has_store_room: bool = Field(default=False)
    has_master_room: bool = Field(default=False)
    cabinet_type: Optional[str] = None
    floor_covering: Optional[str] = None
    document_type: DocumentType = Field(default=DocumentType.SINGLE)
    
    price_total: Optional[float] = Field(default=0)
    price_mortgage: Optional[float] = Field(default=0)
    price_rent: Optional[float] = Field(default=0)
    is_barter: bool = Field(default=False)
    
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    is_exclusive: bool = Field(default=False)
    
    ai_pros: Optional[str] = None
    ai_cons: Optional[str] = None
    description: Optional[str] = None

    image_urls: Optional[str] = Field(default="[]") 
    
    status: str = Field(default="active") # active, archived, deleted
    created_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    made_public_by_name: Optional[str] = None

class Client(SQLModel, table=True):
    """جدول مشتریان (خریدار/مستاجر) در قیف فروش"""
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True) 
    user_id: int = Field(foreign_key="users.id") 
    name: str
    phone: str = Field(index=True)
    deal_type_requested: DealType = Field(default=DealType.SALE)
    budget_limit: Optional[float] = Field(default=0) 
    funnel_stage: FunnelStage = Field(default=FunnelStage.LEAD)
    last_interaction: datetime = Field(default_factory=datetime.utcnow)
    client_category: str = Field(default="عادی")

class Deal(SQLModel, table=True):
    """جدول معاملات (برای داشبورد مالی و محاسبه کمیسیون)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    client_id: int = Field(foreign_key="client.id")
    property_id: Optional[int] = Field(default=None, foreign_key="property.id")
    deal_type: str
    deal_price: float
    commission_amount: float
    deal_date: datetime = Field(default_factory=datetime.utcnow)

class Reminder(SQLModel, table=True):
    """جدول یادآورها و تقویم کاری مشاوران"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    client_id: Optional[int] = Field(default=None, foreign_key="client.id")
    property_id: Optional[int] = Field(default=None, foreign_key="property.id")
    title: str 
    description: Optional[str] = None
    remind_date: datetime
    is_completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TicketStatus(str, Enum):
    OPEN = "باز"
    IN_PROGRESS = "در حال بررسی"
    PENDING = "در انتظار پاسخ"
    RESOLVED = "حل شده"

class TicketPriority(str, Enum):
    LOW = "پایین"
    NORMAL = "عادی"
    HIGH = "بالا"
    URGENT = "فوری"

class Ticket(SQLModel, table=True):
    """جدول تیکت‌های پشتیبانی و مکاتبات سازمانی"""
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True) # تیکت‌های هر آژانس جداست
    sender_id: int = Field(foreign_key="users.id", index=True) # فرستنده
    receiver_id: int = Field(foreign_key="users.id", index=True) # گیرنده (همکار یا مدیر)
    
    ticket_code: str = Field(unique=True, index=True) # مثلا T-2026-00004
    subject: str
    priority: TicketPriority = Field(default=TicketPriority.NORMAL)
    status: TicketStatus = Field(default=TicketStatus.OPEN)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TicketReply(SQLModel, table=True):
    """جدول تاریخچه چت‌ها و پاسخ‌های داخل یک تیکت"""
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="ticket.id", index=True)
    user_id: int = Field(foreign_key="users.id") # کسی که این پیام رو داده
    message: str
    attachment_path: Optional[str] = None # برای پیوست فایل/عکس
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class AgentNotification(SQLModel, table=True):
    """جدول هشدارها و ردیابی هوشمند مشتریان برای هر مشاور"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    message: str
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UploadedForm(SQLModel, table=True):
    """جدول زونکن مدارک و فرم‌های خام آژانس"""
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True)
    title: str
    file_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class PublisherType(str, Enum): 
    PERSONAL = "شخصی"
    AGENCY = "املاک"
    UNKNOWN = "نامشخص"

class Requirement(SQLModel, table=True):
    """جدول تقاضا و نیازهای مشتریان (برای مچینگ هوشمند با ربات دیوار)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    agency_id: int = Field(foreign_key="agency.id", index=True) 
    client_id: int = Field(foreign_key="client.id")
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    deal_type: DealType
    property_type: PropertyType
    min_budget: float = Field(default=0)
    max_budget: float
    preferred_neighborhoods: str
    has_barter: bool = Field(default=False)
    barter_asset_desc: Optional[str] = None