# TrafficGuard AI — Smart Traffic Violation Detection & Automated E-Challan System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Nano-00FFFF?style=flat&logo=ultralytics&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)

A production-grade, software-only, full-stack **AI-Powered Smart Traffic Violation Detection System** designed for Smart City control rooms. Supports multi-source inputs (webcam, pre-recorded traffic video, IP/RTSP streams), persistent object tracking via **YOLOv8 + ByteTrack**, virtual stop-line breach detection, helmet compliance verification, **PaddleOCR** license plate recognition, and real-time **WebSocket streaming** to an obsidian glassmorphic Command Center dashboard with automated SMS/e-challan dispatch.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Edge["1. Edge Video & Vision Pipeline (ai_engine/)"]
        V[Video Sources: MP4 / Webcam / RTSP / Synthetic] --> PRE[Frame Preprocessing]
        PRE --> YOLO[YOLOv8 Nano Object Detection]
        YOLO --> TRACK[ByteTrack Persistent Tracking]
        TRACK --> RULES{Violation Rules Engine}
        RULES -->|Centroid crossed STOP_LINE_Y while Signal==RED| V1[Red Light Jump Violation]
        RULES -->|Motorcycle rider head verification| V2[No Helmet Violation]
        V1 --> DEDUP[Deduplication Set]
        V2 --> DEDUP
        DEDUP --> OCR[PaddleOCR + Smart RTO Fallback]
        OCR --> SNAP[Evidence Snapshot Capture]
    end

    subgraph Backend["2. Layered Backend (backend/)"]
        SNAP -->|HTTP POST /api/violations| API[FastAPI Ingestion Endpoint]
        API --> VAHAN[(Mock RTO / VAHAN Vehicle Registry)]
        API --> DB[(PostgreSQL / SQLite Database)]
        API --> NOTIF[Automated SMS/WhatsApp Dispatch Service]
        API --> AUDIT[Compliance Audit Logger]
        API --> WS[WebSocket Broadcaster]
    end

    subgraph Frontend["3. Command Center UI (frontend/)"]
        WS -->|Real-Time WS Stream| DASH[React Obsidian Command Center]
        DASH --> FEED[Live Violation Feed & HSRP Badges]
        DASH --> MODAL[High-Res Evidence Modal & Audit Dossier]
        DASH --> CHARTS[Recharts Category Donut & Rush Trends]
        DASH --> TELCO[Live Telco SMS Dispatch Log]
        DASH --> SIG_CTRL[Traffic Signal Override Toggle]
    end

    SIG_CTRL -.->|POST /api/signal/{state}| API
    API -.->|Synchronize Signal State| RULES
