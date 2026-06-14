import React, { useContext, useEffect, useRef, useState } from 'react';
import './DeliveryDashboard.css';
import { StoreContext } from '../../context/StoreContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import PhoneVerificationModal from '../../components/PhoneVerification/PhoneVerificationModal';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const restaurantIcon = L.divIcon({ className: '', html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🍛</div>', iconSize: [32, 32], iconAnchor: [16, 32] });
const riderIcon      = L.divIcon({ className: '', html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🛵</div>', iconSize: [32, 32], iconAnchor: [16, 32] });
const destIcon       = L.divIcon({ className: '', html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏠</div>', iconSize: [32, 32], iconAnchor: [16, 32] });

const API = `${import.meta.env.VITE_API_URL}`;

// ── OSRM routing hook (free, no API key) ────────────────────────────────────
// Fetches a road route between two GPS points. Falls back gracefully if offline.
const useOsrmRoute = (from, to) => {
  const [route, setRoute] = useState(null);
  const fromKey = from ? `${from.lat.toFixed(3)},${from.lng.toFixed(3)}` : '';
  const toKey   = to   ? `${to.lat.toFixed(3)},${to.lng.toFixed(3)}`   : '';

  useEffect(() => {
    if (!from || !to) { setRoute(null); return; }
    let cancelled = false;
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    )
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.routes?.[0]?.geometry?.coordinates) {
          // OSRM returns [lng, lat] — Leaflet needs [lat, lng]
          setRoute(data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => { if (!cancelled) setRoute(null); });
    return () => { cancelled = true; };
  }, [fromKey, toKey]);

  return route;
};

// ── Auto-fit map to all markers ──────────────────────────────────────────────
const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    try {
      if (positions.length > 1) map.fitBounds(positions, { padding: [40, 40], animate: false });
      else if (positions.length === 1) map.setView(positions[0], 15, { animate: false });
    } catch (_) {}
  }, [positions.map(p => p.join(',')).join('|')]);
  return null;
};

