import os

def combine_files(directory, output_file, extensions, exclude_dirs):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(directory):
            # جلوگیری از ورود به پوشه‌های سنگین و غیرضروری
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
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

# 1. تنظیمات پوشه موبایل
mobile_excludes = ['node_modules', '.expo', 'assets', '.git']
combine_files('./Mobile', 'mobile_code.txt', ['.ts', '.tsx', '.js', '.json'], mobile_excludes)

# 2. تنظیمات پوشه بک‌اند
# فولدرهای chroma_db و uploads و venv را حذف کردیم که حجم الکی نگیرند
backend_excludes = ['venv', 'chroma_db', 'uploads', '.git', '__pycache__', 'scripts']
combine_files('./Backend', 'backend_code.txt', ['.py', '.json', '.md'], backend_excludes)

print("🎉 کار تمام شد! حالا دو فایل متنی برای آپلود در گوگل آماده است.")