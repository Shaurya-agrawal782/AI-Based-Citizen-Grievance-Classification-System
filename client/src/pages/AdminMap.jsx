import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { grievanceAPI } from '../services/api';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function AdminMap() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
    loadGrievances();
  }, []);

  const loadGrievances = async () => {
    try {
      const res = await grievanceAPI.getAll({ limit: 100 });
      // Filter grievances that have coordinates (or simulate them for the demo)
      const data = res.data.grievances.map(g => ({
        ...g,
        // If no coordinates, generate some around a city center for demo purposes
        lat: g.location?.lat ?? g.location?.coordinates?.lat ?? (23.2599 + (Math.random() - 0.5) * 0.1),
        lng: g.location?.lng ?? g.location?.coordinates?.lng ?? (77.4126 + (Math.random() - 0.5) * 0.1)
      }));
      setGrievances(data);
      
      const counts = data.reduce((acc, g) => {
        acc[g.priority] = (acc[g.priority] || 0) + 1;
        return acc;
      }, { high: 0, medium: 0, low: 0 });
      setStats(counts);

    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff1744';
      case 'medium': return '#ff9100';
      case 'low': return '#00e676';
      default: return '#2979ff';
    }
  };

  return (
    <div className="admin-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Command Center</h2>
          <p>Real-time Intelligence</p>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin" className="sidebar-link"><span className="material-symbols-outlined">grid_view</span>Overview</Link>
          <Link to="/admin" className="sidebar-link"><span className="material-symbols-outlined">description</span>Grievance Feed</Link>
          <Link to="/admin/map" className="sidebar-link active"><span className="material-symbols-outlined">map</span>Live Crisis Map</Link>
          <Link to="/admin/analytics" className="sidebar-link"><span className="material-symbols-outlined">analytics</span>Analytics</Link>
        </nav>
        <div className="sidebar-footer">
          <div style={{ padding: '1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Active Alerts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--error)' }}>High Priority</span>
                <span style={{ fontWeight: 700 }}>{stats.high}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--warning)' }}>Medium</span>
                <span style={{ fontWeight: 700 }}>{stats.medium}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--success)' }}>Low</span>
                <span style={{ fontWeight: 700 }}>{stats.low}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin-content" style={{ padding: 0, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
          </div>
        ) : (
          <>
            <MapContainer center={[23.2599, 77.4126]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {grievances.map((g) => (
                <CircleMarker
                  key={g._id}
                  center={[g.lat, g.lng]}
                  radius={g.priority === 'high' ? 12 : 8}
                  pathOptions={{
                    fillColor: getPriorityColor(g.priority),
                    color: 'white',
                    weight: 2,
                    fillOpacity: 0.7
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <span className={`badge badge-${g.status}`} style={{ marginBottom: '0.5rem' }}>{g.status}</span>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700 }}>{g.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: '#666', margin: '0 0 0.5rem 0' }}>{g.category} • {g.department}</p>
                      <Link to={`/admin/grievance/${g._id}`} className="btn btn-primary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Map Overlay Legened */}
            <div style={{ 
              position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 1000,
              background: 'white', padding: '1rem', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--outline-variant)'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Grievance Density</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff1744' }}></div>
                  <span>High Priority / Critical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff9100' }}></div>
                  <span>Medium / Action Required</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00e676' }}></div>
                  <span>Low / Routine</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
