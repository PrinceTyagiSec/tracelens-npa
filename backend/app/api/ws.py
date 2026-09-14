import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.capture.live_capture import live_capture_manager
from backend.app.core.logging import logger

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/capture")
async def websocket_capture_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to live capture stream.")

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def sync_listener(event):
        loop.call_soon_threadsafe(queue.put_nowait, event)

    live_capture_manager.add_subscriber(sync_listener)

    try:
        while True:
            # Check if there is an outgoing event
            try:
                event = await asyncio.wait_for(queue.get(), timeout=0.1)
                await websocket.send_json(event)
            except asyncio.TimeoutError:
                pass

            # Check if client sent any command (e.g. ping)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                pass

    except (WebSocketDisconnect, ConnectionResetError):
        logger.info("WebSocket client disconnected from capture stream.")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        live_capture_manager.remove_subscriber(sync_listener)
