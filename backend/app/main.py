import os
import json
import random
import datetime
import time
import cv2
import numpy as np
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from .database import engine, get_db, Base
from .models import User, Camera, Vehicle, Violation, Evidence, Notification, AuditLog
from .schemas import (
    UserResponse, LoginRequest, TokenResponse,
    CameraResponse,
    VehicleResponse, VehicleCreate,
    ViolationCreate, ViolationResponse, ViolationUpdateStatus,
    StatsResponse, SignalStatusResponse, AuditLogResponse
)
from .auth import verify_password, create_access_token
from .seed import seed_database, generate_sample_snapshot, EVIDENCE_DIR

try:
    from ai_engine.zebra_detector import ZebraCrossingDetector, ZebraCrossingResult
except Exception:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from ai_engine.zebra_detector import ZebraCrossingDetector, ZebraCrossingResult

# Initialize FastAPI App
app = FastAPI(
    title="Smart Traffic AI Violation Detection System",
    description="Clean-architecture backend for AI Edge traffic violation detection, RTO lookup, WebSocket streaming, and automated e-challan dispatch.",
    version="2.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Evidence Snapshots directory as static files
os.makedirs(EVIDENCE_DIR, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=EVIDENCE_DIR), name="evidence")

# In-Memory Global Traffic Signal State (Synchronized across CV & UI)
traffic_signal_state = {
    "state": "RED",  # RED or GREEN
    "last_updated": datetime.datetime.utcnow(),
    "updated_by": "SYSTEM_INIT"
}

# WebSocket Connection Manager for Real-Time Broadcasting
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send current signal state upon connection
        await websocket.send_json({
            "event": "SIGNAL_UPDATE",
            "data": {
                "state": traffic_signal_state["state"],
                "last_updated": traffic_signal_state["last_updated"].isoformat()
            }
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for dead_conn in disconnected:
            self.disconnect(dead_conn)

manager = ConnectionManager()

# Lifecycle Startup Event
@app.on_event("startup")
def on_startup():
    print("[Startup] Auto-running DB migrations and initial Indian RTO seed data...")
    seed_database()

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================
@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Demo bypass shortcut
    if payload.username == "demo" and payload.password == "demo":
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            user = User(username="admin", email="admin@traffic.gov.in", hashed_password="x", role="admin")
        token = create_access_token(data={"sub": user.username, "role": user.role})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user.id, "username": user.username, "role": user.role, "email": user.email}
        }

    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password. (Use 'demo' / 'demo' or 'admin' / 'admin123')"
        )

    token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "role": user.role, "email": user.email}
    }

# ==========================================
# TRAFFIC SIGNAL CONTROL ENDPOINTS
# ==========================================
@app.get("/api/signal", response_model=SignalStatusResponse)
def get_signal_state():
    return SignalStatusResponse(
        state=traffic_signal_state["state"],
        last_updated=traffic_signal_state["last_updated"],
        updated_by=traffic_signal_state["updated_by"]
    )

@app.post("/api/signal/{new_state}", response_model=SignalStatusResponse)
async def update_signal_state(new_state: str, actor: Optional[str] = "Command Center UI", db: Session = Depends(get_db)):
    state_upper = new_state.upper()
    if state_upper not in ["RED", "GREEN"]:
        raise HTTPException(status_code=400, detail="Signal state must be either 'RED' or 'GREEN'")

    traffic_signal_state["state"] = state_upper
    traffic_signal_state["last_updated"] = datetime.datetime.utcnow()
    traffic_signal_state["updated_by"] = actor

    # Record Audit Log
    audit = AuditLog(
        action=f"TRAFFIC_SIGNAL_{state_upper}",
        actor=actor,
        details=f"Traffic light manually switched to {state_upper}",
        created_at=traffic_signal_state["last_updated"]
    )
    db.add(audit)
    db.commit()

    # Broadcast via WebSocket
    await manager.broadcast({
        "event": "SIGNAL_UPDATE",
        "data": {
            "state": state_upper,
            "last_updated": traffic_signal_state["last_updated"].isoformat(),
            "updated_by": actor
        }
    })

    return SignalStatusResponse(
        state=traffic_signal_state["state"],
        last_updated=traffic_signal_state["last_updated"],
        updated_by=traffic_signal_state["updated_by"]
    )

