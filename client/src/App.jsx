import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

function createColoredIcon(color, status) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 18px; height: 18px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 8px ${color};
      opacity: ${status === 'LAND' ? 0.4 : 1};
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function MapClicker({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

const DRONE_IDS = ['drone-1', 'drone-2', 'drone-3']
const DRONE_COLORS = { 'drone-1': '#3498db', 'drone-2': '#2ecc71', 'drone-3': '#e74c3c' }

function CommandPanel({ droneId, color, data, onCommand, activeCommand }) {
  const commands = [
    { id: 'RTH', label: '🏠 RTH', desc: 'Return to Home' },
    { id: 'LAND', label: '⬇️ Land', desc: 'Emergency Land' },
    { id: 'HOLD', label: '✋ Hold', desc: 'Hold Position' },
    { id: 'ARM', label: '⚡ Arm', desc: 'Arm Motors' },
    { id: 'DISARM', label: '🔒 Disarm', desc: 'Disarm Motors' },
    { id: 'IDLE', label: '▶️ Resume', desc: 'Resume Mission' },
  ]

  return (
    <div style={{
      background: 'rgba(0,0,0,0.85)',
      border: `1px solid ${color}`,
      borderRadius: 10,
      padding: 12,
      width: 190,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
          {droneId.toUpperCase()}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11,
          color: data?.breach ? '#e74c3c' : '#2ecc71'
        }}>
          {data?.breach ? '🔴 BREACH' : '🟢 OK'}
        </span>
      </div>

      {/* Status */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 6, padding: '4px 8px',
        marginBottom: 10, fontSize: 11, color: '#aaa',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>CMD: <span style={{ color: '#f39c12', fontWeight: 'bold' }}>
          {activeCommand || 'IDLE'}
        </span></span>
        <span>{data?.altitude ?? '--'}m</span>
        <span>{data?.battery ?? '--'}%</span>
      </div>

      {/* Command buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {commands.map(cmd => (
          <button
            key={cmd.id}
            onClick={() => onCommand(droneId, cmd.id)}
            title={cmd.desc}
            style={{
              background: activeCommand === cmd.id
                ? color
                : 'rgba(255,255,255,0.08)',
              color: activeCommand === cmd.id ? 'white' : '#ccc',
              border: `1px solid ${activeCommand === cmd.id ? color : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 6,
              padding: '6px 4px',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: activeCommand === cmd.id ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {cmd.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [fleet, setFleet] = useState({})
  const [geofence, setGeofence] = useState(null)
  const [log, setLog] = useState([])
  const [showLog, setShowLog] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const [commands, setCommands] = useState({})
  const [cmdLog, setCmdLog] = useState([])
  const ws = useRef(null)

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws/fleet')
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setFleet(data)
      const entries = Object.entries(data).map(([id, d]) => ({ id, ...d }))
      setLog(prev => [...prev.slice(-100), ...entries])
    }
    return () => ws.current.close()
  }, [])

  const handleMapClick = (latlng) => {
    const gf = { center: { lat: latlng.lat, lng: latlng.lng }, radius: 500 }
    setGeofence(gf)
    fetch('http://localhost:8000/geofence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gf)
    })
  }

  const handleCommand = async (droneId, command) => {
    await fetch(`http://localhost:8000/command/${droneId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    })
    setCommands(prev => ({ ...prev, [droneId]: command }))
    setCmdLog(prev => [{
      time: new Date().toLocaleTimeString(),
      drone: droneId,
      command
    }, ...prev.slice(0, 19)])
  }

  const breachedDrones = Object.entries(fleet).filter(([, d]) => d.breach)

  return (
    <div style={{ height: "100vh", width: "100%", display: 'flex' }}>

      {/* Left Command Panel */}
      {showPanel && (
        <div style={{
          width: 220,
          background: 'rgba(5,10,20,0.97)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          padding: 12,
          zIndex: 1000,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div style={{ color: '#3498db', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
            ⬡ OpenGCS Command
          </div>

          {DRONE_IDS.map(id => (
            <CommandPanel
              key={id}
              droneId={id}
              color={DRONE_COLORS[id]}
              data={fleet[id]}
              onCommand={handleCommand}
              activeCommand={commands[id]}
            />
          ))}

          {/* Command log */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, padding: 8, marginTop: 4
          }}>
            <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>
              Command Log
            </div>
            {cmdLog.length === 0 ? (
              <div style={{ color: '#555', fontSize: 11 }}>No commands sent</div>
            ) : (
              cmdLog.map((entry, i) => (
                <div key={i} style={{
                  fontSize: 11, color: '#aaa',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  padding: '3px 0'
                }}>
                  <span style={{ color: DRONE_COLORS[entry.drone] }}>
                    {entry.drone.split('-')[1]}
                  </span>
                  {' → '}
                  <span style={{ color: '#f39c12' }}>{entry.command}</span>
                  <span style={{ float: 'right', color: '#555' }}>{entry.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>

        {/* Breach Alert */}
        {breachedDrones.length > 0 && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: '#c0392b', color: 'white',
            textAlign: 'center', padding: '7px',
            zIndex: 2000, fontSize: 14, fontWeight: 'bold'
          }}>
            ⚠️ BREACH: {breachedDrones.map(([id]) => id.toUpperCase()).join(', ')}
          </div>
        )}

        {/* Top controls */}
        <div style={{
          position: 'absolute',
          top: breachedDrones.length > 0 ? 42 : 10,
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, display: 'flex', gap: 8
        }}>
          <button onClick={() => setShowPanel(!showPanel)} style={{
            background: 'rgba(0,0,0,0.8)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12
          }}>
            {showPanel ? '← Hide Panel' : '→ Commands'}
          </button>
          <button onClick={() => setGeofence(null)} style={{
            background: 'rgba(0,0,0,0.8)', color: '#e74c3c',
            border: '1px solid rgba(231,76,60,0.4)',
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12
          }}>
            Clear Geofence
          </button>
          <span style={{
            background: 'rgba(0,0,0,0.7)', color: '#888',
            padding: '6px 14px', borderRadius: 6, fontSize: 12
          }}>
            Click map → geofence
          </span>
        </div>

        {/* Log Button */}
        <button onClick={() => setShowLog(!showLog)} style={{
          position: 'absolute', bottom: 24, right: 16,
          background: 'rgba(0,0,0,0.8)', color: 'white',
          border: 'none', padding: '8px 16px',
          borderRadius: 8, cursor: 'pointer', zIndex: 1000, fontSize: 12
        }}>
          {showLog ? 'Hide Log' : `📋 Fleet Log (${log.length})`}
        </button>

        <a href="http://localhost:8000/log/download" style={{
          position: 'absolute', bottom: 24, right: 160,
          background: '#27ae60', color: 'white',
          padding: '8px 16px', borderRadius: 8,
          zIndex: 1000, textDecoration: 'none', fontSize: 12
        }}>⬇️ CSV</a>

        {/* Log Table */}
        {showLog && (
          <div style={{
            position: 'absolute', bottom: 65, right: 16,
            background: 'rgba(0,0,0,0.92)', color: 'white',
            width: 500, maxHeight: 260, overflowY: 'auto',
            borderRadius: 8, zIndex: 1000, padding: 10
          }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '3px 6px' }}>Drone</th>
                  <th>Lat</th><th>Lng</th>
                  <th>Alt</th><th>Spd</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {log.slice().reverse().map((entry, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid #1a1a1a',
                    background: entry.breach ? '#2d0000' : 'transparent'
                  }}>
                    <td style={{ padding: '3px 6px', color: DRONE_COLORS[entry.id], fontWeight: 'bold' }}>
                      {entry.id}
                    </td>
                    <td>{entry.lat}</td><td>{entry.lng}</td>
                    <td>{entry.altitude}m</td><td>{entry.speed}</td>
                    <td>{entry.breach ? '🔴' : '🟢'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <MapContainer center={[28.6139, 77.2090]} zoom={13}
          style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClicker onMapClick={handleMapClick} />
          {Object.entries(fleet).map(([id, d]) => (
            <Marker
              key={id}
              position={[d.lat, d.lng]}
              icon={createColoredIcon(DRONE_COLORS[id], commands[id])}
            />
          ))}
          {geofence && (
            <Circle
              center={[geofence.center.lat, geofence.center.lng]}
              radius={geofence.radius}
              color="red" fillColor="red" fillOpacity={0.1}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}

export default App