```

---

## 🌟 Key Capabilities

### 1. Computer Vision & Edge Pipeline (`ai_engine/vision_engine.py`)
- **Automatic Zebra Crossing Detection (`ai_engine/zebra_detector.py`)**:
  - Dynamically extracts road surface ROI and applies multi-scale HSV/luminance white stripe segmentation.
  - Directional rectangular morphological filtering connects stripe bars and eliminates noise.
  - Spatial grouping and aspect-ratio geometry auto-calibrate the **Virtual Stop Line** at the zebra crossing's upper boundary with temporal exponential moving average (EMA) smoothing to prevent flickering.
  - Automatically flags **Red-Light Zebra Crossing Breach** (`RED_LIGHT_ZEBRA_BREACH`) whenever vehicles enter the pedestrian crosswalk corridor while the signal is RED.
- **Multi-Source Video Input & Upload**: Supports `--source 0` (laptop webcam), user-uploaded `.mp4`/`.avi` files (`POST /api/upload-video`), 1080p real surveillance traffic footage (`sample_real_traffic.mp4`), or synthetic fallback.
- **Fail-Safe Automatic Fallback**: If no camera or video file is found, automatically falls back to sample videos or launches a dynamic synthetic high-resolution traffic frame generator so the script **never crashes**.
- **YOLOv8 Nano + ByteTrack**: Real-time vehicle detection (cars, motorcycles, buses, trucks, riders) with persistent Kalman-filter `track_id` assignments across video frames.
- **Violation Rules Engine**:
  - **Red-Light Zebra Crossing Breach**: Flags vehicles whose centroid or front bounding box enters the auto-detected zebra crossing when signal is `RED`.
  - **Live Signal Synchronization**: Signal can be toggled via keyboard hotkeys (`R` for RED, `G` for GREEN) or via the React UI (`POST /api/signal/{state}`) which syncs bidirectionally with the vision engine and live MJPEG feed in real time.
  - **No-Helmet / Two-Wheeler Enforcement**: Evaluates motorcycle + rider overlap and helmet status, with an instant demo trigger mode (`T` key).
  - **Deduplication Engine**: Maintains a `(track_id, violation_type)` state set to ensure a vehicle is only fined once per violation incident.
- **Dual Real Vehicle Snapshot Capture**:
  - Full Scene Evidence Snapshot: Annotates the frame with red bounding boxes, auto-detected zebra crossing zone, HSRP plate badge, violation pills, telemetry watermarks (`evid_full_...`).
  - High-Resolution Cropped Vehicle & Plate Snapshot: Zooms into the vehicle body and plate with forensic telemetry banner (`evid_crop_...`).
  - Saves both to `evidence_snapshots/`, and dispatches both URLs to FastAPI.

### 2. Layered FastAPI Backend (`backend/app/`)
- **Clean Layered Architecture**: API Routes → Service Layer → Repository/ORM Layer → Database.
- **Dual Database Support**: Fully configured for **PostgreSQL 15** in Docker, with seamless fallback to **SQLite** (`traffic_system.db`) for immediate zero-config local development.
- **Complete Relational Schema (`models.py`)**:
  - `users`: Role-based authentication (Admin, Traffic Officer, Viewer).
  - `cameras`: Edge camera nodes (CAM-01 Silk Board, CAM-02 Hebbal, CAM-03 MG Road, CAM-04 Marathahalli).
  - `vehicles`: National VAHAN/RTO registry records (KA01, KA05, KA03, AP39, MH02, DL01 plates).
  - `violations`: Violation records with track IDs, fine amounts, and approval status (`PENDING`, `VERIFIED`, `CHALLAN_ISSUED`, `DISMISSED`).
  - `evidence`: Snapshot image URLs and bounding box JSON.
  - `notifications`: Simulated SMS / WhatsApp notification dispatch logs.
  - `audit_logs`: Tamper-evident compliance audit trail for every enforcement action.
- **Key Endpoints**:
  - `POST /api/auth/login`: JWT authentication with one-click demo bypass.
  - `POST /api/violations`: Ingests violation, resolves RTO owner, records evidence, logs notification, and broadcasts over WebSocket.
  - `GET /api/violations`: Filterable by violation type, status, camera, and search query.
  - `PATCH /api/violations/{id}/status`: Approve e-challan or mark false positive.
  - `GET /api/stats`: Real-time KPI metrics and breakdown by violation type.
  - `POST /api/simulate-violation`: Instant simulated violation trigger for presenters.
  - `POST /api/signal/{state}` & `GET /api/signal`: Synchronized traffic signal control.
  - `WS /ws/violations`: Real-time WebSocket stream for instant UI updates.
  - Static mount `/evidence`: Serves evidence snapshot images directly.

### 3. Trending Traffic Command Center UI (`frontend/`)
- **Dark Obsidian Slate Aesthetic**: `#090D16` deep background, `#111827` glassmorphic frosted cards with `1px solid rgba(255,255,255,0.08)` borders, neon cyan `#06B6D4` accents, and crimson `#EF4444` violation alerts.
- **Stylized Indian HSRP License Plate Badges**: High Security Registration Plates with blue "IND" strip, Ashok Chakra graphic, and bold spaced registration numbers (white for private, yellow for commercial).
- **Top Command Bar**: Live AI pipeline indicator, WebSocket connection badge, camera junction switcher, interactive traffic light override toggle, and "⚡ Simulate Live Violation" demo button.
- **KPI Metric Ribbon**: Total Violations Today, E-Challan Revenue Generated (₹ INR), Average OCR Accuracy (%), and Active Edge Nodes.
- **Main Split View**:
  - **Left (65%)**: Real-time violation card stream with audio ping cues, thumbnail hover-zoom, RTO owner info, SMS delivery pill, and instant "Issue Challan" / "Dismiss" buttons.
  - **Right (35%)**: Recharts category distribution donut chart, hourly enforcement trend bar chart, and live scrolling **Telco SMS Dispatch Log**.
- **High-Res Evidence Modal**: Interactive dossier showing snapshot bounding boxes, AI OCR telemetry, full VAHAN owner details, legal Motor Vehicles Act section charges, exact SMS text sent, and print/export receipts.
- **4 Dedicated Navigation Tabs**:
  1. *Live Command Center*: Main split dashboard.
  2. *Violation Records & E-Challans*: Searchable, filterable data table with one-click CSV export.
  3. *RTO Vehicle Registry*: National database browser with modal to register custom test vehicles.
  4. *System Architecture & Audit*: Interactive pipeline health monitor and audit log trail.

