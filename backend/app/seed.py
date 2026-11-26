import os
import json
import datetime
from PIL import Image, ImageDraw, ImageFont
from .database import engine, SessionLocal, Base
from .models import User, Camera, Vehicle, Violation, Evidence, Notification, AuditLog
from .auth import get_password_hash

# Path for saving evidence snapshots
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence_snapshots")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

def generate_sample_snapshot(filename: str, plate: str, violation_type: str, camera_code: str, bbox: dict = None):
    """Generates an authentic-looking traffic camera violation snapshot with overlays"""
    filepath = os.path.join(EVIDENCE_DIR, filename)
    if os.path.exists(filepath):
        return filename

    # Create dark asphalt/traffic background
    width, height = 720, 480
    image = Image.new("RGB", (width, height), color=(28, 32, 42))
    draw = ImageDraw.Draw(image)

    # Road lanes & markings
    draw.rectangle([0, 160, width, height], fill=(38, 43, 54))
    # Dashed lane divider
    for y in range(180, height, 40):
        draw.line([(width // 2, y), (width // 2, y + 20)], fill=(200, 200, 200), width=4)
    # Stop line (Virtual / Physical road stop line)
    draw.line([(60, 320), (width - 60, 320)], fill=(255, 69, 58), width=6)
    draw.text((70, 325), "STOP LINE (VIRTUAL RULE ZONE)", fill=(255, 80, 80))

    # Vehicle body representation
    vx, vy, vw, vh = 240, 210, 240, 160
    if "HELMET" in violation_type or "TRIPLE" in violation_type:
        # Motorcycle representation
        draw.rectangle([vx + 50, vy + 40, vx + 190, vy + 150], fill=(20, 60, 120), outline=(0, 200, 255), width=2)
        # Wheels
        draw.ellipse([vx + 60, vy + 120, vx + 100, vy + 160], fill=(15, 15, 15), outline=(100, 100, 100), width=3)
        draw.ellipse([vx + 140, vy + 120, vx + 180, vy + 160], fill=(15, 15, 15), outline=(100, 100, 100), width=3)
        # Rider head without helmet (red circle indicator)
        draw.ellipse([vx + 100, vy, vx + 140, vy + 40], fill=(220, 160, 120), outline=(255, 0, 0), width=3)
        draw.text((vx + 70, vy - 18), "NO HELMET DETECTED", fill=(255, 80, 80))
    else:
        # Car representation
        draw.rounded_rectangle([vx, vy, vx + vw, vy + vh], radius=12, fill=(45, 55, 72), outline=(100, 116, 139), width=2)
        # Windshield
        draw.rectangle([vx + 20, vy + 15, vx + vw - 20, vy + 55], fill=(70, 90, 120))
        # Tail lights
        draw.ellipse([vx + 15, vy + 75, vx + 35, vy + 95], fill=(230, 30, 30))
        draw.ellipse([vx + vw - 35, vy + 75, vx + vw - 15, vy + 95], fill=(230, 30, 30))

    # Bounding Box (Crisp Red Alert)
    box_x1, box_y1 = vx - 10, vy - 20
    box_x2, box_y2 = vx + vw + 10, vy + vh + 10
    draw.rectangle([box_x1, box_y1, box_x2, box_y2], outline=(239, 68, 68), width=3)
    # Target corner markers
    corner_len = 16
    draw.line([(box_x1, box_y1), (box_x1 + corner_len, box_y1)], fill=(0, 255, 255), width=4)
    draw.line([(box_x1, box_y1), (box_x1, box_y1 + corner_len)], fill=(0, 255, 255), width=4)
    draw.line([(box_x2, box_y2), (box_x2 - corner_len, box_y2)], fill=(0, 255, 255), width=4)
    draw.line([(box_x2, box_y2), (box_x2, box_y2 - corner_len)], fill=(0, 255, 255), width=4)

    # Indian HSRP License Plate Rendered on Vehicle
    plate_w, plate_h = 160, 36
    px1, py1 = vx + (vw - plate_w) // 2, vy + vh - 45
    px2, py2 = px1 + plate_w, py1 + plate_h
    # Plate base (White for private, Yellow for commercial)
    plate_bg = (255, 255, 255)
    draw.rounded_rectangle([px1, py1, px2, py2], radius=4, fill=plate_bg, outline=(30, 30, 30), width=2)
    # Blue IND strip on left
    draw.rectangle([px1, py1, px1 + 18, py2], fill=(0, 51, 153))
    draw.text((px1 + 2, py1 + 8), "IND", fill=(255, 255, 255))
    # Plate text
    draw.text((px1 + 24, py1 + 8), plate, fill=(10, 10, 10))

    # Violation Overlay Pill on Top Left
    draw.rounded_rectangle([18, 18, 380, 58], radius=6, fill=(15, 23, 42, 230), outline=(239, 68, 68), width=2)
    draw.ellipse([30, 32, 44, 46], fill=(239, 68, 68))
    draw.text((54, 28), f"VIOLATION: {violation_type.replace('_', ' ')}", fill=(255, 255, 255))

    # Timestamp & Node telemetry watermark at bottom
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
    draw.rounded_rectangle([18, height - 42, width - 18, height - 12], radius=4, fill=(15, 23, 42, 200))
    telemetry = f"NODE: {camera_code} | YOLOv8-ByteTrack | OCR CONF: 96.4% | {now_str} | FPS: 29.8"
    draw.text((28, height - 32), telemetry, fill=(148, 163, 184))

    image.save(filepath, "JPEG", quality=90)
    return filename

def seed_database():
    """Seeds default users, cameras, vehicles, violations, and notifications"""
    print("[Seed] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Admin & Officer Users
        if not db.query(User).filter(User.username == "admin").first():
            admin_user = User(
                username="admin",
                email="admin@traffic.smartcity.gov.in",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            officer_user = User(
                username="officer_sharma",
                email="sharma.traffic@smartcity.gov.in",
                hashed_password=get_password_hash("officer123"),
                role="officer"
            )
            db.add_all([admin_user, officer_user])
            db.commit()
            print("[Seed] Created default users: 'admin' and 'officer_sharma'")

        # 2. Cameras
        cameras_data = [
            {"camera_code": "CAM-01", "location_name": "Silk Board Junction, Outer Ring Rd", "junction_coords": "12.9176° N, 77.6238° E", "status": "ONLINE"},
            {"camera_code": "CAM-02", "location_name": "Hebbal Flyover Expressway", "junction_coords": "13.0358° N, 77.5970° E", "status": "ONLINE"},
            {"camera_code": "CAM-03", "location_name": "MG Road - Brigade Junction", "junction_coords": "12.9744° N, 77.6080° E", "status": "ONLINE"},
            {"camera_code": "CAM-04", "location_name": "Marathahalli Bridge South", "junction_coords": "12.9569° N, 77.7011° E", "status": "ONLINE"}
        ]
        camera_map = {}
        for cam in cameras_data:
            existing = db.query(Camera).filter(Camera.camera_code == cam["camera_code"]).first()
            if not existing:
                c_obj = Camera(**cam)
                db.add(c_obj)
                db.commit()
                db.refresh(c_obj)
                camera_map[cam["camera_code"]] = c_obj
            else:
                camera_map[cam["camera_code"]] = existing
        print(f"[Seed] Verified {len(cameras_data)} camera nodes.")

        # 3. Mock Indian RTO / VAHAN Registered Vehicles
        vehicles_data = [
            {
                "license_plate": "KA01AB1234",
                "owner_name": "Rajesh Kumar",
                "owner_phone": "+91 98801 23456",
                "owner_email": "rajesh.k@gmail.com",
                "vehicle_model": "Royal Enfield Classic 350",
                "vehicle_type": "Two-Wheeler",
                "rto_office": "KA-01 Koramangala RTO, Bengaluru"
            },
            {
                "license_plate": "KA05MH8899",
                "owner_name": "Priya Sundaram",
                "owner_phone": "+91 97412 88990",
                "owner_email": "priya.s@yahoo.com",
                "vehicle_model": "Honda Activa 6G",
                "vehicle_type": "Two-Wheeler",
                "rto_office": "KA-05 Jayanagar RTO, Bengaluru"
            },
            {
                "license_plate": "KA03NC4501",
                "owner_name": "Vikramaditya Hegde",
                "owner_phone": "+91 99003 45012",
                "owner_email": "vikram.hegde@techcorp.in",
                "vehicle_model": "Hyundai Creta SX(O)",
                "vehicle_type": "Four-Wheeler",
                "rto_office": "KA-03 Indiranagar RTO, Bengaluru"
            },
            {
                "license_plate": "KA04MK7712",
                "owner_name": "Suresh Babu",
                "owner_phone": "+91 98450 77123",
                "owner_email": "suresh.babu@outlook.com",
                "vehicle_model": "Tata Nexon EV",
                "vehicle_type": "Four-Wheeler",
                "rto_office": "KA-04 Yeshwanthpur RTO, Bengaluru"
            },
            {
                "license_plate": "AP39BQ9021",
                "owner_name": "K. Venkat Rao",
                "owner_phone": "+91 94401 90210",
                "owner_email": "venkat.rao@gmail.com",
                "vehicle_model": "KTM Duke 250",
                "vehicle_type": "Two-Wheeler",
                "rto_office": "AP-39 Tirupati RTO, Andhra Pradesh"
            },
            {
                "license_plate": "KA51MB3321",
                "owner_name": "Mohammed Farooq",
                "owner_phone": "+91 96112 33214",
                "owner_email": "farooq.m@gmail.com",
                "vehicle_model": "Toyota Innova Crysta",
                "vehicle_type": "Commercial",
                "rto_office": "KA-51 Electronic City RTO, Bengaluru"
            },
            {
                "license_plate": "MH02CD6645",
                "owner_name": "Ananya Deshmukh",
                "owner_phone": "+91 98201 66450",
                "owner_email": "ananya.d@gmail.com",
                "vehicle_model": "Maruti Swift ZXi",
                "vehicle_type": "Four-Wheeler",
                "rto_office": "MH-02 Andheri RTO, Mumbai"
            },
            {
                "license_plate": "DL01CA1102",
                "owner_name": "Arvind Malhotra",
                "owner_phone": "+91 98102 11020",
                "owner_email": "arvind.m@gmail.com",
                "vehicle_model": "Mahindra Thar 4x4",
                "vehicle_type": "Four-Wheeler",
                "rto_office": "DL-01 Mall Road RTO, New Delhi"
            }
        ]

        for v in vehicles_data:
            existing = db.query(Vehicle).filter(Vehicle.license_plate == v["license_plate"]).first()
            if not existing:
                db.add(Vehicle(**v))
        db.commit()
        print(f"[Seed] Verified {len(vehicles_data)} Indian VAHAN/RTO registered vehicles.")

        # 4. Sample Violations + Evidence + Notifications + Audit Logs
        if db.query(Violation).count() == 0:
            sample_violations = [
                {
                    "track_id": 104,
                    "cam_code": "CAM-01",
                    "violation_type": "RED_LIGHT_JUMP",
                    "license_plate": "KA03NC4501",
                    "ocr_confidence": 0.96,
                    "fine_amount": 1000,
                    "status": "CHALLAN_ISSUED",
                    "timestamp": datetime.datetime.utcnow() - datetime.timedelta(minutes=42),
                    "filename": "violation_ka03nc4501_redlight.jpg",
                    "sms_text": "Traffic Alert: E-Challan #CH-88219 issued to vehicle KA03NC4501 for RED LIGHT JUMP at Silk Board Junction. Fine: INR 1000. Pay online at https://bangaloretrafficpolice.gov.in"
                },
                {
                    "track_id": 112,
                    "cam_code": "CAM-01",
                    "violation_type": "NO_HELMET",
                    "license_plate": "KA01AB1234",
                    "ocr_confidence": 0.94,
                    "fine_amount": 500,
                    "status": "VERIFIED",
                    "timestamp": datetime.datetime.utcnow() - datetime.timedelta(minutes=28),
                    "filename": "violation_ka01ab1234_nohelmet.jpg",
                    "sms_text": "Traffic Alert: E-Challan #CH-88220 issued to vehicle KA01AB1234 for RIDING WITHOUT HELMET at Silk Board Junction. Fine: INR 500. Pay online at https://bangaloretrafficpolice.gov.in"
                },
                {
                    "track_id": 128,
                    "cam_code": "CAM-02",
                    "violation_type": "STOP_LINE_BREACH",
                    "license_plate": "KA04MK7712",
                    "ocr_confidence": 0.91,
                    "fine_amount": 500,
                    "status": "PENDING",
                    "timestamp": datetime.datetime.utcnow() - datetime.timedelta(minutes=14),
                    "filename": "violation_ka04mk7712_stopline.jpg",
                    "sms_text": "Traffic Notice: Violation detected for vehicle KA04MK7712 (STOP LINE BREACH) at Hebbal Flyover. Under verification by traffic control room."
                },
                {
                    "track_id": 145,
                    "cam_code": "CAM-03",
                    "violation_type": "TRIPLE_RIDING",
                    "license_plate": "AP39BQ9021",
                    "ocr_confidence": 0.89,
                    "fine_amount": 1000,
                    "status": "PENDING",
                    "timestamp": datetime.datetime.utcnow() - datetime.timedelta(minutes=5),
                    "filename": "violation_ap39bq9021_triple.jpg",
                    "sms_text": "Traffic Alert: Violation recorded for AP39BQ9021 (TRIPLE RIDING) at MG Road Junction. Fine: INR 1000."
                }
            ]

            for item in sample_violations:
                cam = camera_map.get(item["cam_code"])
                # Generate snapshot image
                generate_sample_snapshot(
                    filename=item["filename"],
                    plate=item["license_plate"],
                    violation_type=item["violation_type"],
                    camera_code=item["cam_code"]
                )

                viol = Violation(
                    track_id=item["track_id"],
                    camera_id=cam.id,
                    violation_type=item["violation_type"],
                    license_plate=item["license_plate"],
                    ocr_confidence=item["ocr_confidence"],
                    fine_amount=item["fine_amount"],
                    status=item["status"],
                    timestamp=item["timestamp"]
                )
                db.add(viol)
                db.commit()
                db.refresh(viol)

                # Evidence record
                ev = Evidence(
                    violation_id=viol.id,
                    image_url=f"/evidence/{item['filename']}",
                    bbox_json=json.dumps({"x1": 230, "y1": 190, "x2": 490, "y2": 380})
                )
                db.add(ev)

                # Notification record
                veh = db.query(Vehicle).filter(Vehicle.license_plate == item["license_plate"]).first()
                phone = veh.owner_phone if veh else "+91 98800 00000"
                notif = Notification(
                    violation_id=viol.id,
                    recipient_phone=phone,
                    channel="SMS",
                    message_body=item["sms_text"],
                    delivery_status="DELIVERED",
                    sent_at=item["timestamp"] + datetime.timedelta(seconds=4)
                )
                db.add(notif)

                # Audit log
                audit = AuditLog(
                    action=f"VIOLATION_{item['status']}",
                    actor="AI_VISION_PIPELINE",
                    details=f"Track #{item['track_id']} flagged for {item['violation_type']}. Plate: {item['license_plate']}",
                    created_at=item["timestamp"]
                )
                db.add(audit)

            db.commit()
            print(f"[Seed] Successfully seeded {len(sample_violations)} rich initial violations.")

    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