# ==========================================
# VIOLATION INGESTION & MANAGEMENT
# ==========================================
def serialize_violation(viol: Violation, db: Session) -> dict:
    # Helper to build enriched dictionary representation for WebSocket and REST
    camera = viol.camera
    vehicle = db.query(Vehicle).filter(Vehicle.license_plate == viol.license_plate).first()

    return {
        "id": viol.id,
        "track_id": viol.track_id,
        "camera_id": viol.camera_id,
        "camera_code": camera.camera_code if camera else "CAM-01",
        "location_name": camera.location_name if camera else "Unknown Junction",
        "violation_type": viol.violation_type,
        "license_plate": viol.license_plate,
        "ocr_confidence": viol.ocr_confidence,
        "fine_amount": viol.fine_amount,
        "status": viol.status,
        "timestamp": viol.timestamp.isoformat(),
        "evidence": {
            "id": viol.evidence.id if viol.evidence else None,
            "image_url": viol.evidence.image_url if viol.evidence else None,
            "crop_image_url": getattr(viol.evidence, "crop_image_url", None) if viol.evidence else None,
            "bbox_json": viol.evidence.bbox_json if viol.evidence else None,
        } if viol.evidence else None,
        "vehicle": {
            "id": vehicle.id,
            "license_plate": vehicle.license_plate,
            "owner_name": vehicle.owner_name,
            "owner_phone": vehicle.owner_phone,
            "owner_email": vehicle.owner_email,
            "vehicle_model": vehicle.vehicle_model,
            "vehicle_type": vehicle.vehicle_type,
            "rto_office": vehicle.rto_office
        } if vehicle else None,
        "notifications": [
            {
                "id": n.id,
                "recipient_phone": n.recipient_phone,
                "channel": n.channel,
                "message_body": n.message_body,
                "delivery_status": n.delivery_status,
                "sent_at": n.sent_at.isoformat()
            } for n in viol.notifications
        ]
    }

@app.post("/api/violations")
async def create_violation(payload: ViolationCreate, db: Session = Depends(get_db)):
    """Ingest a violation from vision_engine.py or external edge nodes"""
    # 1. Resolve camera
    camera = None
    if payload.camera_id:
        camera = db.query(Camera).filter(Camera.id == payload.camera_id).first()
    if not camera and payload.camera_code:
        camera = db.query(Camera).filter(Camera.camera_code == payload.camera_code).first()
    if not camera:
        camera = db.query(Camera).first()

    # Determine default fine by violation type
    fine_map = {
        "RED_LIGHT_JUMP": 1000,
        "RED_LIGHT_ZEBRA_BREACH": 1000,
        "NO_HELMET": 500,
        "TRIPLE_RIDING": 1000,
        "STOP_LINE_BREACH": 500,
        "SPEEDING": 2000
    }
    fine = payload.fine_amount or fine_map.get(payload.violation_type, 1000)

    # 2. Look up vehicle in mock RTO registry
    clean_plate = payload.license_plate.upper().replace(" ", "").replace("-", "")
    vehicle = db.query(Vehicle).filter(Vehicle.license_plate == clean_plate).first()
    if not vehicle:
        # Generate default vehicle record if not found
        vehicle = Vehicle(
            license_plate=clean_plate,
            owner_name="Karnataka Citizen (Unregistered)",
            owner_phone="+91 98800 " + str(random.randint(10000, 99999)),
            owner_email="registered.owner@vahan.nic.in",
            vehicle_model="Passenger Motor Vehicle",
            vehicle_type="Two-Wheeler" if "HELMET" in payload.violation_type else "Four-Wheeler",
            rto_office="KA-01 Koramangala RTO, Bengaluru"
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)

    # 3. Create Violation
    violation = Violation(
        track_id=payload.track_id,
        camera_id=camera.id if camera else 1,
        violation_type=payload.violation_type,
        license_plate=clean_plate,
        ocr_confidence=payload.ocr_confidence,
        fine_amount=fine,
        status="PENDING",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)

    # 4. Create Evidence
    img_url = payload.image_url
    if not img_url:
        fname = f"viol_{clean_plate}_{int(datetime.datetime.utcnow().timestamp())}.jpg"
        generate_sample_snapshot(fname, clean_plate, payload.violation_type, camera.camera_code if camera else "CAM-01")
        img_url = f"/evidence/{fname}"

    evidence = Evidence(
        violation_id=violation.id,
        image_url=img_url,
        crop_image_url=payload.crop_image_url,
        bbox_json=json.dumps(payload.bbox) if payload.bbox else None
    )
    db.add(evidence)

    # 5. Create Notification (Simulated SMS/WhatsApp Dispatch)
    challan_id = f"CH-{random.randint(10000, 99999)}"
    sms_body = (
        f"TRAFFIC POLICE NOTICE: E-Challan #{challan_id} issued to vehicle {clean_plate} "
        f"for {payload.violation_type.replace('_', ' ')} at {camera.location_name if camera else 'Junction'}. "
        f"Fine Amount: INR {fine}. Pay within 15 days via https://echallan.parivahan.gov.in"
    )
    notif = Notification(
        violation_id=violation.id,
        recipient_phone=vehicle.owner_phone,
        channel="SMS",
        message_body=sms_body,
        delivery_status="DELIVERED",
        sent_at=datetime.datetime.utcnow()
    )
    db.add(notif)

    # 6. Audit Log
    audit = AuditLog(
        action="VIOLATION_INGESTED",
        actor="AI_VISION_PIPELINE",
        details=f"Violation #{violation.id} ({payload.violation_type}) recorded for {clean_plate} at {camera.camera_code if camera else 'CAM-01'}",
        created_at=datetime.datetime.utcnow()
    )
    db.add(audit)

    db.commit()
    db.refresh(violation)

    enriched_data = serialize_violation(violation, db)

    # 7. Broadcast over WebSocket to all connected dashboard screens
    await manager.broadcast({
        "event": "NEW_VIOLATION",
        "data": enriched_data
    })

    return {"status": "SUCCESS", "violation": enriched_data}

