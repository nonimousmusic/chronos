# 🧠 Vital_Shield AI — Surgical Black Box & Sentinel Monitor

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-Production-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)
![Built with](https://img.shields.io/badge/built%20with-React%20%7C%20FastAPI%20%7C%20BigQuery-blue?style=flat-square)

**A production-grade, end-to-end surgical monitoring and data integrity system with cryptographic hash chaining.**

[🌎 Live Demo](https://synapse-gtb.vercel.app) • [📖 Documentation](#documentation) • [🚀 Getting Started](#getting-started) • [👥 Team](#team)

</div>

---

## 🎯 Problem & Solution

**The Challenge:** Medical records and surgical videos stored in plain files can be silently altered or corrupted without detection, creating liability issues and loss of truth.

**Our Solution:** Synapse_GTB creates an immutable **cryptographic seal** for every second of surgery. Each frame links to the previous one in an unbreakable hash chain—if even one pixel changes, the system detects it instantly.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🖥️ **Sentinel Monitoring Dashboard**
- ⏱️ Real-time vitals synchronization
- 📊 Magnetic timeline navigation
- 🎨 Glassmorphism UI design
- ♿ Accessibility-first for OR environments

</td>
<td width="50%">

### 🔐 **Cryptographic Integrity**
- 🔗 SHA-256 hash chaining
- 🌳 Merkle tree batching
- ✅ Interactive verifier
- 📍 Blockchain anchoring

</td>
</tr>
<tr>
<td width="50%">

### 🏥 **Chronos ML Predictive Engine**
- 🧠 XGBoost 77-feature inference
- 🔮 Sepsis, shock, & arrest forecasting
- 💡 SHAP real-time explainability
- 📉 Real-world physiological random walks

</td>
<td width="50%">

### ⚡ **Serverless & Extensible**
- 🌩️ Vercel stateless deployment
- 📦 FastAPI lightweight backend
- 🗄️ JSON-based temporal datastores
- 🔄 Seamless mock generation
</td>
</tr>
<tr>
<td>

### 🧪 **Tamper Detection & Analysis**
- 🎮 Simulation mode for demos
- 🔍 Root cause analysis
- 📈 Expected vs. Actual hashes
- 🚨 Automated alarm system

</td>
<td>

### 🧠 **Risk Prediction (Chronos)**
- 🎯 12-hour horizon predictions
- 📊 XGBoost & survival models
- 💡 SHAP explainability
- 📉 Temporal trajectory analysis

</td>
</tr>
</table>

---

## 🏗️ System Architecture

### High-Level Overview

```mermaid
graph TD
    OR["🏥 SURGICAL OR ENVIRONMENT<br/>📹 Video Feed + 💓 Vitals"]
    
    BACKEND["⚙️ CHRONOS ENGINE<br/>Python Backend<br/>───────────<br/>✓ FastAPI Server<br/>✓ OpenCV Processing<br/>✓ Vitals Capture<br/>✓ Hash Chain State<br/>✓ SHA-256 Hashing<br/>✓ Merkle Tree Batching<br/>✓ WebSocket Broadcast"]
    
    SUPABASE["🗂️ Supabase<br/>PostgreSQL<br/>RLS-Protected<br/>Session Storage"]
    BIGQUERY["📊 BigQuery<br/>MIMIC-IV Data<br/>Analytics &<br/>ML Training"]
    BLOCKCHAIN["⛓️ Blockchain<br/>Merkle Root<br/>Anchoring<br/>Verification"]
    
    FRONTEND["🎨 SENTINEL VIEW<br/>React 18 Frontend<br/>───────────<br/>✓ Real-time Charts<br/>✓ 3D Visualization<br/>✓ Timeline Navigation<br/>✓ Dark/Light Theme<br/>✓ Command Palette<br/>✓ Notifications"]
    
    OR -->|Frame & Vitals Stream| BACKEND
    BACKEND -->|Session Data| SUPABASE
    BACKEND -->|Analytics| BIGQUERY
    BACKEND -->|Merkle Root| BLOCKCHAIN
    SUPABASE & BIGQUERY & BLOCKCHAIN -->|Real-time Updates| FRONTEND
    
    style OR fill:#ff6b6b,stroke:#c92a2a,color:#fff,stroke-width:3px
    style BACKEND fill:#4c6ef5,stroke:#1971c2,color:#fff,stroke-width:3px
    style FRONTEND fill:#51cf66,stroke:#2f9e44,color:#fff,stroke-width:3px
    style SUPABASE fill:#a78bfa,stroke:#7c3aed,color:#fff,stroke-width:2px
    style BIGQUERY fill:#f59e0b,stroke:#d97706,color:#fff,stroke-width:2px
    style BLOCKCHAIN fill:#10b981,stroke:#059669,color:#fff,stroke-width:2px
```

### Backend Architecture

```mermaid
graph LR
    subgraph Backend["🔧 Backend (Python • FastAPI • Async)"]
        Main["⚙️<br/>main.py<br/>Orchestrator"]
        API["🔌<br/>api.py<br/>7 REST<br/>+ WebSocket"]
        Chain["🔗<br/>chain.py<br/>Hash State"]
        Hasher["🔐<br/>hasher.py<br/>SHA-256"]
        Capture["🎥<br/>capture.py<br/>OpenCV"]
        Vitals["💓<br/>vitals_source.py<br/>Telemetry"]
        Batcher["📦<br/>batcher.py<br/>Merkle Tree"]
        Merkle["🌳<br/>merkle.py<br/>Root Hash"]
        Verifier["✅<br/>verifier.py<br/>Verify Chain"]
        Blockchain["⛓️<br/>blockchain.py<br/>Web3"]
        Storage["💾<br/>storage.py<br/>Persist"]
        Supabase["📡<br/>supabase_client.py<br/>RLS Ops"]
        Config["⚙️<br/>config.py<br/>Constants"]
    end
    
    Main --> API
    Main --> Chain
    Chain --> Hasher
    Capture --> Chain
    Vitals --> Chain
    Chain --> Batcher
    Batcher --> Merkle
    Merkle --> Blockchain
    Chain --> Storage
    Chain --> Supabase
    Verifier -.->|Verify| Chain
    
    style Main fill:#4c6ef5,stroke:#1971c2,color:#fff
    style API fill:#4c6ef5,stroke:#1971c2,color:#fff
    style Chain fill:#7c3aed,stroke:#5b21b6,color:#fff
    style Hasher fill:#dc2626,stroke:#b91c1c,color:#fff
    style Capture fill:#ea580c,stroke:#c2410c,color:#fff
    style Vitals fill:#0891b2,stroke:#0369a1,color:#fff
    style Batcher fill:#16a34a,stroke:#15803d,color:#fff
    style Merkle fill:#10b981,stroke:#059669,color:#fff
    style Verifier fill:#facc15,stroke:#ca8a04,color:#000
    style Blockchain fill:#2563eb,stroke:#1d4ed8,color:#fff
    style Storage fill:#9333ea,stroke:#7e22ce,color:#fff
    style Supabase fill:#e879f9,stroke:#d946ef,color:#fff
```

### Frontend Architecture

```mermaid
graph LR
    subgraph Frontend["🎨 Frontend (React 18 • Vite • Tailwind CSS)"]
        subgraph Pages["📄 Pages"]
            Chronos["🧠<br/>ChronosView<br/>Risk Dashboard"]
            Sentinel["🛡️<br/>SentinelView<br/>Live Monitor"]
            CommandCenter["🎛️<br/>ICUCommandCenter<br/>Control"]
            NurseDash["👩‍⚕️<br/>NurseDashboard<br/>Interventions"]
            PatientPortal["🏥<br/>PatientPortal<br/>Records"]
        end
        
        subgraph Components["🧩 Components"]
            ChronosComp["📊<br/>chronos/<br/>Charts & Predictions"]
            SentinelComp["🔔<br/>sentinel/<br/>Alerts & Streams"]
            SharedComp["🎨<br/>shared/<br/>UI Components"]
            AuthComp["🔑<br/>auth/<br/>QuickAuth"]
        end
        
        subgraph State["🌍 State Management"]
            AuthContext["🔐 AuthContext"]
            ThemeContext["🎨 ThemeContext"]
        end
        
        subgraph Utils["🛠️ Utilities"]
            Styles["🎨 Tailwind + CSS"]
            Helpers["⚙️ Helper Functions"]
            Data["📁 Mock Data"]
        end
    end
    
    Pages -->|Compose| Components
    Components -->|Access| State
    Components -->|Use| Utils
    
    style Chronos fill:#9333ea,stroke:#7e22ce,color:#fff
    style Sentinel fill:#dc2626,stroke:#b91c1c,color:#fff
    style CommandCenter fill:#2563eb,stroke:#1d4ed8,color:#fff
    style NurseDash fill:#0891b2,stroke:#0369a1,color:#fff
    style PatientPortal fill:#16a34a,stroke:#15803d,color:#fff
    style ChronosComp fill:#f59e0b,stroke:#d97706,color:#fff
    style SentinelComp fill:#ec4899,stroke:#be185d,color:#fff
    style SharedComp fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style AuthComp fill:#06b6d4,stroke:#0369a1,color:#fff
```

---

## 🛠️ Tech Stack

### **Backend**

<table>
<tr>
<th>Category</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td>🔧 Framework</td>
<td><strong>FastAPI 0.104+</strong></td>
<td>Async REST API & WebSocket server</td>
</tr>
<tr>
<td>🚀 Server</td>
<td><strong>Uvicorn</strong></td>
<td>ASGI application server</td>
</tr>
<tr>
<td>🎬 Vision</td>
<td><strong>OpenCV 4.8+</strong></td>
<td>Headless frame extraction & JPEG encoding</td>
</tr>
<tr>
<td>🔐 Cryptography</td>
<td><strong>hashlib (SHA-256)</strong></td>
<td>Pure Python hash chaining</td>
</tr>
<tr>
<td>⛓️ Web3</td>
<td><strong>web3.py 6.0+</strong></td>
<td>Blockchain Merkle root anchoring</td>
</tr>
<tr>
<td>🗄️ Database</td>
<td><strong>Supabase PostgreSQL</strong></td>
<td>RLS-protected session & vitals storage</td>
</tr>
<tr>
<td>📡 Async I/O</td>
<td><strong>aiofiles, websockets</strong></td>
<td>Non-blocking file & WebSocket ops</td>
</tr>
<tr>
<td>📊 Data</td>
<td><strong>NumPy</strong></td>
<td>Array operations for frame processing</td>
</tr>
<tr>
<td>🔧 Config</td>
<td><strong>python-dotenv</strong></td>
<td>Environment variable management</td>
</tr>
</table>

### **Frontend**

<table>
<tr>
<th>Category</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td>⚛️ Framework</td>
<td><strong>React 19.2</strong></td>
<td>Component-based UI</td>
</tr>
<tr>
<td>⚡ Build Tool</td>
<td><strong>Vite 6.4</strong></td>
<td>Lightning-fast dev & prod bundler</td>
</tr>
<tr>
<td>🎨 Styling</td>
<td><strong>Tailwind CSS 4.2</strong></td>
<td>Utility-first CSS framework</td>
</tr>
<tr>
<td>✨ Animations</td>
<td><strong>Framer Motion 12.3</strong></td>
<td>Smooth page transitions & gestures</td>
</tr>
<tr>
<td>📊 Charts</td>
<td><strong>Recharts 3.8</strong></td>
<td>Composable React chart library</td>
</tr>
<tr>
<td>🎮 3D Graphics</td>
<td><strong>Three.js 0.183</strong> + <strong>React Three Fiber/Drei</strong></td>
<td>3D visualization & interactive models</td>
</tr>
<tr>
<td>🧭 Routing</td>
<td><strong>React Router 7.1</strong></td>
<td>Client-side navigation</td>
</tr>
<tr>
<td>🏷️ Icons</td>
<td><strong>Lucide React 0.577</strong></td>
<td>Beautiful SVG icons</td>
</tr>
<tr>
<td>📱 QR Codes</td>
<td><strong>qrcode.react, html5-qrcode</strong></td>
<td>Patient ID & record linking</td>
</tr>
<tr>
<td>🔐 Backend</td>
<td><strong>@supabase/supabase-js 2.39</strong></td>
<td>Real-time DB & auth integration</td>
</tr>
<tr>
<td>🎲 Utilities</td>
<td><strong>uuid</strong></td>
<td>Unique ID generation</td>
</tr>
</table>

### **Data & ML (Chronos Engine)**

<table>
<tr>
<th>Category</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td>☁️ Data Warehouse</td>
<td><strong>Google BigQuery</strong></td>
<td>MIMIC-IV 3.1 ICU temporal dataset</td>
</tr>
<tr>
<td>📚 Data Processing</td>
<td><strong>Pandas, NumPy, scikit-learn</strong></td>
<td>Feature engineering & preprocessing</td>
</tr>
<tr>
<td>🧠 Gradient Boosting</td>
<td><strong>XGBoost</strong></td>
<td>Non-linear risk prediction</td>
</tr>
<tr>
<td>📈 Survival Analysis</td>
<td><strong>Lifelines (CoxPH)</strong></td>
<td>Time-to-event modeling</td>
</tr>
<tr>
<td>⚡ Linear Model</td>
<td><strong>Logistic Regression (scikit-learn)</strong></td>
<td>Baseline binary classification</td>
</tr>
<tr>
<td>💡 Explainability</td>
<td><strong>SHAP (SHapley Additive exPlanations)</strong></td>
<td>Temporal feature attribution</td>
</tr>
<tr>
<td>📊 Visualization</td>
<td><strong>Matplotlib, Seaborn</strong></td>
<td>EDA & model diagnostics</td>
</tr>
<tr>
<td>📉 Statistics</td>
<td><strong>Statsmodels</strong></td>
<td>Statistical testing & analysis</td>
</tr>
</table>

### **Blockchain & Smart Contracts**

<table>
<tr>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td><strong>Solidity 0.8.20</strong></td>
<td>SurgicalLog.sol smart contract</td>
</tr>
<tr>
<td><strong>web3.py</strong></td>
<td>Blockchain interaction from Python</td>
</tr>
<tr>
<td><strong>Merkle Root Anchoring</strong></td>
<td>On-chain verification of surgical records</td>
</tr>
</table>

### **Deployment & DevOps**

<table>
<tr>
<th>Category</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td>🌐 Hosting</td>
<td><strong>Vercel</strong></td>
<td>Frontend + Serverless API deployment</td>
</tr>
<tr>
<td>📍 Backend</td>
<td><strong>Vercel Functions / Docker</strong></td>
<td>FastAPI backend in production</td>
</tr>
<tr>
<td>🔄 CI/CD</td>
<td><strong>GitHub Actions</strong></td>
<td>Automated testing & deployment</td>
</tr>
<tr>
<td>💾 Database</td>
<td><strong>Supabase (PostgreSQL)</strong></td>
<td>Production data persistence</td>
</tr>
<tr>
<td>☁️ Data</td>
<td><strong>Google BigQuery</strong></td>
<td>Analytics & ML modeling</td>
</tr>
</table>

---

## 📊 Database Schema (Entity Relationship Diagram)

```mermaid
erDiagram
    PATIENT ||--o{ RISK_PREDICTION : has
    PATIENT ||--o{ PATIENT_DOCTOR : assigned_to
    PATIENT ||--o{ NOTIFICATION : receives
    PATIENT ||--o{ ADMINISTERED : administers_to
    PATIENT ||--o{ INSTRUCTION : receives
    
    DOCTOR ||--o{ PATIENT_DOCTOR : "assigned_to"
    DOCTOR ||--o{ NOTIFICATION : sends
    DOCTOR ||--o{ ADMINISTERED : prescribes
    DOCTOR ||--o{ INSTRUCTION : gives
    
    NURSE ||--o{ ADMINISTERED : administers
    
    UNIT ||--o{ PATIENT : "assigned_to"

    PATIENT {
        int patient_id PK
        string name
        int age
        string qr_code
        string admission_type
        string ot_hash_final
    }

    DOCTOR {
        int doctor_id PK
        string name
        time duty_start
        time duty_end
    }

    NURSE {
        int nurse_id PK
        string name
        time duty_start
        time duty_end
    }

    UNIT {
        int unit_id PK
        string unit_type
    }

    PATIENT_DOCTOR {
        int id PK
        int patient_id FK
        int doctor_id FK
    }

    RISK_PREDICTION {
        int prediction_id PK
        int patient_id FK
        float risk_percentage
        string event
        string timeline
        string shap_1
        string shap_2
        string shap_3
        datetime timestamp
    }

    NOTIFICATION {
        int notification_id PK
        int doctor_id FK
        int patient_id FK
        float risk_score
        string type
        datetime time
    }

    ADMINISTERED {
        int admin_id PK
        int patient_id FK
        int nurse_id FK
        int doctor_id FK
        string medicine
        datetime time
    }

    INSTRUCTION {
        int instruction_id PK
        int doctor_id FK
        int patient_id FK
    }
```

---

## 📡 API Endpoints

### **REST API**

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/health` | Health check | `{ status: "ok" }` |
| `GET` | `/api/status` | Live session state | `{ session_id, seq, latest_hash, running }` |
| `GET` | `/api/recordings` | List all sessions | `[{ id, start_time, duration, ... }]` |
| `GET` | `/api/stream` | MJPEG video stream | `image/jpeg (multipart)` |
| `GET` | `/api/snapshot` | Single JPEG frame | `image/jpeg` |
| `POST` | `/api/start` | Start new session | `{ session_id, status: "started" }` |
| `POST` | `/api/stop` | Stop session | `{ status: "stopped", batches: N }` |
| `POST` | `/api/verify/{id}` | Verify chain integrity | `{ valid: bool, discrepancies: [...] }` |
| `POST` | `/api/tamper/{id}/{seq}` | Simulate tampering | `{ tampered: bool, prev_hash, curr_hash }` |
| `POST` | `/api/predict` | Predict ICU risk via XGBoost | `{ risk_scores: {}, shap_values: [...] }` |
| `GET` | `/api/ml/status` | Check Chronos ML engine status | `{ status: "ok", type: "joblib" }` |

### **WebSocket**

| Endpoint | Message Format | Description |
|----------|-----------------|-------------|
| `WS /ws/live` | `{ seq, hash, vitals, ts }` | Real-time chain + vitals broadcast |

---

## 🚀 Getting Started

### **Prerequisites**
- Python 3.9+
- Node.js 18+ & npm
- OpenCV dependencies
- Google Cloud credentials (for BigQuery)
- Supabase project & keys

### **1️⃣ Clone & Setup**

```bash
git clone https://github.com/yourusername/synapse-gtb.git
cd synapse-gtb
```

### **2️⃣ Backend Setup**

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
BASE_DATA_DIR=./data
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
WEB3_PROVIDER=your_web3_provider
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your_private_key
EOF

# Run the pipeline
python -m app.main --with-api
```

Backend will start on `http://localhost:8000`

### **3️⃣ Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_API_URL=http://localhost:8000
EOF

# Start dev server
npm run dev
```

Frontend will open on `http://localhost:5173`

### **4️⃣ Production Deployment (Vercel)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
# Follow prompts to link project and deploy frontend

# Deploy backend as serverless functions
vercel --prod
```

Live at: [synapse-gtb.vercel.app](https://synapse-gtb.vercel.app)

---

## 🧠 Chronos ML Model

The **Chronos Risk Prediction Engine** provides 12-hour mortality/readmission predictions using MIMIC-IV ICU data.

### **Data Pipeline**

```mermaid
graph TD
    BQ["📊 BigQuery<br/>MIMIC-IV 3.1<br/>Raw ICU Data"]
    
    Cohort["🔍 Step 1<br/>Cohort Selection<br/>24+ hour ICU stays"]
    
    Temporal["⏱️ Step 2<br/>Temporal Windowing<br/>1-hour resolution"]
    
    Features["🛠️ Step 3<br/>Feature Engineering<br/>───<br/>• Vital Signs<br/>• Labs<br/>• Interventions<br/>• Severity Scores<br/>• Missingness"]
    
    Split["🔀 Step 4<br/>Patient-level Split<br/>70/15/15<br/>Train/Val/Test"]
    
    Preprocess["⚙️ Step 5<br/>Leakage-safe<br/>Preprocessing<br/>Stats on Train only"]
    
    Models["🧠 Step 6<br/>Model Training<br/>───<br/>• Logistic Regression<br/>• XGBoost<br/>• CoxPH Survival"]
    
    Output["✅ Output<br/>Risk Predictions<br/>12-hour Horizon"]
    
    BQ --> Cohort
    Cohort --> Temporal
    Temporal --> Features
    Features --> Split
    Split --> Preprocess
    Preprocess --> Models
    Models --> Output
    
    style BQ fill:#f59e0b,stroke:#d97706,color:#fff,stroke-width:3px
    style Cohort fill:#3b82f6,stroke:#1d4ed8,color:#fff,stroke-width:2px
    style Temporal fill:#3b82f6,stroke:#1d4ed8,color:#fff,stroke-width:2px
    style Features fill:#8b5cf6,stroke:#7c3aed,color:#fff,stroke-width:2px
    style Split fill:#06b6d4,stroke:#0369a1,color:#fff,stroke-width:2px
    style Preprocess fill:#10b981,stroke:#059669,color:#fff,stroke-width:2px
    style Models fill:#ec4899,stroke:#be185d,color:#fff,stroke-width:2px
    style Output fill:#15803d,stroke:#166534,color:#fff,stroke-width:3px
```

### **Feature Categories**

| Category | Features | Count |
|----------|----------|-------|
| **Demographics** | age, gender, race, insurance | 4 |
| **Vital Signs** | HR, SBP, DBP, MAP, RR, O2 sat, temp | 7 |
| **Laboratory** | lactate, creatinine, BUN, WBC, platelets, ... | 12+ |
| **Interventions** | vasopressors, fluids, intubation, dialysis | 8 |
| **Severity** | SOFA, OASIS, Charlson, SAPSII | 4 |
| **Temporal** | hours_since_admission, hours_in_icu, trends | 5 |
| **Missingness** | Indicators for imputed values | 15+ |

### **Models**

1. **Logistic Regression**
   - Interpretable baseline
   - Linear decision boundary

2. **XGBoost**
   - Captures non-linear interactions
   - Feature importance ranking

3. **CoxPH Survival Model**
   - Time-to-event framework
   - Hazard ratio interpretation

### **Explainability (SHAP)**

```mermaid
graph TD
    Hour0["⏰ Hour 0<br/>───<br/>Risk = 15%<br/>───<br/>🔴 HR↑ +3.2%<br/>🔴 lactate↑ +2.8%<br/>🟡 SOFA↑ +1.9%"]
    
    Hour6["⏰ Hour 6<br/>───<br/>Risk = 28%<br/>───<br/>🔴 creatinine↑ +5.1%<br/>🟡 UO↓ +3.7%<br/>🟡 MAP↓ +2.4%"]
    
    Hour12["⏰ Hour 12<br/>───<br/>Risk = 42%<br/>───<br/>🔴 intubation +8.3%<br/>🔴 vasopressor +6.1%<br/>🟡 fever +3.5%"]
    
    Hour0 -->|Patient Timeline| Hour6
    Hour6 -->|Continuous Risk| Hour12
    
    style Hour0 fill:#fef3c7,stroke:#f59e0b,color:#000,stroke-width:2px
    style Hour6 fill:#fee2e2,stroke:#ef4444,color:#000,stroke-width:2px
    style Hour12 fill:#dc2626,stroke:#991b1b,color:#fff,stroke-width:3px
```

---

## 🔗 Integration Examples

### **Start a Recording Session**

```bash
curl -X POST http://localhost:8000/api/start \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "p12345",
    "doctor_id": "d789"
  }'
```

### **Verify Chain Integrity**

```bash
curl -X POST http://localhost:8000/api/verify/session-uuid \
  -H "Content-Type: application/json"

# Response:
# { valid: true, discrepancies: [] }
```

### **Run Real-Time ML Inference**

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "hr": 115,
    "map_mean": 58,
    "sbp": 85,
    "lactate": 3.2,
    "sofa_score": 6
  }'

# Response:
# { 
#   "risk_scores": {"shock": 0.61, "sepsis": 0.45}, 
#   "shap_values": [{"feature": "hr", "value": 0.15, "direction": "risk"}] 
# }
```

### **Stream Live Video**

```bash
# In frontend:
<img src="http://localhost:8000/api/stream" alt="Live surgical feed" />
```

### **WebSocket Real-time Updates**

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Seq: ${data.seq}, Hash: ${data.hash}, HR: ${data.vitals.heart_rate}`);
};
```

---

## 📚 Documentation

- **[System Design Deep Dive](./docs/ARCHITECTURE.md)** — Multi-layer cryptographic protocol
- **[API Reference](./docs/API.md)** — Detailed endpoint documentation
- **[ML Model Guide](./docs/CHRONOS.md)** — Feature engineering & model training
- **[Database Schema](./docs/SCHEMA.md)** — ERD & SQL definitions
- **[Deployment Guide](./docs/DEPLOYMENT.md)** — Vercel, Docker, kubernetes

---

## 📈 Performance & Metrics

| Metric | Value |
|--------|-------|
| **Frame Processing** | 30 FPS @ 1920x1080 |
| **Hash Computation** | < 50ms / frame (SHA-256) |
| **Merkle Batching** | 1,800 frames / hour |
| **API Response Time** | < 100ms (p95) |
| **WebSocket Latency** | < 50ms real-time broadcast |
| **Frontend Load Time** | < 2s (Vite optimized) |
| **Model Inference** | < 500ms per patient @ 12-hour horizon |

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend
pytest tests/ -v

# Frontend component tests
cd frontend
npm run lint
npm test

# Integration tests
pytest tests/integration/ -v
```

---

## 🔒 Security & Privacy

- **Row-Level Security (RLS)** — Supabase RLS policies per patient
- **Hashing** — SHA-256 for all frames & vitals
- **Blockchain** — Merkle roots anchored on-chain for immutability
- **Encryption** — TLS 1.3 for all transport
- **Auth** — OAuth 2.0 + JWT tokens (doctor role-based access)
- **Audit Trail** — Immutable event log for compliance (HIPAA, GDPR)

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📝 License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) file for details.

---

## 🙌 Credits & Acknowledgments

**Built for:** GTBIT Hackathon  
**Inspiration:** Life-saving surgical accountability in high-stakes OR environments

---

## 👥 Creator

### **🚀 Gurbaaz Singh** 
**Sole Creator & Full Stack Architect**

**Overview:**
All modules, system architecture, clinical ML modeling, cryptographic hash-chaining protocols, and full-stack implementations of the Synapse GTB platform were designed, engineered, and deployed by **Gurbaaz Singh**.

**Core Implementations:**
- 🎨 **Frontend Architecture & Development**: React 18, Vite, Tailwind CSS, Recharts, Three.js, and Framer Motion integration.
- ⚙️ **Backend & System Design**: FastAPI infrastructure, WebSocket streaming, cryptographic SHA-256 batching, Merkle tree anchoring, and PostgreSQL (Supabase) schema design.
- 🧠 **Chronos ML Engine**: MIMIC-IV pre-processing, 48+ engineered clinical features, XGBoost model training, and SHAP explainability.
- 🚀 **DevOps & Cloud**: Vercel serverless functions deployment, CI/CD pipeline, and zero-downtime integration.

---

## ⚖️ License
© 2026 Gurbaaz Singh. All rights reserved.
