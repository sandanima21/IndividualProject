import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const OFFER_KEY = 'kukihabun_pending_offer';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8080/api/offers')
      .then(r => setOffers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const storeOffer = (offer) => {
    if (offer.price != null) {
      sessionStorage.setItem(OFFER_KEY, JSON.stringify({ id: offer.id, title: offer.title, price: offer.price, imageUrl: offer.imageUrl }));
    } else {
      sessionStorage.removeItem(OFFER_KEY);
    }
  };

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1208 50%, #0c0c0c 100%)',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        padding: '4rem 0 3rem',
        textAlign: 'center',
      }}>
        <div className="container">
          <p style={{ color: 'var(--gold)', letterSpacing: '0.18em', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            Limited Time
          </p>
          <h1 className="display-5 fw-bold mb-3">
            Special <span className="text-shimmer">Offers</span>
          </h1>
          <p style={{ color: 'rgba(240,236,224,0.6)', maxWidth: 520, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Exclusive deals crafted just for you. Grab them before they're gone!
          </p>
        </div>
      </div>

      {/* Offers list */}
      <div className="container py-5">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: 'var(--gold)', width: 42, height: 42 }}></div>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-tag" style={{ fontSize: '3rem', color: 'rgba(201,168,76,0.25)' }}></i>
            <p className="mt-3" style={{ color: 'rgba(240,236,224,0.5)' }}>No active offers right now. Check back soon!</p>
            <Link to="/explore" className="btn btn-primary mt-2 px-4" style={{ borderRadius: 50 }}>
              <i className="bi bi-grid me-2"></i>Browse Menu
            </Link>
          </div>
        ) : (
          <div className="row g-4">
            {offers.map(offer => (
              <div key={offer.id} className="col-12 col-md-6">
                <div style={{
                  borderRadius: 18, overflow: 'hidden', background: '#111',
                  border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex', flexDirection: 'column',
                  height: '100%',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {offer.imageUrl && (
                    <img
                      src={offer.imageUrl}
                      alt={offer.title}
                      style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                    />
                  )}

                  <div style={{ padding: '1.5rem 1.8rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 className="fw-bold mb-2 text-shimmer" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}>
                      {offer.title}
                    </h4>

                    <p style={{ color: 'rgba(240,236,224,0.6)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem', flex: 1 }}>
                      {offer.description}
                    </p>

                    {offer.price != null && (
                      <div className="mb-3">
                        <span style={{
                          background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)',
                          borderRadius: 8, padding: '4px 14px',
                          color: 'var(--gold)', fontWeight: 800, fontSize: '1rem',
                        }}>
                          Rs. {Number(offer.price).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {(offer.startDate || offer.endDate) && (
                      <div className="d-flex gap-3 mb-3 flex-wrap" style={{ fontSize: '0.75rem', color: 'rgba(240,236,224,0.4)' }}>
                        {offer.startDate && (
                          <span>
                            <i className="bi bi-calendar-event me-1"></i>
                            From {new Date(offer.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {offer.endDate && (
                          <span>
                            <i className="bi bi-calendar-x me-1"></i>
                            Until {new Date(offer.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Link stores offer then lets React Router handle the navigation */}
                    <Link
                      to="/cart"
                      className="btn btn-primary fw-semibold"
                      style={{ borderRadius: 50, alignSelf: 'flex-start', padding: '0.5rem 1.5rem' }}
                      onClick={() => storeOffer(offer)}
                    >
                      <i className="bi bi-bag-fill me-2"></i>Order Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Offers;
