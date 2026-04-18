import asyncio, math, csv, io
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI()
flight_log = []

#  we are using the command store to do that 
drone_command = {}
geofence = {"center": None, "radius": None}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DRONES = {
    "drone-1": {"lat": 28.6139, "lng": 77.2090, "speed": 0.05, "color": "#3498db"},
    "drone-2": {"lat": 28.6200, "lng": 77.2150, "speed": 0.03, "color": "#2ecc71"},
    "drone-3": {"lat": 28.6080, "lng": 77.2020, "speed": 0.07, "color": "#e74c3c"},
}

@app.post("/geofence")
async def set_geofence(data: dict):
    geofence["center"] = data["center"]
    geofence["radius"] = data["radius"]
    return {"status": "geofence set"}

@app.websocket("/ws/fleet")
async def fleet_feed(websocket: WebSocket):
    await websocket.accept()
    angles = {k: 0 for k in DRONES}
    while True:
        fleet_data = {}
        for drone_id, drone in DRONES.items():
            angles[drone_id] += drone["speed"]
            lat = drone["lat"] + 0.01 * math.sin(angles[drone_id])
            lng = drone["lng"] + 0.01 * math.cos(angles[drone_id])

            breach = False
            if geofence["center"] and geofence["radius"]:
                dlat = lat - geofence["center"]["lat"]
                dlng = lng - geofence["center"]["lng"]
                dist = math.sqrt(dlat**2 + dlng**2) * 111000
                breach = dist > geofence["radius"]

            entry = {
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "battery": 85,
                "altitude": 120,
                "speed": 15,
                "breach": breach,
                "color": drone["color"]
            }
            fleet_data[drone_id] = entry
            flight_log.append({"drone": drone_id, **entry})

        await websocket.send_json(fleet_data)
        await asyncio.sleep(1)

@app.get("/log/download")
async def download_log():
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["drone","lat","lng","battery","altitude","speed","breach"])
    writer.writeheader()
    writer.writerows(flight_log)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=flight_log.csv"}
    )
    @app.post("/command/{drone_id}")
    async def send_command(drone_id: str, data: dict):
     command = data.get("command")
    drone_commands[drone_id] = command
    return {"status": "command sent", "drone": drone_id, "command": command}

@app.get("/command/{drone_id}")
async def get_command(drone_id: str):
    return {"command": drone_commands.get(drone_id, "IDLE")}