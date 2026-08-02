import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getFoodList } from '../../services/foodService';
import { toast } from 'react-toastify';
import { formatColomboDate } from '../../utils/date';

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

/* ─── Shared "filter by rating" pill row ─── */
const RatingFilter = ({ value, onChange, color = 'var(--gold)' }) => (
  <div className="d-flex align-items-center gap-1 flex-wrap">
    <button
      type="button"
      className="btn btn-sm"
      style={{
        borderRadius: 50, fontWeight: 600, fontSize: '0.75rem', padding: '3px 12px',
        background: value === 'all' ? color : 'rgba(255,255,255,0.04)',
        color: value === 'all' ? '#000' : 'rgba(200,196,188,0.6)',
        border: `1px solid ${value === 'all' ? color : 'rgba(255,255,255,0.1)'}`,
      }}
      onClick={() => onChange('all')}
    >
      All
    </button>
    {[5, 4, 3, 2, 1].map(n => (
      <button
        key={n}
        type="button"
        className="btn btn-sm d-inline-flex align-items-center gap-1"
        style={{
          borderRadius: 50, fontWeight: 600, fontSize: '0.75rem', padding: '3px 10px',
          background: value === String(n) ? color : 'rgba(255,255,255,0.04)',
          color: value === String(n) ? '#000' : 'rgba(200,196,188,0.6)',
          border: `1px solid ${value === String(n) ? color : 'rgba(255,255,255,0.1)'}`,
        }}
        onClick={() => onChange(String(n))}
      >
        {n}<i className="bi bi-star-fill" style={{ fontSize: '0.65rem' }}></i>
      </button>
    ))}
  </div>
);

/* ─── Food Reviews tab ─── */
const FoodReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [foodMap, setFoodMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState('all');

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

  const filtered = reviews.filter(r => ratingFilter === 'all' || r.rating === Number(ratingFilter));
  const avg = avgOf(filtered);

  return (
    <>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <span className="badge bg-secondary">{filtered.length} reviews</span>
          {filtered.length > 0 && (
            <span className="text-muted small">Avg: <StarRating value={Math.round(avg)} /> <strong style={{ color: 'var(--gold)' }}>{avg}</strong></span>
          )}
        </div>
        <RatingFilter value={ratingFilter} onChange={setRatingFilter} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-star fs-1 d-block mb-2 opacity-25"></i>No food reviews {ratingFilter !== 'all' ? 'match this filter.' : 'yet.'}
        </div>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0 align-middle">
            <thead style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
              <tr><th>Customer</th><th>Food</th><th>Rating</th><th>Comment</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {r.userPicture
                        ? <img src={r.userPicture} alt={r.userName} width={28} height={28} className="rounded-circle" style={{ objectFit: 'cover' }} referrerPolicy="no-referrer" onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>{r.userName?.charAt(0)}</div>}
                      <small style={{ color: '#c8c4bc' }}>{r.userName}</small>
                    </div>
                  </td>
                  <td><span style={{ color: '#e0ddd4', fontSize: '0.85rem' }}>{foodMap[r.foodId] || <span className="text-muted small fst-italic">Unavailable food</span>}</span></td>
                  <td><StarRating value={r.rating} /></td>
                  <td style={{ maxWidth: 250, color: '#c8c4bc', fontSize: '0.85rem' }}>{r.comment || <span className="text-muted">—</span>}</td>
                  <td style={{ color: 'rgba(200,196,188,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatColomboDate(r.createdAt)}</td>
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
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      axios.get(`${import.meta.env.VITE_API_URL}/api/delivery-reviews`).then(r => r.data),
      axios.get(`${import.meta.env.VITE_API_URL}/api/auth/delivery/personnel`).then(r => r.data).catch(() => []),
    ])
      .then(([reviewsData, riders]) => {
        setReviews(reviewsData);
        const map = {};
        riders.forEach(r => { map[r.id] = { name: r.name, picture: r.picture }; });
        setRiderMap(map);
      })
      .catch(() => toast.error('Failed to load delivery reviews.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-5 text-center"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>;

  const filtered = reviews.filter(r => {
    const riderName = riderMap[r.deliveryPersonId]?.name || '';
    const matchesSearch = !search || riderName.toLowerCase().includes(search.toLowerCase());
    const matchesRating = ratingFilter === 'all' || r.rating === Number(ratingFilter);
    return matchesSearch && matchesRating;
  });
  const avg = avgOf(filtered);

  return (
    <>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <span className="badge bg-secondary">{filtered.length} reviews</span>
          {filtered.length > 0 && (
            <span className="text-muted small">Overall avg: <StarRating value={Math.round(avg)} /> <strong style={{ color: '#a78bfa' }}>{avg}</strong></span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="position-relative">
            <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(167,139,250,0.6)', fontSize: '0.82rem', pointerEvents: 'none' }}></i>
            <input
              className="form-control form-control-sm"
              placeholder="Search by rider name..."
              style={{ width: 190, paddingLeft: '2rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <RatingFilter value={ratingFilter} onChange={setRatingFilter} color="#a78bfa" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-bicycle fs-1 d-block mb-2 opacity-25"></i>No delivery reviews {search || ratingFilter !== 'all' ? 'match this filter.' : 'yet.'}
        </div>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0 align-middle">
            <thead style={{ borderBottom: '1px solid rgba(167,139,250,0.18)' }}>
              <tr><th>Customer</th><th>Rider</th><th>Rating</th><th>Comment</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>{r.customerName?.charAt(0)}</div>
                      <small style={{ color: '#c8c4bc' }}>{r.customerName}</small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {riderMap[r.deliveryPersonId]?.picture
                        ? <img src={riderMap[r.deliveryPersonId].picture} alt="" width={28} height={28} className="rounded-circle" style={{ objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#a78bfa', flexShrink: 0 }}><i className="bi bi-bicycle"></i></div>}
                      <small style={{ color: '#a78bfa' }}>{riderMap[r.deliveryPersonId]?.name || <span className="text-muted fst-italic">Unavailable driver</span>}</small>
                    </div>
                  </td>
                  <td><StarRating value={r.rating} /></td>
                  <td style={{ maxWidth: 250, color: '#c8c4bc', fontSize: '0.85rem' }}>{r.comment || <span className="text-muted">—</span>}</td>
                  <td style={{ color: 'rgba(200,196,188,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatColomboDate(r.createdAt)}</td>
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
