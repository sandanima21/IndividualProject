import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getFoodList } from '../../services/foodService';
import { toast } from 'react-toastify';

const StarRating = ({ value }) => (
  <span>
    {[1, 2, 3, 4, 5].map(n => (
      <i key={n} className={`bi ${n <= value ? 'bi-star-fill text-warning' : 'bi-star'} small`}
        style={n > value ? { color: 'rgba(255,255,255,0.2)' } : {}} />
    ))}
  </span>
);

const avgOf = (arr) => arr.length
  ? (arr.reduce((s, r) => s + r.rating, 0) / arr.length).toFixed(1)
  : '0.0';

/* ─── Food Reviews tab ─── */
const FoodReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [foodMap, setFoodMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${import.meta.env.VITE_API_URL}/api/reviews`).then(r => r.data),
      getFoodList().catch(() => []),
    ])
      .then(([reviewsData, foods]) => {
        setReviews(reviewsData);
        const map = {};
        foods.forEach(f => { map[f.id] = f.name; });
        setFoodMap(map);
      })
      .catch(() => toast.error('Failed to load food reviews.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-5 text-center"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>;

  const avg = avgOf(reviews);

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <span className="badge bg-secondary">{reviews.length} reviews</span>
        {reviews.length > 0 && (
          <span className="text-muted small">Avg: <StarRating value={Math.round(avg)} /> <strong style={{ color: 'var(--gold)' }}>{avg}</strong></span>
        )}
      </div>
      {reviews.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-star fs-1 d-block mb-2 opacity-25"></i>No food reviews yet.
        </div>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0 align-middle">
            <thead style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
              <tr><th>Customer</th><th>Food</th><th>Rating</th><th>Comment</th><th>Date</th></tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {r.userPicture
                        ? <img src={r.userPicture} alt={r.userName} width={28} height={28} className="rounded-circle" referrerPolicy="no-referrer" onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>{r.userName?.charAt(0)}</div>}
                      <small style={{ color: '#c8c4bc' }}>{r.userName}</small>
                    </div>
                  </td>
                  <td><span style={{ color: '#e0ddd4', fontSize: '0.85rem' }}>{foodMap[r.foodId] || <span className="text-muted small">{r.foodId?.slice(-8) || '—'}</span>}</span></td>
                  <td><StarRating value={r.rating} /></td>
                  <td style={{ maxWidth: 250, color: '#c8c4bc', fontSize: '0.85rem' }}>{r.comment || <span className="text-muted">—</span>}</td>
                  <td style={{ color: 'rgba(200,196,188,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

/* ─── Delivery Reviews tab ─── */
const DeliveryReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [riderMap, setRiderMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${import.meta.env.VITE_API_URL}/api/delivery-reviews`).then(r => r.data),
      axios.get(`${import.meta.env.VITE_API_URL}/api/auth/delivery/personnel`).then(r => r.data).catch(() => []),
    ])
      .then(([reviewsData, riders]) => {
        setReviews(reviewsData);
        const map = {};
        riders.forEach(r => { map[r.id] = r.name; });
        setRiderMap(map);
      })
      .catch(() => toast.error('Failed to load delivery reviews.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-5 text-center"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>;

  const avg = avgOf(reviews);

  // Group average per rider
  const riderStats = {};
  reviews.forEach(r => {
    if (!r.deliveryPersonId) return;
    if (!riderStats[r.deliveryPersonId]) riderStats[r.deliveryPersonId] = { sum: 0, count: 0 };
    riderStats[r.deliveryPersonId].sum += r.rating;
    riderStats[r.deliveryPersonId].count++;
  });

  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <span className="badge bg-secondary">{reviews.length} reviews</span>
        {reviews.length > 0 && (
          <span className="text-muted small">Overall avg: <StarRating value={Math.round(avg)} /> <strong style={{ color: '#a78bfa' }}>{avg}</strong></span>
        )}
      </div>

      {/* Rider summary cards */}
      {Object.keys(riderStats).length > 0 && (
        <div className="d-flex gap-3 flex-wrap mb-4">
          {Object.entries(riderStats).map(([riderId, stats]) => (
            <div key={riderId} className="card px-3 py-2 d-flex flex-row align-items-center gap-3" style={{ minWidth: 200, border: '1px solid rgba(167,139,250,0.25)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🛵</div>
              <div>
                <div className="fw-semibold small" style={{ color: '#a78bfa' }}>{riderMap[riderId] || 'Rider'}</div>
                <div className="d-flex align-items-center gap-1">
                  <StarRating value={Math.round(stats.sum / stats.count)} />
                  <small className="text-muted">({stats.count})</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-bicycle fs-1 d-block mb-2 opacity-25"></i>No delivery reviews yet.
        </div>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0 align-middle">
            <thead style={{ borderBottom: '1px solid rgba(167,139,250,0.18)' }}>
              <tr><th>Customer</th><th>Rider</th><th>Rating</th><th>Comment</th><th>Date</th></tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>{r.customerName?.charAt(0)}</div>
                      <small style={{ color: '#c8c4bc' }}>{r.customerName}</small>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#a78bfa', fontSize: '0.85rem' }}>
                      <i className="bi bi-bicycle me-1"></i>{riderMap[r.deliveryPersonId] || <span className="text-muted small">{r.deliveryPersonId?.slice(-6) || '—'}</span>}
                    </span>
                  </td>
                  <td><StarRating value={r.rating} /></td>
                  <td style={{ maxWidth: 250, color: '#c8c4bc', fontSize: '0.85rem' }}>{r.comment || <span className="text-muted">—</span>}</td>
                  <td style={{ color: 'rgba(200,196,188,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

/* ─── Main Reviews page ─── */
const Reviews = () => {
  const [tab, setTab] = useState('food');

  return (
    <div className="py-4 px-3">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-star me-2" style={{ color: 'var(--gold)' }}></i>Reviews
        </h4>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${tab === 'food' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('food')}
          >
            <i className="bi bi-star me-1"></i>Food Reviews
          </button>
          <button
            className={`btn btn-sm ${tab === 'delivery' ? '' : 'btn-outline-secondary'}`}
            style={tab === 'delivery' ? { background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' } : {}}
            onClick={() => setTab('delivery')}
          >
            <i className="bi bi-bicycle me-1"></i>Delivery Reviews
          </button>
        </div>
      </div>

      {tab === 'food' ? <FoodReviewsTab /> : <DeliveryReviewsTab />}
    </div>
  );
};

export default Reviews;
