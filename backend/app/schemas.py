import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str
    role: str = "officer"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# Camera Schemas
class CameraBase(BaseModel):
    camera_code: str
    location_name: str
    junction_coords: Optional[str] = None
    status: str = "ONLINE"

class CameraResponse(CameraBase):
    id: int

    class Config:
        from_attributes = True

# Vehicle Schemas
class VehicleBase(BaseModel):
    license_plate: str
    owner_name: str
    owner_phone: str
    owner_email: Optional[str] = None
    vehicle_model: str
    vehicle_type: str
    rto_office: str

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int

    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceBase(BaseModel):
    image_url: str
    crop_image_url: Optional[str] = None
    bbox_json: Optional[str] = None

class EvidenceResponse(EvidenceBase):
    id: int
    violation_id: int

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    recipient_phone: str
    channel: str = "SMS"
    message_body: str
    delivery_status: str = "DELIVERED"

class NotificationResponse(NotificationBase):
    id: int
    violation_id: int
    sent_at: datetime.datetime

    class Config:
        from_attributes = True

# Violation Schemas
class ViolationCreate(BaseModel):
    camera_code: Optional[str] = "CAM-01"
    camera_id: Optional[int] = None
    track_id: Optional[int] = None
    violation_type: str
    license_plate: str
    ocr_confidence: float = 0.85
    fine_amount: Optional[int] = None
    image_url: Optional[str] = None
    crop_image_url: Optional[str] = None
    bbox: Optional[Dict[str, Any]] = None

class ViolationUpdateStatus(BaseModel):
    status: str  # VERIFIED, CHALLAN_ISSUED, DISMISSED
    actor: Optional[str] = "Traffic Officer"
    notes: Optional[str] = None

class ViolationResponse(BaseModel):
    id: int
    track_id: Optional[int]
    camera_id: int
    camera_code: Optional[str] = None
    location_name: Optional[str] = None
    violation_type: str
    license_plate: str
    ocr_confidence: float
    fine_amount: int
    status: str
    timestamp: datetime.datetime
    evidence: Optional[EvidenceResponse] = None
    vehicle: Optional[VehicleResponse] = None
    notifications: List[NotificationResponse] = []

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    action: str
    actor: str
    details: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Stats Schema
class StatsResponse(BaseModel):
    total_violations_today: int
    total_revenue_inr: int
    active_cameras: int
    avg_ocr_confidence: float
    breakdown_by_type: Dict[str, int]
    recent_activity_count: int

# Signal Toggle Schema
class SignalStatusResponse(BaseModel):
    state: str  # RED, GREEN
    last_updated: datetime.datetime
    updated_by: str
