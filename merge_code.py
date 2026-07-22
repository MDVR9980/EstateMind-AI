import os

# یک پارامتر جدید به نام exclude_files اضافه کردیم
def combine_files(directory, output_file, extensions, exclude_dirs, exclude_files=None):
    if exclude_files is None:
        exclude_files = []
        
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(directory):
            # جلوگیری از ورود به پوشه‌های سنگین و غیرضروری
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                # 🔴 جلوگیری از خواندن فایل‌های خاص (مثل package-lock.json)
                if file in exclude_files:
                    continue
                    
                if any(file.endswith(ext) for ext in extensions):
                    file_path = os.path.join(root, file)
                    outfile.write(f"\n\n{'='*50}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*50}\n\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"[خطا در خواندن فایل: {e}]\n")
    print(f"✅ فایل {output_file} با موفقیت ساخته شد.")

# ==========================================
# 1. تنظیمات پوشه موبایل (React Native)
# ==========================================
# پوشه‌هایی که کلا نباید اسکن شوند:
mobile_excludes = [
    'node_modules', '.expo', 'assets', '.git', 
    'ios', 'android', 'build', 'dist', 'coverage', '.cache'
]

# فایل‌های به شدت حجیم و غیرضروری که نباید خوانده شوند:
mobile_exclude_files = [
    'package-lock.json', 'yarn.lock', 'bun.lockb',
    'tsconfig.json' # (اگر نیاز ندارید)
]

# برای ریکت نیتیو فقط فایل‌های حاوی کد منطقی را می‌خواهیم
# اگر فایل های json برایتان مهم نیست (مثل فایل های زبان یا دیتای تستی)، پسوند .json را از لیست زیر حذف کنید
mobile_extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']

combine_files('./Mobile', 'mobile_code.txt', mobile_extensions, mobile_excludes, mobile_exclude_files)

# ==========================================
# 2. تنظیمات پوشه بک‌اند
# ==========================================
backend_excludes = [
    'venv', 'chroma_db', 'uploads', '.git', '__pycache__', 
    'scripts', 'alembic', 'migrations', 'logs'
]

backend_exclude_files = [
    'poetry.lock', 'Pipfile.lock' # فایل‌های لاک پایتون
]

combine_files('./Backend', 'backend_code.txt', ['.py', '.md', '.json'], backend_excludes, backend_exclude_files)

print("🎉 کار تمام شد! حالا فایل‌ها بسیار سبک‌تر شده‌اند.")