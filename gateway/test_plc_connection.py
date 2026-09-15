#!/usr/bin/env python
"""Test script to debug PLC connection issues"""

import sys
import requests
import pythoncom
from win32com.client import Dispatch

print("=" * 60)
print("PLC CONNECTION DIAGNOSTIC TEST")
print("=" * 60)

# Test 1: Check if FastAPI is running
print("\n[TEST 1] Checking FastAPI Server...")
try:
    response = requests.get("http://localhost:8000/")
    if response.status_code == 200:
        print("✅ FastAPI Server is running")
        print(f"   Response: {response.json()}")
    else:
        print(f"❌ FastAPI returned status: {response.status_code}")
except Exception as e:
    print(f"❌ Cannot connect to FastAPI server: {e}")
    print("   Make sure uvicorn is running on port 8000")

# Test 2: Check PLC Status endpoint
print("\n[TEST 2] Checking PLC Status Endpoint...")
try:
    response = requests.get("http://localhost:8000/api/status")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Status endpoint responded")
        print(f"   Connected: {data.get('connected')}")
        print(f"   Message: {data.get('message')}")
    else:
        print(f"❌ Status endpoint returned: {response.status_code}")
except Exception as e:
    print(f"❌ Cannot reach status endpoint: {e}")

# Test 3: Try direct COM interface
print("\n[TEST 3] Testing Direct COM Interface...")
try:
    pythoncom.CoInitialize()
    act = Dispatch("ActUtlType.ActUtlType")
    print("✅ COM interface created successfully")
    
    # Try to set station number
    act.ActLogicalStationNumber = 1
    print("✅ Station number set to 1")
    
    # Try to read M0
    result = act.GetDevice2("M0", 0)
    print(f"✅ GetDevice2 response: {result}")
    
    if isinstance(result, tuple):
        error_code, value = result[0], result[1]
        if error_code == 0:
            print(f"   ✅ M0 = {value}")
        else:
            print(f"   ⚠️  Error code: {error_code}")
            print("   This might mean GX Simulator is not running or not connected")
    
except Exception as e:
    print(f"❌ COM interface error: {e}")
    print("   Make sure ActUtlType is installed")
    print("   You may need to install 'MELSEC Communication Library'")

# Test 4: List available devices
print("\n[TEST 4] Attempting to read common devices...")
devices = ["M0", "M1", "M2", "M3", "M10", "D0", "D1"]
try:
    pythoncom.CoInitialize()
    act = Dispatch("ActUtlType.ActUtlType")
    act.ActLogicalStationNumber = 1
    
    for device in devices:
        try:
            result = act.GetDevice2(device, 0)
            if isinstance(result, tuple) and len(result) >= 2:
                error_code, value = result[0], result[1]
                status = "✅" if error_code == 0 else "❌"
                print(f"   {status} {device}: error={error_code}, value={value}")
        except Exception as e:
            print(f"   ❌ {device}: {e}")
except Exception as e:
    print(f"❌ Cannot test devices: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
print("\nIf COM interface is working but API shows 'not connected':")
print("1. Check if GX Simulator3 is running")
print("2. Check if GX Simulator3 is set to 'RUN' mode")
print("3. Verify the station number matches (default: 1)")
