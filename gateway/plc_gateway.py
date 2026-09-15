"""
PLC Gateway: อ่านสถานะจาก PLC แล้วเขียนเข้า Supabase

    PLC / GX Simulator3  ->  plc_gateway (เครื่องในโรงงาน)  ->  Supabase  <-  Web (Vercel)

- เว็บไม่คุยกับ PLC โดยตรง (ตามบทที่ 3: Integration Layer / Security Boundary)
- PLC เป็น Source of Truth ของสถานะเครื่องที่ตั้งค่า plc_linked = true
- Service Role Key อยู่ในไฟล์ .env บนเครื่องนี้เท่านั้น ห้าม commit และห้ามใส่ใน Vercel
- ใช้แค่ standard library เพื่อให้ติดตั้งง่ายบน Windows

Mapping (ต้องตรงกับ lib/domain/plc.ts ฝั่งเว็บ)
    M0 = PWR, M1 = RUN, M3 = ERR
    ERR = 1              -> alarm
    PWR = 1 และ RUN = 1  -> running
    อื่น ๆ               -> stop
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Dict, Optional

log = logging.getLogger("plc_gateway")

ReadDevice = Callable[[str], int]


def plc_to_machine_status(m0: int, m1: int, m3: int) -> str:
    if m3 == 1:
        return "alarm"
    if m0 == 1 and m1 == 1:
        return "running"
    return "stop"


@dataclass
class GatewayConfig:
    supabase_url: str
    service_role_key: str
    machine_code: str = "PUMP-01"
    poll_seconds: float = 3.0
    alarm_code: str = "PLC-ERR"
    alarm_description: str = "PLC error bit (M3) is ON"
    timeout_seconds: float = 5.0

    @classmethod
    def from_env(cls) -> "GatewayConfig":
        url = os.getenv("SUPABASE_URL", "").rstrip("/")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise RuntimeError("ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ gateway/.env")
        return cls(
            supabase_url=url,
            service_role_key=key,
            machine_code=os.getenv("GATEWAY_MACHINE_CODE", "PUMP-01").upper(),
            poll_seconds=float(os.getenv("GATEWAY_POLL_SECONDS", "3")),
            alarm_code=os.getenv("GATEWAY_ALARM_CODE", "PLC-ERR").upper(),
        )


class SupabaseRest:
    """เรียก Supabase REST (PostgREST) ด้วย service role"""

    def __init__(self, cfg: GatewayConfig):
        self.cfg = cfg

    def request(self, method: str, path: str, body: Optional[dict] = None, prefer: str = "") -> tuple[int, object]:
        headers = {
            "apikey": self.cfg.service_role_key,
            "Authorization": f"Bearer {self.cfg.service_role_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"{self.cfg.supabase_url}/rest/v1/{path}", data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.cfg.timeout_seconds) as resp:
                raw = resp.read().decode() or "null"
                return resp.status, json.loads(raw)
        except urllib.error.HTTPError as e:
            raw = e.read().decode() or "null"
            try:
                return e.code, json.loads(raw)
            except json.JSONDecodeError:
                return e.code, raw


@dataclass
class Gateway:
    cfg: GatewayConfig
    read_device: ReadDevice
    rest: object = None  # SupabaseRest หรือ fake ตอนทดสอบ
    machine_id: Optional[str] = None
    last_err: int = 0
    pending_alarm: bool = False
    stats: Dict[str, int] = field(default_factory=lambda: {"cycles": 0, "errors": 0, "alarms": 0})

    def __post_init__(self):
        if self.rest is None:
            self.rest = SupabaseRest(self.cfg)

    def _resolve_machine(self) -> bool:
        if self.machine_id:
            return True
        code = urllib.parse.quote(self.cfg.machine_code)
        status, rows = self.rest.request("GET", f"machines?select=id,plc_linked&machine_code=eq.{code}")
        if status != 200 or not rows:
            log.error("ไม่พบเครื่อง %s ใน Supabase (HTTP %s)", self.cfg.machine_code, status)
            return False
        if not rows[0]["plc_linked"]:
            log.warning("เครื่อง %s ยังไม่ได้ติ๊ก 'รับสถานะจาก PLC Gateway' ในหน้าเว็บ", self.cfg.machine_code)
            return False
        self.machine_id = rows[0]["id"]
        return True

    def cycle(self) -> Optional[str]:
        """อ่าน PLC 1 รอบแล้วอัปเดต Supabase คืนค่าสถานะที่เขียน (None ถ้าล้มเหลว)"""
        self.stats["cycles"] += 1
        try:
            m0, m1, m3 = (int(self.read_device(d)) for d in ("M0", "M1", "M3"))
        except Exception as exc:  # PLC offline: ไม่อัปเดต last_seen_at -> เว็บจะแสดงว่าขาดการติดต่อ
            self.stats["errors"] += 1
            log.error("อ่าน PLC ไม่ได้: %s", exc)
            return None

        if not self._resolve_machine():
            self.stats["errors"] += 1
            return None

        status = plc_to_machine_status(m0, m1, m3)
        now = datetime.now(timezone.utc).isoformat()

        # ขอบขาขึ้นของ ERR -> สร้าง Alarm (จำไว้ถ้าเครือข่ายล่ม แล้วลองใหม่รอบถัดไป)
        if m3 == 1 and self.last_err == 0:
            self.pending_alarm = True
        self.last_err = m3

        code, _ = self.rest.request(
            "PATCH",
            f"machines?id=eq.{self.machine_id}&plc_linked=eq.true",
            {"status": status, "last_seen_at": now},
            prefer="return=minimal",
        )
        if code not in (200, 204):
            self.stats["errors"] += 1
            log.error("อัปเดตสถานะไม่สำเร็จ (HTTP %s)", code)
            return None

        if self.pending_alarm:
            code, body = self.rest.request(
                "POST",
                "alarms",
                {
                    "machine_id": self.machine_id,
                    "alarm_code": self.cfg.alarm_code,
                    "description": self.cfg.alarm_description,
                    "severity": "high",
                    "occurred_at": now,
                    "source": "plc",
                },
                prefer="return=minimal",
            )
            if code in (200, 201):
                self.stats["alarms"] += 1
                self.pending_alarm = False
                log.warning("สร้าง Alarm %s ของ %s", self.cfg.alarm_code, self.cfg.machine_code)
            elif code == 409:
                # มี Alarm จาก PLC ที่ยังไม่ปิดอยู่แล้ว (unique index) -> ไม่สร้างซ้ำ
                self.pending_alarm = False
            else:
                self.stats["errors"] += 1
                log.error("สร้าง Alarm ไม่สำเร็จ (HTTP %s): %s", code, body)

        # หมายเหตุ: เมื่อ ERR ดับ Gateway จะไม่ปิด Alarm เอง ช่างต้องบันทึกสาเหตุและการแก้ไขในเว็บ
        return status

    def run_forever(self, stop_flag: Callable[[], bool] = lambda: False) -> None:
        log.info("เริ่ม Gateway: %s ทุก %.1f วินาที", self.cfg.machine_code, self.cfg.poll_seconds)
        while not stop_flag():
            self.cycle()
            time.sleep(self.cfg.poll_seconds)


def load_dotenv(path: str) -> None:
    """อ่านไฟล์ .env แบบง่าย (ไม่ทับค่าที่ตั้งไว้แล้ว)"""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))
