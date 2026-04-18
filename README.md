# OpenGCS — Open Source Ground Control Station

> Built for Indian defense and drone startups.
> Modern, lightweight, offline-capable GCS — 
> built in India, for India.

## Features
- Real-time multi-drone tracking
- Mission planning with waypoints
- Geofencing with breach alerts
- Command panel — RTH, Land, Hold, Arm/Disarm
- Flight log with CSV export
- MAVLink protocol support

## Tech Stack
- Frontend: React.js + Leaflet.js
- Backend: FastAPI + WebSocket
- Protocol: MAVLink (pymavlink)

## Quick Start
```bash
# Backend
cd opengcs-backend
pip install fastapi uvicorn websockets pymavlink
uvicorn main:app --reload

# Frontend
cd opengcs-frontend
npm install
npm start
```

## Status
🚧 Active development — contributions welcome

## Vision

ek free, modern GCS — jo offline bhi kaam kare.

## Contributing
PRs welcome. Issues welcome. Stars welcome. 🙏
