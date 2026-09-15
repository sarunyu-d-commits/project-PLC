"""
PLC API + Gateway (ต่อยอดจาก plc_api.py เดิม)

รัน:  uvicorn plc_api:app --host 127.0.0.1 --port 8000
- GET  /api/status, GET /api/plc/{device}  ใช้ทดสอบในเครื่อง
- POST /api/plc  ต้องส่ง header X-API-Key และเขียนได้เฉพาะ device ใน allowlist
- ถ้าตั้ง GATEWAY_ENABLED=true จะเริ่ม Gateway ที่ส่งสถานะเข้า Supabase อัตโนมัติ
"""

import logging
import os
import re
import secrets
import threading
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from plc_gateway import Gateway, GatewayConfig, load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

USE_MOCK_MODE = os.getenv("USE_MOCK_MODE", "True").lower() in ("1", "true", "yes")
PLC_STATION_NUMBER = int(os.getenv("PLC_STATION_NUMBER", "1"))
PLC_API_KEY = os.getenv("PLC_API_KEY", "")
GATEWAY_ENABLED = os.getenv("GATEWAY_ENABLED", "false").lower() in ("1", "true", "yes")

# device ที่อนุญาตให้อ่าน/เขียน (กันการสั่ง device อื่นใน PLC)
READABLE_DEVICES = {"M0", "M1", "M2", "M3", "M10", "Y0"}
WRITABLE_DEVICES = {"M0", "M1", "M3", "M10"}
DEVICE_PATTERN = re.compile(r"^[A-Z]{1,2}\d{1,4}$")

MOCK_DEVICES: Dict[str, int] = {
    "M0": 1,   # PWR
    "M1": 0,   # RUN
    "M2": 1,   # STOP (= NOT RUN)
    "M3": 0,   # ERR
    "M10": 0,  # Mode (0=off, 1=manual, 2=auto)
    "Y0": 0,   # P.RUN = M0 AND M1
}
_mock_lock = threading.Lock()

try:
    import pythoncom
    from win32com.client import Dispatch
    COM_AVAILABLE = True
except ImportError:
    COM_AVAILABLE = False

_thread_local = threading.local()


def get_act_utl():
    """ActUtlType ต่อ thread (COM ต้อง CoInitialize ในแต่ละ thread)"""
    if not COM_AVAILABLE:
        raise RuntimeError("ไม่พบ pywin32 / MX Component (ใช้ USE_MOCK_MODE=true เพื่อทดสอบ)")
    act = getattr(_thread_local, "act", None)
    if act is None:
        pythoncom.CoInitialize()
        act = Dispatch("ActUtlType.ActUtlType")
        act.ActLogicalStationNumber = PLC_STATION_NUMBER
        rc = act.Open()
        if rc != 0:
            raise RuntimeError(f"เปิดการเชื่อมต่อ PLC ไม่ได้ (error {rc})")
        _thread_local.act = act
    return act


def read_device_mock(device: str) -> int:
    with _mock_lock:
        if device == "M2":
            return 1 if MOCK_DEVICES["M1"] == 0 else 0
        if device == "Y0":
            return 1 if (MOCK_DEVICES["M0"] == 1 and MOCK_DEVICES["M1"] == 1) else 0
        return MOCK_DEVICES.get(device, 0)


def write_device_mock(device: str, value: int) -> int:
    with _mock_lock:
        MOCK_DEVICES[device] = value
        if device == "M1":
            MOCK_DEVICES["M2"] = 1 if value == 0 else 0
    return value


def read_device(device: str) -> int:
    if USE_MOCK_MODE:
        return read_device_mock(device)
    result = get_act_utl().GetDevice2(device, 0)
    if not (isinstance(result, tuple) and len(result) >= 2):
        raise RuntimeError("Invalid response from GetDevice2")
    error_code, value = result[0], result[1]
    if error_code != 0:
        _thread_local.act = None  # ให้เชื่อมต่อใหม่รอบถัดไป
        raise RuntimeError(f"PLC read error code {error_code}")
    return int(value)


def write_device(device: str, value: int) -> int:
    if USE_MOCK_MODE:
        return write_device_mock(device, value)
    result = get_act_utl().SetDevice2(device, value)
    error_code = result[0] if isinstance(result, tuple) else result
    if error_code != 0:
        raise RuntimeError(f"PLC write error code {error_code}")
    return value


_stop = threading.Event()
gateway: Gateway | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global gateway
    if GATEWAY_ENABLED:
        gateway = Gateway(GatewayConfig.from_env(), read_device)
        threading.Thread(target=gateway.run_forever, args=(_stop.is_set,), daemon=True).start()
    yield
    _stop.set()


app = FastAPI(title="PLC API + Gateway", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


class PlcWriteRequest(BaseModel):
    device: str
    value: int = Field(ge=0, le=2)


def check_device(device: str, allowed: set) -> str:
    device = device.upper()
    if not DEVICE_PATTERN.match(device) or device not in allowed:
        raise HTTPException(status_code=400, detail=f"Device {device} is not allowed")
    return device


@app.get("/")
def root():
    return {"message": "PLC API is running", "version": "2.0", "mock": USE_MOCK_MODE, "gateway": GATEWAY_ENABLED}


@app.get("/api/status")
def get_plc_status():
    try:
        read_device("M0")
        return {"connected": True, "message": "MOCK MODE" if USE_MOCK_MODE else "Connected to PLC",
                "gateway": gateway.stats if gateway else None}
    except Exception as exc:
        return {"connected": False, "message": f"PLC Error: {exc}", "gateway": gateway.stats if gateway else None}


@app.get("/api/plc/{device}")
def read_plc_device(device: str):
    device = check_device(device, READABLE_DEVICES)
    try:
        return {"device": device, "value": read_device(device), "success": True}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/plc")
def write_plc_device(request: PlcWriteRequest, x_api_key: str = Header(default="")):
    # เดิมใครก็เขียนค่าเข้า PLC ได้ ตอนนี้ต้องมี API key
    if not PLC_API_KEY or not secrets.compare_digest(x_api_key, PLC_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
    device = check_device(request.device, WRITABLE_DEVICES)
    try:
        return {"device": device, "value": write_device(device, request.value), "success": True}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
