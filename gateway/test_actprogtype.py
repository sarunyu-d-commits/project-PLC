#!/usr/bin/env python
"""Test ActProgType connection"""

import win32com.client

print("=" * 60)
print("Testing ActProgType Connection")
print("=" * 60)

try:
    # สร้างออบเจกต์เชื่อมต่อ MX Component
    act_prog = win32com.client.Dispatch("ActProgType.ActProgType.1")
    print("✅ ActProgType object created")
    
    # กำหนดเลข Station ให้ตรงกับที่ตั้งใน Communication Setup Utility
    act_prog.ActLogicalStationNumber = 1
    print("✅ Station number set to 1")
    
    # สั่งเชื่อมต่อ
    result = act_prog.Open()
    if result == 0:
        print("✅ เชื่อมต่อ PLC Simulator สำเร็จ!")
        
        # ลองอ่านค่า M0
        try:
            value = act_prog.ReadDeviceMemory("M0", 0, 1)[0]
            print(f"✅ M0 = {value}")
        except Exception as e:
            print(f"⚠️ ReadDeviceMemory error: {e}")
        
        # ปิดการเชื่อมต่อ
        act_prog.Close()
        print("✅ Connection closed")
    else:
        print(f"❌ เชื่อมต่อไม่ได้ รหัส Error: {result}")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("=" * 60)