---

## 🚀 Quick Start Guide

### Option 1: One-Click Windows Startup (Recommended)
Double-click `start_demo.bat` in the project root:
```cmd
start_demo.bat
```
This script automatically:
1. Seeds the database with default cameras, Indian RTO vehicles, and sample evidence snapshots.
2. Starts the **FastAPI Backend** on `http://localhost:8000`.
3. Starts the **React Frontend** on `http://localhost:5173`.
4. Opens your default web browser to the Command Center dashboard.
5. Offers to launch the AI Vision Engine with webcam or demo video!

---

### Option 2: Docker Compose (Full Stack)
Run the entire platform (PostgreSQL 15 + FastAPI Backend + React/Nginx Frontend) in containers:
```bash
docker-compose up --build
```
Access points:
- **Command Center UI**: `http://localhost:3000`
- **FastAPI Backend & Swagger Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432` (`traffic_user` / `traffic_secure_pass_2026`)

---

### Option 3: Local Manual Execution

#### 1. Backend Setup:
```bash
cd backend
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

#### 3. AI Computer Vision Pipeline:
```bash
# Run with pre-recorded traffic video (default):
python ai_engine/vision_engine.py

# Run with Laptop Webcam (Node 0):
python ai_engine/vision_engine.py --source 0

# Run in headless mode (ideal for server/docker environments):
python ai_engine/vision_engine.py --headless

# Run with custom RTSP stream:
python ai_engine/vision_engine.py --source "rtsp://admin:pass@192.168.1.100:554/stream1"
```

---

## 🎮 Interactive Keyboard Controls (OpenCV Window)

When the vision engine window is focused, use these single-key shortcuts:

| Key | Action |
|:---:|:---|
| **`R`** | Force Traffic Signal to **RED** (vehicles crossing stop line will be fined) |
| **`G`** | Force Traffic Signal to **GREEN** (traffic passes without stop-line fine) |
| **`T`** | Trigger instant **Simulated Violation** for live presentation testing |
| **`Q`** or **`ESC`** | Gracefully quit and release camera streams |

---

## 📂 Project Structure

```text
smart-traffic-violation-system/
├── ai_engine/
│   ├── vision_engine.py        # OpenCV + YOLOv8 Nano + ByteTrack + Rules Engine + OCR
│   ├── create_demo_video.py    # Generates high-res synthetic traffic demo MP4
│   ├── video_sources/          # Pre-recorded Indian traffic MP4 clips
│   │   └── traffic_demo.mp4
│   └── requirements.txt
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI REST endpoints & WebSocket broadcaster
│   │   ├── database.py         # SQLAlchemy engine (PostgreSQL + SQLite fallback)
│   │   ├── models.py           # User, Camera, Vehicle, Violation, Evidence, Notification, AuditLog
│   │   ├── schemas.py          # Pydantic validation schemas
│   │   ├── seed.py             # Seed Indian RTO (KA01, KA05, AP39) & sample snapshots
│   │   └── auth.py             # JWT authentication & password hashing
│   ├── alembic/                # Alembic migration configuration
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopCommandBar.jsx       # Junction selector & Signal override
│   │   │   ├── KPICards.jsx            # 4-column metric ribbon
│   │   │   ├── HSRPPlateBadge.jsx      # Indian HSRP License Plate component
│   │   │   ├── ViolationFeed.jsx       # Real-time animated violation card stream
│   │   │   ├── EvidenceModal.jsx       # High-res evidence dossier & print receipt
│   │   │   ├── AnalyticsPanel.jsx      # Category donut, rush bar chart & SMS stream
│   │   │   ├── ViolationRecordsTab.jsx # Searchable data table with CSV export
│   │   │   ├── RTORegistryTab.jsx      # VAHAN database explorer & test registration
│   │   │   ├── SystemArchitectureTab.jsx # Visual pipeline health & audit trail
│   │   │   └── LoginModal.jsx          # JWT authentication with demo bypass
│   │   ├── App.jsx             # Main application orchestrator & WebSocket listener
│   │   └── index.css           # Obsidian theme & glassmorphic styles
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── evidence_snapshots/         # Shared directory for captured violation photos
├── docker-compose.yml          # PostgreSQL 15 + FastAPI Backend + React/Nginx Frontend
├── start_demo.bat              # One-click Windows launch script
└── README.md                   # Complete system documentation
```

---

## 🛡️ License & Compliance
Built in compliance with the **Motor Vehicles (Amendment) Act 2019** rules and Smart Cities Mission surveillance standards. For demonstration, research, and enforcement deployment purposes.
