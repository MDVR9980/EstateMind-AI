import random

otp_storage = {}

def send_otp_sms(phone_number: str) -> str:
    """تولید کد ۵ رقمی و شبیه‌سازی ارسال پیامک"""
    code = str(random.randint(10000, 99999))
    otp_storage[phone_number] = code
    
    print(f"\n" + "="*50)
    print(f"📱 [SMS MOCK] ارسال پیامک به {phone_number}:")
    print(f"کد ورود شما به سیستم EstateMind: {code}")
    print("="*50 + "\n")
    
    return code
    
def verify_otp_code(phone_number: str, code: str) -> bool:
    """بررسی صحت کد وارد شده"""
    if phone_number in otp_storage and otp_storage[phone_number] == code:
        del otp_storage[phone_number] # کد یکبار مصرف است، پس پاک می‌شود
        return True
    return False