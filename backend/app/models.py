import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="officer")  # admin, officer, viewer
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_code = Column(String(30), unique=True, index=True, nullable=False)  # e.g., CAM-01
    location_name = Column(String(150), nullable=False)  # Silk Board Junction
    junction_coords = Column(String(50), nullable=True)  # 12.9176° N, 77.6238° E
    status = Column(String(20), default="ONLINE")  # ONLINE, OFFLINE, MAINTENANCE

    violations = relationship("Violation", back_populates="camera")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String(20), unique=True, index=True, nullable=False)  # e.g., KA01AB1234
    owner_name = Column(String(100), nullable=False)
    owner_phone = Column(String(20), nullable=False)
    owner_email = Column(String(100), nullable=True)
    vehicle_model = Column(String(100), nullable=False)
    vehicle_type = Column(String(50), nullable=False)  # Two-Wheeler, Four-Wheeler, Commercial, Bus
    rto_office = Column(String(150), nullable=False)

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, nullable=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    violation_type = Column(String(50), nullable=False)  # RED_LIGHT_JUMP, NO_HELMET, TRIPLE_RIDING, STOP_LINE_BREACH, SPEEDING
    license_plate = Column(String(20), index=True, nullable=False)
    ocr_confidence = Column(Float, default=0.0)
    fine_amount = Column(Integer, default=1000)
    status = Column(String(30), default="PENDING")  # PENDING, VERIFIED, CHALLAN_ISSUED, DISMISSED
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    camera = relationship("Camera", back_populates="violations")
    evidence = relationship("Evidence", back_populates="violation", cascade="all, delete-orphan", uselist=False)
    notifications = relationship("Notification", back_populates="violation", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    crop_image_url = Column(String(255), nullable=True)  # Real vehicle & HSRP plate crop
    bbox_json = Column(Text, nullable=True)  # JSON string of coordinates

    violation = relationship("Violation", back_populates="evidence")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(Integer, ForeignKey("violations.id"), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    channel = Column(String(20), default="SMS")  # SMS, WHATSAPP, EMAIL
    message_body = Column(Text, nullable=False)
    delivery_status = Column(String(20), default="DELIVERED")  # SENT, DELIVERED, FAILED
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    violation = relationship("Violation", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)  # VIOLATION_INGESTED, CHALLAN_APPROVED, SIGNAL_CHANGED, etc.
    actor = Column(String(50), default="AI_VISION_PIPELINE")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
