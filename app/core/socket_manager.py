from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

def notify_user_sync(user_id: int, message: dict):
    """تابع کمکی برای ارسال پیام درلحظه از داخل توابع معمولی (مثل وب‌هوک‌ها)"""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.send_personal_message(message, user_id))
    except RuntimeError:
        asyncio.run(manager.send_personal_message(message, user_id))