# Adaptive Session Trust Enforcement with Graph-Based Behavioral Analysis

## Problem
Web applications validate identity only at login, leaving sessions vulnerable to hijacking, privilege escalation, and insider threats. Traditional systems cannot detect anomalous behavior after authentication.

## Solution
A Zero Trust based session management system that continuously evaluates user trustworthiness using:
1. Rule-based scoring - Fast detection of known anomalies (IP changes, rate limits, geolocation jumps)
2. Graph Neural Networks - Models each session as a dynamic graph where nodes are resources/endpoints and edges are access patterns, detecting sophisticated attacks like lateral movement and privilege escalation

## Prerequisites
* Node.js (v18.0 and above)
* Python (v3.10 and above)
* Docker 

## Setup

1. Clone the repository and enter the project
``` bash
git clone https://github.com/DevnathNS/gnn-based-session-anomaly-detection.git
cd gnn-based-session-anomaly-detection
```

2. Set up the environment
``` bash
docker-compose up -d
```

3. Start backend
``` bash
cd backend
npm install
npm run dev
```

4. Start frontend

5. Start trust-engine

## Service Ports
| Service | Port | Status |
|---------|------|--------|
| Backend API | 3000 | Created |
| Swagger Docs | 3000/docs | Created |
| Frontend | 3001 | TBD |
| Trust Engine | 8000 | TBD |
| Redis | 6379 | TBD |
| PostgreSQL | 5432 | TBD |


