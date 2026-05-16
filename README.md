# Adaptive Session Trust Enforcement

Zero-trust security system using Graph Neural Networks for web applications.

Traditional web applications only validate identity at login, leaving sessions vulnerable to hijacking and insider threats. This system provides **continuous trust evaluation** after authentication by combining rule-based heuristics and GraphSAGE-based session anomaly detection.

## Quick Start

### Prerequisites
- Node.js (v18.0+)
- Python (v3.9+)
- Docker & Docker Compose

### Installation & Setup

1. **Start Databases** (PostgreSQL & Redis)
   ```bash
   docker-compose up -d
   ```

2. **Start Backend API**
   ```bash
   cd backend
   npm install
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   # Runs on http://localhost:3001
   ```

4. **Start Trust Engine** (GNN Model)
   ```bash
   cd trust-engine
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   # Runs on http://localhost:8000
   ```

## Architecture

- **Backend (Node.js/Express):** Handles routing, authentication (WebAuthn), access control, and interfaces with the Trust Engine.
- **Frontend (React):** User dashboard and Admin panel to visualize active sessions, trust scores, and dynamic access tiers.
- **Trust Engine (Python/FastAPI):** Computes trust scores using a hybrid approach:
  - *Rule-based (40%)*: Checks geolocation jumps, rapid requests, and device fingerprint changes.
  - *GNN (60%)*: Evaluates session API access patterns using a trained GraphSAGE model to detect anomalies.
- **Data Layer:** PostgreSQL (persistent state) and Redis (real-time session metrics and graph data).

## Key Features

- **Continuous Trust Evaluation:** Score updates dynamically based on user behavior.
- **Graduated Access Control:** 4 tiers of access (Full, Limited, Restricted, Blocked).
- **Step-Up Authentication:** WebAuthn biometric fallback when score drops due to suspicious behavior.
- **Admin Session Management:** Monitor active sessions globally and terminate risky sessions instantly.

## Testing

Run automated attack scenarios and performance benchmarks:
```bash
bash tests/run_scenarios.sh
python tests/run_benchmarks.py
```
