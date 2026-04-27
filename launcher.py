import os
import subprocess
import sys

def main():
    # ЗАМЕНИТЕ путь на ваш реальный путь
    repo_path = r"C:\Users\ivanb\Rustplusplus1"
    
    try:
        # Переходим в папку проекта
        os.chdir(repo_path)
        print("🚀 Запуск проекта...")
        print(f"📁 Папка: {repo_path}")
        
        # Запускаем npm start
        result = subprocess.run(["npm", "start"], shell=True)
        
        if result.returncode != 0:
            input("❌ Ошибка при запуске. Нажмите Enter для выхода...")
        else:
            input("✅ Проект завершен. Нажмите Enter для выхода...")
            
    except FileNotFoundError:
        input(f"❌ Папка не найдена: {repo_path}\nНажмите Enter для выхода...")
    except Exception as e:
        input(f"❌ Ошибка: {e}\nНажмите Enter для выхода...")

if __name__ == "__main__":
    main()