@app.get("/api/violations")
def list_violations(
    violation_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    camera_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Violation)

    if violation_type and violation_type != "ALL":
        query = query.filter(Violation.violation_type == violation_type)
    if status_filter and status_filter != "ALL":
        query = query.filter(Violation.status == status_filter)
    if camera_id:
        query = query.filter(Violation.camera_id == camera_id)

    violations = query.order_by(desc(Violation.timestamp)).limit(limit).offset(offset).all()

    # Search filter by plate or owner if requested
    results = []
    for v in violations:
        ser = serialize_violation(v, db)
        if search:
            s_low = search.lower()
            plate_match = s_low in ser["license_plate"].lower()
            owner_match = ser["vehicle"] and s_low in ser["vehicle"]["owner_name"].lower()
            if not (plate_match or owner_match):
                continue
        results.append(ser)

    return results

@app.patch("/api/violations/{violation_id}/status")
async def update_violation_status(
    violation_id: int,
    payload: ViolationUpdateStatus,
    db: Session = Depends(get_db)
):
    viol = db.query(Violation).filter(Violation.id == violation_id).first()
    if not viol:
        raise HTTPException(status_code=404, detail="Violation not found")

    old_status = viol.status
    viol.status = payload.status
    db.commit()
    db.refresh(viol)

    # Audit Log
    audit = AuditLog(
        action=f"STATUS_CHANGE_{payload.status}",
        actor=payload.actor or "Traffic Officer",
        details=f"Violation #{viol.id} changed from {old_status} to {payload.status}. Notes: {payload.notes or 'None'}",
        created_at=datetime.datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    enriched_data = serialize_violation(viol, db)

    # Broadcast update to UI
    await manager.broadcast({
        "event": "VIOLATION_UPDATED",
        "data": enriched_data
    })

    return {"status": "SUCCESS", "violation": enriched_data}

# ==========================================
# STATS & KPI METRICS
# ==========================================
@app.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_today = db.query(Violation).filter(Violation.timestamp >= today_start).count()
    if total_today == 0:
        total_today = db.query(Violation).count()

    # Total fines collected/issued
    fines = db.query(func.sum(Violation.fine_amount)).filter(Violation.status.in_(["VERIFIED", "CHALLAN_ISSUED"])).scalar() or 0
    if fines == 0:
        fines = db.query(func.sum(Violation.fine_amount)).scalar() or 0

    active_cams = db.query(Camera).filter(Camera.status == "ONLINE").count()

    # OCR average accuracy
    avg_conf = db.query(func.avg(Violation.ocr_confidence)).scalar() or 0.94

    # Breakdown by type
    breakdown_rows = db.query(Violation.violation_type, func.count(Violation.id)).group_by(Violation.violation_type).all()
    breakdown = {row[0]: row[1] for row in breakdown_rows}

    # Ensure all primary categories exist
    for key in ["RED_LIGHT_JUMP", "NO_HELMET", "TRIPLE_RIDING", "STOP_LINE_BREACH"]:
        breakdown.setdefault(key, 0)

    return StatsResponse(
        total_violations_today=total_today,
        total_revenue_inr=fines,
        active_cameras=active_cams,
        avg_ocr_confidence=round(float(avg_conf) * 100, 1),
        breakdown_by_type=breakdown,
        recent_activity_count=db.query(Violation).count()
    )

# ==========================================
# SIMULATE VIOLATION (FOR DASHBOARD PRESENTERS)
# ==========================================
@app.post("/api/simulate-violation")
async def simulate_violation(db: Session = Depends(get_db)):
    """Triggers a realistic violation with real full-scene snapshot and vehicle crop"""
    vehicles = db.query(Vehicle).all()
    if not vehicles:
        seed_database()
        vehicles = db.query(Vehicle).all()

    chosen_veh = random.choice(vehicles)
    if chosen_veh.vehicle_type == "Two-Wheeler":
        chosen_type = random.choice(["NO_HELMET", "TRIPLE_RIDING", "RED_LIGHT_ZEBRA_BREACH"])
    else:
        chosen_type = random.choice(["RED_LIGHT_ZEBRA_BREACH", "RED_LIGHT_JUMP", "STOP_LINE_BREACH"])

    cameras = db.query(Camera).all()
    chosen_cam = random.choice(cameras) if cameras else None
    cam_code = chosen_cam.camera_code if chosen_cam else "CAM-01"

    ts_code = int(datetime.datetime.utcnow().timestamp())
    filename_full = f"sim_full_{chosen_veh.license_plate.lower()}_{ts_code}.jpg"
    filename_crop = f"sim_crop_{chosen_veh.license_plate.lower()}_{ts_code}.jpg"
    filepath_full = os.path.join(EVIDENCE_DIR, filename_full)
    filepath_crop = os.path.join(EVIDENCE_DIR, filename_crop)

    # Try extracting a real frame from the active video file
    frame = None
    target_video = None
    if active_video_config["source_type"] == "uploaded" and os.path.exists(UPLOADED_VIDEO_PATH):
        target_video = UPLOADED_VIDEO_PATH
    elif os.path.exists(REAL_SAMPLE_PATH):
        target_video = REAL_SAMPLE_PATH
    elif os.path.exists(DEMO_VIDEO_PATH):
        target_video = DEMO_VIDEO_PATH

    if target_video:
        try:
            vcap = cv2.VideoCapture(target_video)
            total_f = int(vcap.get(cv2.CAP_PROP_FRAME_COUNT) or 100)
            vcap.set(cv2.CAP_PROP_POS_FRAMES, random.randint(10, max(12, total_f - 10)))
            ret, r_frame = vcap.read()
            if ret and r_frame is not None:
                frame = r_frame
            vcap.release()
        except Exception:
            frame = None

    if frame is not None:
        h, w = frame.shape[:2]
        # Detect zebra crossing on real frame
        z_det = ZebraCrossingDetector()
        z_res = z_det.detect(frame)
        frame = z_det.render_overlay(frame, z_res, signal_state="RED")

        # Pick plausible vehicle bounding box near stop line or run YOLO
        vx1, vy1, vx2, vy2 = int(w * 0.35), int(h * 0.45), int(w * 0.65), int(h * 0.78)
        if live_yolo_model is not None:
            try:
                y_res = live_yolo_model(frame, conf=0.3, verbose=False)
                if y_res and len(y_res) > 0 and y_res[0].boxes:
                    for b, cls_id in zip(y_res[0].boxes.xyxy.int().cpu().tolist(), y_res[0].boxes.cls.int().cpu().tolist()):
                        c_name = live_yolo_model.names.get(cls_id, "")
                        if c_name in ["car", "motorcycle", "bus", "truck"]:
                            vx1, vy1, vx2, vy2 = b
                            break
            except Exception:
                pass

        # Annotate full scene frame
        annotated = frame.copy()
        cv2.rectangle(annotated, (vx1, vy1), (vx2, vy2), (0, 0, 255), 3)

        # Header banner
        cv2.rectangle(annotated, (15, 15), (580, 75), (15, 23, 42), -1)
        cv2.rectangle(annotated, (15, 15), (580, 75), (0, 0, 255), 2)
        cv2.putText(annotated, f"VIOLATION: {chosen_type.replace('_', ' ')}", (25, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        cv2.putText(annotated, f"PLATE: {chosen_veh.license_plate} | {chosen_veh.vehicle_model} | {cam_code}", (25, 68),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 235, 255), 1)

        # HSRP Plate badge
        pw, ph = 150, 32
        px = max(10, vx1)
        py = max(10, vy1 - 40)
        cv2.rectangle(annotated, (px, py), (px + pw, py + ph), (255, 255, 255), -1)
        cv2.rectangle(annotated, (px, py), (px + 18, py + ph), (180, 50, 0), -1)
        cv2.putText(annotated, "IND", (px + 2, py + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1)
        cv2.putText(annotated, chosen_veh.license_plate, (px + 24, py + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)

        cv2.imwrite(filepath_full, annotated)

        # High-res vehicle crop with margin
        pad_x = int((vx2 - vx1) * 0.12)
        pad_y = int((vy2 - vy1) * 0.12)
        cx1 = max(0, vx1 - pad_x)
        cy1 = max(0, vy1 - pad_y)
        cx2 = min(w, vx2 + pad_x)
        cy2 = min(h, vy2 + pad_y)
        crop_raw = frame[cy1:cy2, cx1:cx2].copy()

        ch, cw = crop_raw.shape[:2]
        banner_h = 44
        extended_crop = np.zeros((ch + banner_h, max(cw, 280), 3), dtype=np.uint8)
        extended_crop[0:ch, 0:cw] = crop_raw
        cv2.rectangle(extended_crop, (0, ch), (extended_crop.shape[1], ch + banner_h), (15, 23, 42), -1)
        cv2.rectangle(extended_crop, (0, ch), (extended_crop.shape[1], ch + banner_h), (0, 235, 255), 1)
        cv2.putText(extended_crop, f"HSRP: {chosen_veh.license_plate}", (10, ch + 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        cv2.putText(extended_crop, f"VAHAN: {chosen_veh.vehicle_type}", (extended_crop.shape[1] - 130, ch + 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 235, 255), 1)
        cv2.imwrite(filepath_crop, extended_crop)
    else:
        # Fallback to high-quality synthetic generation
        generate_sample_snapshot(filename_full, chosen_veh.license_plate, chosen_type, cam_code)
        generate_sample_snapshot(filename_crop, chosen_veh.license_plate, chosen_type, cam_code)

    req = ViolationCreate(
        camera_code=cam_code,
        camera_id=chosen_cam.id if chosen_cam else 1,
        track_id=random.randint(200, 899),
        violation_type=chosen_type,
        license_plate=chosen_veh.license_plate,
        ocr_confidence=round(random.uniform(0.94, 0.99), 2),
        image_url=f"/evidence/{filename_full}",
        crop_image_url=f"/evidence/{filename_crop}",
        bbox={"x1": 210, "y1": 180, "x2": 510, "y2": 390}
    )

    return await create_violation(req, db)

# ==========================================
# RTO REGISTRY & VEHICLES
# ==========================================
@app.get("/api/vehicles", response_model=List[VehicleResponse])
def get_vehicles(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Vehicle)
    if search:
        s = f"%{search}%"
        query = query.filter((Vehicle.license_plate.ilike(s)) | (Vehicle.owner_name.ilike(s)))
    return query.limit(100).all()

@app.post("/api/vehicles", response_model=VehicleResponse)
def add_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    clean_plate = payload.license_plate.upper().replace(" ", "").replace("-", "")
    existing = db.query(Vehicle).filter(Vehicle.license_plate == clean_plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle with this license plate already exists in RTO registry")

    new_veh = Vehicle(
        license_plate=clean_plate,
        owner_name=payload.owner_name,
        owner_phone=payload.owner_phone,
        owner_email=payload.owner_email,
        vehicle_model=payload.vehicle_model,
        vehicle_type=payload.vehicle_type,
        rto_office=payload.rto_office
    )
    db.add(new_veh)
    db.commit()
    db.refresh(new_veh)
    return new_veh

# ==========================================
# CAMERAS & AUDIT LOGS
# ==========================================
@app.get("/api/cameras", response_model=List[CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()

@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 30, db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()

# ==========================================
# WEBSOCKET STREAM
# ==========================================
@app.websocket("/ws/violations")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                if payload.get("action") == "PING":
                    await websocket.send_json({"event": "PONG", "time": datetime.datetime.utcnow().isoformat()})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# ==========================================
# LIVE CAMERA & VIDEO STREAMING + UPLOAD
# ==========================================
VIDEO_SOURCES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai_engine", "video_sources")
os.makedirs(VIDEO_SOURCES_DIR, exist_ok=True)
DEMO_VIDEO_PATH = os.path.join(VIDEO_SOURCES_DIR, "traffic_demo.mp4")
UPLOADED_VIDEO_PATH = os.path.join(VIDEO_SOURCES_DIR, "uploaded_traffic.mp4")
REAL_SAMPLE_PATH = os.path.join(VIDEO_SOURCES_DIR, "sample_real_traffic.mp4")

active_video_config = {
    "source_type": "sample_real" if os.path.exists(REAL_SAMPLE_PATH) else "demo",  # "sample_real", "webcam", "uploaded", "demo"
    "webcam_index": 0,
    "stop_line_y": 440
}

try:
    from ultralytics import YOLO
    live_yolo_model = YOLO("yolov8n.pt")
except Exception:
    live_yolo_model = None

@app.post("/api/upload-video")
async def upload_traffic_video(file: UploadFile = File(...)):
    """Upload any real traffic video file (.mp4, .avi, .mov) to run live detection"""
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid video format. Please upload .mp4, .avi, or .mov")

    content = await file.read()
    with open(UPLOADED_VIDEO_PATH, "wb") as f:
        f.write(content)

    active_video_config["source_type"] = "uploaded"
    return {
        "status": "SUCCESS",
        "filename": file.filename,
        "message": "Video successfully uploaded and activated as live AI vision source!",
        "source": "uploaded"
    }

@app.post("/api/set-video-source")
def set_video_source(payload: dict):
    """Switch active source between 'sample_real', 'webcam', 'uploaded', and 'demo'"""
    stype = payload.get("source_type", "demo").lower()
    if stype not in ["demo", "webcam", "uploaded", "sample_real"]:
        raise HTTPException(status_code=400, detail="source_type must be 'sample_real', 'demo', 'webcam', or 'uploaded'")

    active_video_config["source_type"] = stype
    if "webcam_index" in payload:
        active_video_config["webcam_index"] = int(payload["webcam_index"])

    return {"status": "SUCCESS", "active_config": active_video_config}

@app.get("/api/video-source")
def get_video_source():
    return {
        "active_source": active_video_config["source_type"],
        "webcam_index": active_video_config["webcam_index"],
        "has_uploaded_video": os.path.exists(UPLOADED_VIDEO_PATH),
        "has_real_sample": os.path.exists(REAL_SAMPLE_PATH),
        "signal_state": traffic_signal_state["state"],
        "stop_line_y": active_video_config.get("stop_line_y", 440),
        "zebra_status": active_video_config.get("zebra_status", "CALIBRATED STOP LINE")
    }

def generate_live_mjpeg_stream():
    """Generator providing live MJPEG stream with real-time YOLOv8 bounding boxes, automatic Zebra Crossing detection, and stop line"""
    current_source = None
    cap = None
    zebra_detector = ZebraCrossingDetector()

    while True:
        target_source = active_video_config["source_type"]

        # Switch VideoCapture if source changed or cap is None
        if target_source != current_source or cap is None or not cap.isOpened():
            if cap is not None:
                cap.release()
            current_source = target_source
            zebra_detector = ZebraCrossingDetector()

            if target_source == "webcam":
                idx = active_video_config.get("webcam_index", 0)
                cap = cv2.VideoCapture(idx)
                if not cap.isOpened():
                    target_source = "sample_real" if os.path.exists(REAL_SAMPLE_PATH) else "demo"
                    cap = cv2.VideoCapture(REAL_SAMPLE_PATH if os.path.exists(REAL_SAMPLE_PATH) else DEMO_VIDEO_PATH)
            elif target_source == "uploaded" and os.path.exists(UPLOADED_VIDEO_PATH):
                cap = cv2.VideoCapture(UPLOADED_VIDEO_PATH)
            elif target_source == "sample_real" and os.path.exists(REAL_SAMPLE_PATH):
                cap = cv2.VideoCapture(REAL_SAMPLE_PATH)
            else:
                cap = cv2.VideoCapture(DEMO_VIDEO_PATH)

        if cap is None or not cap.isOpened():
            time.sleep(0.5)
            continue

        ret, frame = cap.read()
        if not ret:
            # Loop video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue

        h, w = frame.shape[:2]
        sig_state = traffic_signal_state["state"]

        # 1. Automatic Zebra Crossing Detection & Overlay
        zebra_res = zebra_detector.detect(frame)
        if zebra_res.is_detected:
            active_video_config["stop_line_y"] = zebra_res.stop_line_y
            active_video_config["zebra_status"] = zebra_res.status_text
        else:
            active_video_config["zebra_status"] = "CALIBRATED STOP LINE"

        frame = zebra_detector.render_overlay(frame, zebra_res, sig_state)

        # 2. Run real-time YOLOv8 object detection on the frame
        if live_yolo_model is not None:
            try:
                results = live_yolo_model(frame, conf=0.35, verbose=False)
                if results and len(results) > 0:
                    boxes = results[0].boxes
                    if boxes is not None:
                        xyxy = boxes.xyxy.int().cpu().tolist()
                        clss = boxes.cls.int().cpu().tolist()
                        confs = boxes.conf.cpu().tolist()
                        names = live_yolo_model.names

                        for box, cls_idx, score in zip(xyxy, clss, confs):
                            x1, y1, x2, y2 = box
                            c_name = names.get(cls_idx, "object")
                            if c_name in ["car", "motorcycle", "bus", "truck", "person"]:
                                # Box color: Cyan for vehicles, Yellow for persons
                                col = (0, 230, 255) if c_name != "person" else (255, 200, 0)
                                cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
                                label = f"{c_name} {score*100:.0f}%"
                                cv2.putText(frame, label, (x1, max(15, y1 - 6)),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 2)
            except Exception:
                pass

        # 3. Traffic Signal Light Indicator on top right
        sig_bulb = (0, 0, 255) if sig_state == "RED" else (0, 255, 0)
        cv2.circle(frame, (w - 50, 45), 18, sig_bulb, -1)
        cv2.circle(frame, (w - 50, 45), 20, (255, 255, 255), 2)
        cv2.putText(frame, sig_state, (w - 115, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.55, sig_bulb, 2)

        # 4. Source Watermark Banner
        src_label = "LIVE WEBCAM (NODE 0)" if current_source == "webcam" else ("UPLOADED TRAFFIC VIDEO" if current_source == "uploaded" else "SAMPLE REAL TRAFFIC (1080p)")
        cv2.rectangle(frame, (10, 10), (450, 45), (15, 23, 42), -1)
        cv2.rectangle(frame, (10, 10), (450, 45), (0, 200, 255), 1)
        cv2.putText(frame, f"FEED: {src_label}", (20, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 235, 255), 1)

        # Encode to JPEG for MJPEG stream
        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

        time.sleep(0.035)

        time.sleep(0.035)

@app.get("/api/video-feed")
def get_video_feed():
    """Serves real-time MJPEG live stream from webcam, uploaded video, or demo clip"""
    return StreamingResponse(
        generate_live_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

