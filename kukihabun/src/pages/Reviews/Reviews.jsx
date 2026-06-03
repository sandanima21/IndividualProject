import React, { useContext, useEffect, useState } from 'react';
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const StarRating = ({ value, onChange }) => (
  <span>
    {[1, 2, 3, 4, 5].map(n => (
      <i
        key={n}
        className={`bi ${n <= value ? 'bi-star-fill' : 'bi-star'} fs-5 me-1`}
        style={{ color: n <= value ? 'var(--gold)' : 'rgba(240,236,224,0.3)', cursor: onChange ? 'pointer' : 'default' }}
        onClick={() => onChange?.(n)}
      />
    ))}
  </span>
);

const Reviews = () => {
  const { user, token } = useContext(StoreContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios.get(`http://localhost:8080/api/reviews/user/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => setReviews(r.data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="py-5 text-center"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>;

  if (reviews.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-star fs-1 d-block mb-3 opacity-25"></i>
        <p className="text-muted">You haven't left any reviews yet.</p>
        <p className="text-muted small">After ordering food, you can rate and review it from My Orders.</p>
      </div>
    );
  }

  return (
    <div>
      {reviews.map(r => (
        <div key={r.id} className="card mb-3" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="fw-semibold small" style={{ color: 'var(--text-muted)' }}>Food ID: {r.foodId?.slice(-8)}</div>
                <StarRating value={r.rating} />
              </div>
              <small className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</small>
            </div>
            {r.comment && <p className="mb-0 small" style={{ color: 'var(--text)' }}>{r.comment}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Reviews;