// ── Live delivery map with OSRM route + ETA overlay ─────────────────────────
const ActiveDeliveryMap = ({ order, riderPos, eta }) => {
  const destination = order.deliveryLat && order.deliveryLng
    ? { lat: order.deliveryLat, lng: order.deliveryLng } : null;

  const route = useOsrmRoute(riderPos, destination);

  const positions = [];
  if (order.restaurantLat && order.restaurantLng) positions.push([order.restaurantLat, order.restaurantLng]);
  if (riderPos) positions.push([riderPos.lat, riderPos.lng]);
  if (destination) positions.push([destination.lat, destination.lng]);

  const center = riderPos
    ? [riderPos.lat, riderPos.lng]
    : (order.restaurantLat ? [order.restaurantLat, order.restaurantLng] : [6.8442, 80.0391]);

  return (
    <div style={{ height: 260, borderRadius: 10, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid rgba(167,139,250,0.25)', position: 'relative' }}>
      {eta != null && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'rgba(0,0,0,0.82)', color: '#a78bfa', padding: '5px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(167,139,250,0.35)', backdropFilter: 'blur(4px)' }}>
          <i className="bi bi-clock me-1"></i>ETA ~{eta} min
        </div>
      )}
      <MapContainer center={center} zoom={14} zoomAnimation={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {positions.length > 1 && <FitBounds positions={positions} />}
        {route && <Polyline positions={route} color="#a78bfa" weight={4} opacity={0.75} />}
        {order.restaurantLat && order.restaurantLng && (
          <Marker position={[order.restaurantLat, order.restaurantLng]} icon={restaurantIcon}>
            <Popup>Restaurant — pickup point</Popup>
          </Marker>
        )}
        {riderPos && (
          <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon}>
            <Popup>Your current location</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>{order.deliveryAddress || 'Delivery address'}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

// ── Destination preview map (for available/READY orders) ────────────────────
const DestinationMap = ({ order }) => {
  if (!order.deliveryLat || !order.deliveryLng) return null;
  const positions = [];
  if (order.restaurantLat && order.restaurantLng)
    positions.push([order.restaurantLat, order.restaurantLng]);
  positions.push([order.deliveryLat, order.deliveryLng]);

  return (
    <div style={{ height: 150, borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid rgba(201,168,76,0.15)' }}>
      <MapContainer center={[order.deliveryLat, order.deliveryLng]} zoom={13} zoomAnimation={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {positions.length > 1 && <FitBounds positions={positions} />}
        {order.restaurantLat && order.restaurantLng && (
          <Marker position={[order.restaurantLat, order.restaurantLng]} icon={restaurantIcon}>
            <Popup>Restaurant (pickup)</Popup>
          </Marker>
        )}
        <Marker position={[order.deliveryLat, order.deliveryLng]} icon={destIcon}>
          <Popup>{order.deliveryAddress || 'Delivery destination'}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

// ── First-login password setup ───────────────────────────────────────────────
const validatePw = (pw) => {
  if (pw.length < 8) return 'At least 8 characters required.';
  if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
  if (!/[0-9]/.test(pw)) return 'Must include a number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character.';
  return null;
};

const ChangePasswordModal = ({ userId, token, onDone }) => {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validatePw(pw);
    if (err) { toast.error(err); return; }
    if (pw !== confirm) { toast.error('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/api/users/${userId}/change-password`, { password: pw }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Password updated! Welcome to your dashboard.');
      onDone();
    } catch {
      toast.error('Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 18, padding: '2rem', width: 380, maxWidth: '92vw' }}>
        <div className="text-center mb-4">
          <i className="bi bi-key-fill fs-2 mb-2 d-block" style={{ color: 'var(--gold)' }}></i>
          <h5 className="fw-bold mb-1">Create Your Password</h5>
          <p className="small text-muted mb-0">Set your personal password to continue.</p>
        </div>
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label small">New Password</label>
            <div className="input-group">
              <input type={showPw ? 'text' : 'password'} className="form-control" value={pw}
                onChange={e => setPw(e.target.value)} placeholder="Enter new password" required />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPw(v => !v)}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label small">Confirm Password</label>
            <input type="password" className="form-control" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" required />
          </div>
          <div className="small text-muted mb-3">8+ chars · uppercase · lowercase · number · special char</div>
          <button type="submit" className="btn btn-primary w-100" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check-circle me-2"></i>}
            Set Password &amp; Continue
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Sidebar nav items ────────────────────────────────────────────────────────
const NAV = [
  { id: 'orders',    icon: 'bi-bicycle',       label: 'Deliveries'   },
  { id: 'available', icon: 'bi-bag-check',      label: 'Available'    },
  { id: 'history',   icon: 'bi-clock-history',  label: 'History'      },
  { id: 'reviews',   icon: 'bi-star',           label: 'My Reviews'   },
  { id: 'profile',   icon: 'bi-person-circle',  label: 'My Profile'   },
];

// ── Main Dashboard ───────────────────────────────────────────────────────────
const DeliveryDashboard = () => {
  const { user, token, login, logout } = useContext(StoreContext);

  const [myOrders, setMyOrders]             = useState([]);   // assigned to me today
  const [availableOrders, setAvailableOrders] = useState([]); // READY, unassigned
  const [myReviews, setMyReviews]           = useState([]);
  const [online, setOnline]                 = useState(false);
  const [activeSection, setActiveSection]   = useState('orders');

  // GPS sharing state
  const [sharing, setSharing]               = useState(false);
  const [sharingOrderId, setSharingOrderId] = useState(null);
  const [riderPos, setRiderPos]             = useState(null);
  const [eta, setEta]                       = useState(null);

  // Profile state
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const stompRef       = useRef(null);
  const watchIdRef     = useRef(null);
  const restIntervalRef = useRef(null);
  const locationRef    = useRef(null); // latest position without triggering re-renders

  const mustChange = user?.mustChangePassword === true;

  // ── Session expiry handler ────────────────────────────────────────────────
  const handle401 = () => {
    toast.error('Your session has expired. Please sign in again.');
    logout();
  };

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadMyOrders = async () => {
    const res = await fetch(`${API}/api/delivery/orders/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { handle401(); return; }
    if (res.ok) setMyOrders(await res.json());
  };

  const loadAvailableOrders = async () => {
    const res = await fetch(`${API}/api/delivery/orders/available`);
    if (res.ok) setAvailableOrders(await res.json());
  };

  const loadReviews = async () => {
    try {
      const res = await fetch(`${API}/api/delivery-reviews/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { handle401(); return; }
      if (res.ok) setMyReviews(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    let consecutiveFails = 0;
    let iv;

    const safePoll = async () => {
      try {
        await Promise.all([loadMyOrders(), loadAvailableOrders()]);
        consecutiveFails = 0;
      } catch {
        if (++consecutiveFails >= 5) clearInterval(iv);
      }
    };

    loadMyOrders().catch(() => {});
    loadAvailableOrders().catch(() => {});
    loadReviews();
    iv = setInterval(safePoll, 15000);
    return () => clearInterval(iv);
  }, [token]);

  // ── Online / offline toggle ──────────────────────────────────────────────
  const toggleOnline = async () => {
    const next = !online;
    try {
      const res = await fetch(`${API}/api/delivery/rider/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ online: next }),
      });
      if (res.status === 401) { handle401(); return; }
      if (!res.ok) { toast.error('Failed to update status.'); return; }
      setOnline(next);
      toast.success(next ? 'You are now online.' : 'You are now offline.');
    } catch {
      toast.error('Failed to update status.');
    }
  };

  // ── Accept an available order ────────────────────────────────────────────
  const acceptOrder = async (orderId) => {
    try {
      const res = await fetch(`${API}/api/delivery/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { handle401(); return; }
      if (res.status === 409) { toast.error('Order already taken by another rider.'); return; }
      if (!res.ok) { toast.error('Failed to accept order.'); return; }
      toast.success('Order accepted! GPS tracking started.');
      await loadMyOrders();
      await loadAvailableOrders();
      setActiveSection('orders');
      startSharing(orderId);
    } catch {
      toast.error('Failed to accept order.');
    }
  };

  // ── Mark an order as delivered ───────────────────────────────────────────
  const markDelivered = async (orderId) => {
    try {
      const res = await fetch(`${API}/api/delivery/orders/${orderId}/delivered`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { handle401(); return; }
      if (!res.ok) { toast.error('Failed to mark as delivered.'); return; }
      stopSharing();
      toast.success('Delivery completed! Great job 🎉');
      await loadMyOrders();
    } catch {
      toast.error('Failed to complete delivery.');
    }
  };

  // ── GPS: watchPosition + STOMP WebSocket (immediate) + REST every 5s ────
  const startSharing = (orderId) => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }

    // STOMP client for real-time WebSocket broadcast
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API}/ws`),
      onConnect: () => {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            locationRef.current = { lat, lng };
            setRiderPos({ lat, lng });
            // Broadcast immediately via WebSocket
            client.publish({
              destination: `/app/delivery/${orderId}/location`,
              body: JSON.stringify({ lat, lng }),
            });
          },
          () => toast.error('Location access denied.'),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      },
      onDisconnect: () => {},
    });
    client.activate();
    stompRef.current = client;

    // REST call every 5 seconds — persists to MongoDB + returns ETA
    restIntervalRef.current = setInterval(async () => {
      if (!locationRef.current) return;
      try {
        const res = await fetch(`${API}/api/tracking/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            orderId,
            latitude:  locationRef.current.lat,
            longitude: locationRef.current.lng,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.etaMinutes != null) setEta(data.etaMinutes);
        }
      } catch { /* WebSocket still broadcasting — REST failure is non-fatal */ }
    }, 5000);

    setSharing(true);
    setSharingOrderId(orderId);
  };

  const stopSharing = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (stompRef.current) { stompRef.current.deactivate(); stompRef.current = null; }
    if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null; }
    locationRef.current = null;
    setSharing(false);
    setSharingOrderId(null);
    setRiderPos(null);
    setEta(null);
  };

  useEffect(() => () => stopSharing(), []);

  // ── Profile: upload photo ─────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/api/users/me/picture`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      login({ ...user, picture: data.pictureUrl }, token);
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // ── Profile: phone verified ───────────────────────────────────────────────
  const handlePhoneVerified = (phone) => {
    login({ ...user, phone }, token);
    setShowPhoneModal(false);
    toast.success('Phone number verified!');
  };

  // ── Derived lists ────────────────────────────────────────────────────────
  const activeOrders    = myOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');
  const deliveredOrders = myOrders.filter(o => o.status === 'DELIVERED');

  // ── Sidebar style helper ─────────────────────────────────────────────────
  const navStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.7rem 1.1rem', borderRadius: 10,
    cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: 'Poppins, sans-serif', fontSize: '0.88rem',
    transition: 'all 0.2s',
    background: activeSection === id ? 'rgba(201,168,76,0.12)' : 'transparent',
    color: activeSection === id ? 'var(--gold)' : 'rgba(240,236,224,0.65)',
    fontWeight: activeSection === id ? 600 : 400,
    borderLeft: activeSection === id ? '3px solid var(--gold)' : '3px solid transparent',
  });

  // ── Order card ───────────────────────────────────────────────────────────
  const OrderCard = ({ order, isAvailable = false }) => {
    const isActive  = order.status === 'OUT_FOR_DELIVERY';
    const isMine    = order.deliveryPersonId === user?.id;
    const isSharing = sharing && sharingOrderId === order.id;

    return (
      <div className="card mb-3" style={{
        border: `1px solid ${isActive ? 'rgba(167,139,250,0.3)' : isAvailable ? 'rgba(62,207,142,0.25)' : 'rgba(201,168,76,0.15)'}`,
        background: '#181818',
      }}>
        {/* Card header */}
        <div className="card-header d-flex justify-content-between align-items-center"
          style={{ background: '#1e1e1e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold" style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>
              {order.displayId || `#${order.id.slice(-6).toUpperCase()}`}
            </span>
            <span className="badge" style={{
              background: isActive ? 'rgba(167,139,250,0.2)' : isAvailable ? 'rgba(62,207,142,0.2)' : 'rgba(200,196,188,0.12)',
              color: isActive ? '#a78bfa' : isAvailable ? '#3ecf8e' : '#c8c4bc',
              fontSize: '0.68rem',
            }}>
              {isActive ? '🛵 Out for Delivery' : isAvailable ? '✅ Ready to Pick Up' : order.status}
            </span>
          </div>
          <small style={{ color: 'rgba(200,196,188,0.5)' }}>
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </small>
        </div>

        <div className="card-body">
          {/* Items list */}
          {order.items.map((item, i) => (
            <div key={i} className="d-flex align-items-center gap-3 py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {item.foodImageUrl && (
                <img src={item.foodImageUrl} alt="" style={{ width: 38, height: 32, objectFit: 'cover', borderRadius: 4 }} />
              )}
              <div className="flex-fill">
                <span style={{ color: '#e0ddd4', fontWeight: 600, fontSize: '0.88rem' }}>{item.foodName}</span>
                <span className="ms-2" style={{ color: 'rgba(200,196,188,0.55)', fontSize: '0.82rem' }}>×{item.quantity}</span>
              </div>
            </div>
          ))}

          <div className="mt-3">
            {/* Customer info */}
            {order.userName && (
              <div className="mb-1 d-flex align-items-center gap-2 flex-wrap">
                <small style={{ color: 'rgba(200,196,188,0.5)' }}>Customer:</small>
                <span style={{ color: '#e0ddd4', fontWeight: 600, fontSize: '0.88rem' }}>{order.userName}</span>
                {order.mobileNumber && (
                  <a href={`tel:${order.mobileNumber}`} style={{ color: 'var(--gold)', fontSize: '0.82rem' }}>
                    <i className="bi bi-telephone me-1"></i>{order.mobileNumber}
                  </a>
                )}
              </div>
            )}

            {/* Delivery address */}
            {order.deliveryAddress && (
              <div className="mb-2 small" style={{ color: '#c8c4bc' }}>
                <i className="bi bi-geo-alt me-1" style={{ color: 'var(--gold)' }}></i>
                {order.deliveryAddress}
              </div>
            )}

            {/* Active delivery: live map with route + ETA */}
            {isActive && (
              <ActiveDeliveryMap
                order={order}
                riderPos={isSharing ? riderPos : null}
                eta={isSharing && sharingOrderId === order.id ? eta : null}
              />
            )}

            {/* Available order: destination preview map */}
            {isAvailable && <DestinationMap order={order} />}

            {/* Action buttons */}
            <div className="d-flex gap-2 flex-wrap mt-2">
              {isAvailable && (
                <button className="btn btn-sm btn-success fw-semibold" onClick={() => acceptOrder(order.id)}>
                  <i className="bi bi-bicycle me-1"></i>Accept &amp; Start Delivery
                </button>
              )}
              {isActive && isMine && (
                <>
                  {isSharing ? (
                    <button className="btn btn-sm btn-outline-warning" onClick={stopSharing}>
                      <i className="bi bi-broadcast-pin me-1"></i>Stop GPS
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-outline-success" onClick={() => startSharing(order.id)}>
                      <i className="bi bi-broadcast me-1"></i>Share GPS
                    </button>
                  )}
                  <button className="btn btn-sm btn-primary fw-semibold" onClick={() => markDelivered(order.id)}>
                    <i className="bi bi-house-check me-1"></i>Mark Delivered
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-end mt-2 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <strong style={{ color: 'var(--gold)' }}>Rs.{order.total?.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {mustChange && (
        <ChangePasswordModal
          userId={user.id}
          token={token}
          onDone={() => login({ ...user, mustChangePassword: false }, token)}
        />
      )}

      {/* ── Mobile top bar ── */}
      <div className="delivery-mobile-topbar">
        <div className="d-flex align-items-center gap-2">
          {user?.picture
            ? <img src={user.picture} alt="" width={32} height={32} className="rounded-circle" style={{ objectFit: 'cover' }} referrerPolicy="no-referrer" />
            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.9rem' }}>{user?.name?.charAt(0)}</div>
          }
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{user?.name?.split(' ')[0]}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🛵 Rider</span>
        </div>
        <button
          onClick={toggleOnline}
          style={{
            padding: '0.35rem 0.9rem', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.78rem',
            background: online ? 'rgba(62,207,142,0.15)' : 'rgba(200,196,188,0.08)',
            color: online ? '#3ecf8e' : 'rgba(240,236,224,0.5)',
            border: `1px solid ${online ? 'rgba(62,207,142,0.35)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: online ? '#3ecf8e' : '#666', marginRight: 6, verticalAlign: 'middle' }}></span>
          {online ? 'Online' : 'Go Online'}
        </button>
      </div>

      <div className="delivery-layout">

        {/* ── Sidebar (desktop only) ── */}
        <aside className="delivery-sidebar">
          {/* Profile card */}
          <div style={{ padding: '0.9rem', background: 'rgba(201,168,76,0.08)', borderRadius: 12, border: '1px solid rgba(201,168,76,0.15)', marginBottom: '1rem' }}>
            <div className="d-flex align-items-center gap-2">
              {user?.picture
                ? <img src={user.picture} alt="" width={38} height={38} className="rounded-circle" style={{ objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700 }}>{user?.name?.charAt(0)}</div>
              }
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{user?.name?.split(' ')[0]}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🛵 Delivery Rider</div>
              </div>
            </div>
          </div>

          {/* Online / Offline toggle */}
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={toggleOnline}
              style={{
                width: '100%', padding: '0.55rem 1rem', borderRadius: 10,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '0.82rem',
                background: online ? 'rgba(62,207,142,0.15)' : 'rgba(200,196,188,0.08)',
                color: online ? '#3ecf8e' : 'rgba(240,236,224,0.5)',
                border: `1px solid ${online ? 'rgba(62,207,142,0.35)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: online ? '#3ecf8e' : '#666', marginRight: 8, verticalAlign: 'middle' }}></span>
              {online ? 'Online' : 'Go Online'}
            </button>
          </div>

          {/* Nav items */}
          {NAV.map(item => (
            <button key={item.id} style={navStyle(item.id)} onClick={() => setActiveSection(item.id)}>
              <i className={`bi ${item.icon}`}></i>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'orders' && activeOrders.length > 0 && (
                <span className="badge rounded-pill" style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', fontSize: '0.62rem' }}>
                  {activeOrders.length}
                </span>
              )}
              {item.id === 'available' && availableOrders.length > 0 && (
                <span className="badge rounded-pill" style={{ background: 'rgba(62,207,142,0.2)', color: '#3ecf8e', fontSize: '0.62rem' }}>
                  {availableOrders.length}
                </span>
              )}
            </button>
          ))}

          {/* GPS live indicator */}
          {sharing && (
            <div className="mt-2 p-2 rounded text-center" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', fontSize: '0.72rem', color: '#a78bfa' }}>
              <i className="bi bi-broadcast-pin me-1"></i>GPS Broadcasting
              {eta != null && <span className="ms-2">· ~{eta} min</span>}
            </div>
          )}

          {/* Bottom controls */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-sm btn-outline-secondary w-100"
              onClick={() => { loadMyOrders(); loadAvailableOrders(); }}>
              <i className="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="delivery-main">

          {/* Active deliveries */}
          {activeSection === 'orders' && (
            <div>
              {activeOrders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-bicycle fs-1 d-block mb-2 opacity-25"></i>
                  <p>No active deliveries.</p>
                  <button className="btn btn-sm btn-outline-success" onClick={() => setActiveSection('available')}>
                    View Available Orders
                  </button>
                </div>
              ) : (
                <>
                  <h5 className="fw-bold mb-3">
                    <i className="bi bi-bicycle me-2" style={{ color: '#a78bfa' }}></i>
                    Active Deliveries
                    <span className="badge ms-2" style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                      {activeOrders.length}
                    </span>
                  </h5>
                  {activeOrders.map(order => <OrderCard key={order.id} order={order} />)}
                </>
              )}
            </div>
          )}

          {/* Available orders to accept */}
          {activeSection === 'available' && (
            <div>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-bag-check me-2" style={{ color: '#3ecf8e' }}></i>
                Available Orders
                {online && availableOrders.length > 0 && (
                  <span className="badge ms-2" style={{ background: 'rgba(62,207,142,0.2)', color: '#3ecf8e' }}>
                    {availableOrders.length}
                  </span>
                )}
              </h5>
              {!online ? (
                <div className="text-center py-5">
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(200,196,188,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>
                    🔴
                  </div>
                  <p className="fw-semibold mb-2" style={{ color: 'rgba(240,236,224,0.7)' }}>You are currently offline</p>
                  <p className="small text-muted mb-3">Go online in the sidebar to see and accept delivery orders.</p>
                  <button className="btn btn-sm btn-success fw-semibold" onClick={toggleOnline}>
                    <i className="bi bi-circle-fill me-2" style={{ fontSize: '0.55rem' }}></i>Go Online Now
                  </button>
                </div>
              ) : availableOrders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-2 opacity-25"></i>
                  No orders ready for pickup right now.
                </div>
              ) : availableOrders.map(order => (
                <OrderCard key={order.id} order={order} isAvailable />
              ))}
            </div>
          )}

          {/* Delivered today */}
          {activeSection === 'history' && (
            <div>
              <h5 className="fw-bold mb-4">
                <i className="bi bi-clock-history me-2" style={{ color: 'var(--gold)' }}></i>
                Today's Completed Deliveries
              </h5>
              {deliveredOrders.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-2 opacity-25"></i>
                  No completed deliveries today.
                </div>
              ) : deliveredOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          )}

          {/* My reviews */}
          {activeSection === 'reviews' && (
            <div>
              <div className="d-flex align-items-center gap-3 mb-4">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-star me-2" style={{ color: 'var(--gold)' }}></i>My Reviews
                </h5>
                <span className="badge rounded-pill" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
                  {myReviews.length}
                </span>
                {myReviews.length > 0 && (
                  <span className="small text-muted">
                    Avg <strong style={{ color: '#a78bfa' }}>
                      {(myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1)}
                    </strong>
                  </span>
                )}
              </div>
              {myReviews.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-star fs-1 d-block mb-2 opacity-25"></i>
                  No reviews yet. Complete deliveries to receive ratings!
                </div>
              ) : myReviews.map(r => (
                <div key={r.id} className="card mb-3" style={{ border: '1px solid rgba(167,139,250,0.2)', background: '#181818' }}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 700, fontSize: '0.8rem' }}>
                          {r.customerName?.charAt(0)}
                        </div>
                        <span style={{ color: '#c8c4bc', fontWeight: 600, fontSize: '0.88rem' }}>{r.customerName}</span>
                      </div>
                      <small style={{ color: 'rgba(200,196,188,0.5)' }}>{new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div className="mb-2">
                      {[1,2,3,4,5].map(n => (
                        <i key={n} className={`bi ${n <= r.rating ? 'bi-star-fill text-warning' : 'bi-star'} me-1`}
                          style={n > r.rating ? { color: 'rgba(255,255,255,0.2)' } : {}} />
                      ))}
                    </div>
                    {r.comment && <p className="mb-0 small" style={{ color: '#c8c4bc' }}>{r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* My Profile */}
          {activeSection === 'profile' && (
            <div style={{ maxWidth: 480 }}>
              <h5 className="fw-bold mb-4">
                <i className="bi bi-person-circle me-2" style={{ color: 'var(--gold)' }}></i>My Profile
              </h5>

              {/* Photo */}
              <div className="card mb-4" style={{ border: '1px solid rgba(201,168,76,0.2)', background: '#181818' }}>
                <div className="card-body">
                  <div className="fw-semibold small mb-3" style={{ color: 'rgba(240,236,224,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Profile Photo</div>
                  <div className="d-flex align-items-center gap-4">
                    {user?.picture
                      ? <img src={user.picture} alt="Profile" width={80} height={80} className="rounded-circle" style={{ objectFit: 'cover', border: '2px solid var(--gold)' }} referrerPolicy="no-referrer" />
                      : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '1.8rem', border: '2px solid var(--gold)' }}>{user?.name?.charAt(0)}</div>
                    }
                    <div>
                      <p className="small text-muted mb-2">Customers see this photo when you are delivering their order.</p>
                      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                        {uploadingPhoto
                          ? <><span className="spinner-border spinner-border-sm me-2"></span>Uploading…</>
                          : <><i className="bi bi-camera me-1"></i>{user?.picture ? 'Change Photo' : 'Upload Photo'}</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="card mb-4" style={{ border: '1px solid rgba(201,168,76,0.2)', background: '#181818' }}>
                <div className="card-body">
                  <div className="fw-semibold small mb-3" style={{ color: 'rgba(240,236,224,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone Number</div>
                  {user?.phone ? (
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill" style={{ color: '#3ecf8e' }}></i>
                        <span className="fw-semibold">{user.phone}</span>
                        <span className="badge" style={{ background: 'rgba(62,207,142,0.15)', color: '#3ecf8e', fontSize: '0.65rem' }}>Verified</span>
                      </div>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowPhoneModal(true)}>
                        <i className="bi bi-pencil me-1"></i>Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="small text-muted mb-3">
                        <i className="bi bi-exclamation-triangle me-1" style={{ color: '#f4b942' }}></i>
                        No phone number. Customers need your number to reach you during delivery.
                      </p>
                      <button className="btn btn-sm btn-primary fw-semibold" onClick={() => setShowPhoneModal(true)}>
                        <i className="bi bi-phone me-2"></i>Add &amp; Verify Phone
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Name / info summary */}
              <div className="card" style={{ border: '1px solid rgba(201,168,76,0.2)', background: '#181818' }}>
                <div className="card-body">
                  <div className="fw-semibold small mb-3" style={{ color: 'rgba(240,236,224,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Account Info</div>
                  {[
                    { icon: 'bi-person', label: 'Name', val: user?.name },
                    { icon: 'bi-at', label: 'Username', val: user?.username || '—' },
                    { icon: 'bi-envelope', label: 'Email', val: user?.email || '—' },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="d-flex align-items-center gap-3 mb-3">
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(201,168,76,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${icon}`} style={{ color: 'var(--gold)' }}></i>
                      </div>
                      <div>
                        <div className="small" style={{ color: 'rgba(240,236,224,0.45)' }}>{label}</div>
                        <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>

      </div>{/* /delivery-layout */}

      {/* ── Mobile GPS strip ── */}
      {sharing && (
        <div className="delivery-gps-strip">
          <i className="bi bi-broadcast-pin me-1"></i>GPS Broadcasting
          {eta != null && <span className="ms-2">· ETA ~{eta} min</span>}
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="delivery-mobile-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`delivery-mob-btn ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            <i className={`bi ${item.icon}`}></i>
            <span>{item.label}</span>
            {item.id === 'orders' && activeOrders.length > 0 && (
              <span className="mob-badge">{activeOrders.length}</span>
            )}
            {item.id === 'available' && availableOrders.length > 0 && (
              <span className="mob-badge green">{availableOrders.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Phone verification modal */}
      {showPhoneModal && (
        <PhoneVerificationModal
          token={token}
          onVerified={handlePhoneVerified}
          onSkip={() => setShowPhoneModal(false)}
        />
      )}
    </>
  );
};

export default DeliveryDashboard;
