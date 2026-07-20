from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.socket_manager import manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # سوکت فقط باز می‌ماند تا سرور پیام‌ها را به کلاینت پوش (Push) کند
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)