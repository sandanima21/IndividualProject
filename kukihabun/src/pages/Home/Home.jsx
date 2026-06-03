import React, { useContext, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';

const OFFER_KEY = 'kukihabun_pending_offer';
import Header from '../../components/Header/Header';
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu';
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay';
import Contact from '../Contact/Contact';
import { StoreContext } from '../../context/StoreContext';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
};

/* ── Hero Banner (no iframe — pure CSS + content) ── */
const HeroBanner = ({ user }) => {
  const firstName = user?.name?.split(' ')[0] || 'there';
  return (
    <section style={{
      minHeight: '72vh',
      background: `
        radial-gradient(ellipse 70% 60% at 15% 55%, rgba(201,168,76,0.13) 0%, transparent 65%),
        radial-gradient(ellipse 50% 70% at 85% 40%, rgba(201,168,76,0.07) 0%, transparent 60%),
        linear-gradient(155deg, #0c0c0c 0%, #16120a 45%, #0c0c0c 100%)
      `,
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '5rem 0 4rem',
    }}>
      {/* Decorative rings */}
      <div style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)', width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.1)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '10.5%', top: '50%', transform: 'translateY(-50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>
        🍛
      </div>

      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <p className="animate-fade-up" style={{ color: 'var(--gold)', letterSpacing: '0.22em', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.1rem' }}>
              {getGreeting()}, {firstName} 👋
            </p>
            <h1 className="animate-fade-up animate-delay-1" style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.4rem', color: '#fff' }}>
              What are you<br />
              craving <span className="text-shimmer">today?</span>
            </h1>
            <p className="animate-fade-up animate-delay-2" style={{ color: 'rgba(240,236,224,0.6)', fontSize: '1rem', maxWidth: 460, marginBottom: '2.2rem', lineHeight: 1.75 }}>
              Authentic Sri Lankan flavours, handcrafted fresh and delivered hot right to your door.
            </p>
            <div className="d-flex gap-3 flex-wrap animate-fade-up animate-delay-3">
              <Link to="/explore" className="btn btn-primary px-4 py-2 fw-semibold" style={{ borderRadius: 50, fontSize: '0.9rem' }}>
                <i className="bi bi-bag-fill me-2"></i>Order Now
              </Link>
            </div>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="d-flex flex-wrap gap-4 mt-5 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          {[
            { val: '10+', label: 'Years of flavour' },
            { val: '50+', label: 'Signature dishes' },
            { val: '4.8★', label: 'Customer rating' },
            { val: '30 min', label: 'Avg. delivery' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.25rem', lineHeight: 1 }}>{s.val}</span>
              <span style={{ color: 'rgba(240,236,224,0.45)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, transparent, var(--black))', pointerEvents: 'none' }} />
    </section>
  );
};

/* ── Delivery Info Strip ── */
const DeliveryStrip = () => (
  <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '2rem 0' }}>
    <div className="container">
      <div className="row g-3 text-center">
        {[
          { icon: 'bi-truck', color: '#4a9eff', title: 'Delivery', desc: 'Rs.100 for 1 km · +Rs.50/km' },
          { icon: 'bi-tag-fill', color: 'var(--gold)', title: 'Special Offers', desc: 'Exclusive deals & limited-time promos' },
          { icon: 'bi-shield-check', color: '#3ecf8e', title: 'Secure Payment', desc: 'PayHere-protected checkout' },
          { icon: 'bi-pin-map-fill', color: '#f4a24e', title: 'Track Your Orders', desc: 'Live delivery tracking on the map' },
        ].map(item => (
          <div key={item.title} className="col-6 col-md-3">
            <div className="d-flex flex-column align-items-center gap-2">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi ${item.icon} fs-5`} style={{ color: item.color }}></i>
              </div>
              <div className="fw-bold" style={{ fontSize: '0.82rem' }}>{item.title}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── Featured Dishes ── */
const FeaturedFoods = ({ foodList }) => {
  const rated = [...foodList].filter(f => f.averageRating > 0).sort((a, b) => b.averageRating - a.averageRating);
  const featured = rated.length >= 4 ? rated.slice(0, 4) : foodList.slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <section style={{ padding: '4rem 0', background: 'var(--black)' }}>
      <div className="container">
        <div className="d-flex align-items-end justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <p style={{ color: 'var(--gold)', letterSpacing: '0.16em', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Chef's Picks</p>
            <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>Most Loved Dishes</h2>
          </div>
          <Link to="/explore" className="btn btn-outline-primary btn-sm px-3" style={{ borderRadius: 50 }}>
            View Full Menu <i className="bi bi-arrow-right ms-1"></i>
          </Link>
        </div>

        <div className="row g-3">
          {featured.map((food, i) => (
            <div key={food.id} className={i === 0 ? 'col-12 col-md-6' : 'col-12 col-sm-4 col-md-2'} style={{ flex: i > 0 ? '1 1 0' : undefined }}>
              <Link to={`/food/${food.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <div
                  className="h-100"
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: i === 0 ? 300 : 200,
                    background: '#111',
                    border: '1px solid var(--border)',
                    transition: 'transform 0.25s, border-color 0.25s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <img src={food.imageUrl} alt={food.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.85 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 55%)' }} />
                  {/* Rating badge */}
                  {food.averageRating > 0 && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', borderRadius: 8, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bi bi-star-fill" style={{ color: '#ffc107', fontSize: '0.65rem' }}></i>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}>{food.averageRating.toFixed(1)}</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.1rem 1rem 0.9rem' }}>
                    <div className="fw-bold" style={{ color: '#fff', fontSize: i === 0 ? '1.05rem' : '0.85rem', marginBottom: 2 }}>{food.name}</div>
                    <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: i === 0 ? '0.95rem' : '0.8rem' }}>Rs. {food.price}</div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── Offers Section (fetches from backend; renders nothing when empty) ── */
const OffersSection = () => {
  const [offers, setOffers] = useState([]);

  const storeOffer = (offer) => {
    if (offer.price != null) {
      sessionStorage.setItem(OFFER_KEY, JSON.stringify({ id: offer.id, title: offer.title, price: offer.price, imageUrl: offer.imageUrl }));
    } else {
      sessionStorage.removeItem(OFFER_KEY);
    }
  };

  useEffect(() => {
    axios.get('http://localhost:8080/api/offers')
      .then(r => setOffers(r.data))
      .catch(() => {});
  }, []);

  if (offers.length === 0) return null;

  return (
    <section style={{ padding: '3rem 0', background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1208 60%, #0c0c0c 100%)', borderTop: '1px solid var(--border)' }}>
      <div className="container">
        <div className="d-flex align-items-end justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <p style={{ color: 'var(--gold)', letterSpacing: '0.16em', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Limited Time</p>
            <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>Special Offers</h2>
          </div>
        </div>
        <div className="row g-3">
          {offers.map(offer => (
            <div key={offer.id} className={offers.length === 1 ? 'col-12' : 'col-12 col-md-6'}>
              <div style={{ borderRadius: 16, overflow: 'hidden', background: '#111', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', flexDirection: offers.length === 1 ? 'row' : 'column', minHeight: 160 }}>
                {offer.imageUrl && (
                  <img src={offer.imageUrl} alt={offer.title} style={{ width: offers.length === 1 ? 280 : '100%', height: offers.length === 1 ? '100%' : 160, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ padding: '1.4rem 1.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                  <h4 className="fw-bold mb-2 text-shimmer" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)' }}>{offer.title}</h4>
                  <p style={{ color: 'rgba(240,236,224,0.6)', fontSize: '0.88rem', marginBottom: offer.promoCode ? '1rem' : 0, lineHeight: 1.6 }}>{offer.description}</p>
                  {offer.promoCode && (
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <span style={{ background: 'rgba(201,168,76,0.15)', border: '1px dashed rgba(201,168,76,0.5)', borderRadius: 8, padding: '4px 14px', color: 'var(--gold)', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '0.9rem' }}>
                        {offer.promoCode}
                      </span>
                      <Link to="/cart" className="btn btn-primary btn-sm px-3" style={{ borderRadius: 50 }} onClick={() => storeOffer(offer)}>Order Now</Link>
                    </div>
                  )}
                  {!offer.promoCode && (
                    <Link to="/cart" className="btn btn-primary btn-sm px-3 mt-2" style={{ borderRadius: 50, alignSelf: 'flex-start' }} onClick={() => storeOffer(offer)}>Order Now</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── Logged-in home ── */
const LoggedInHome = ({ user }) => {
  const { foodList } = useContext(StoreContext);

  return (
    <main>
      <HeroBanner user={user} />
      <DeliveryStrip />
      <FeaturedFoods foodList={foodList} />
      <OffersSection />
    </main>
  );
};

/* ── Guest home ── */
const GuestHome = () => {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  return (
    <main>
      <section id="hero"><Header /></section>
      <DeliveryStrip />
      <OffersSection />
      <section id="explore" style={{ background: 'var(--black)', paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="container">
          <ExploreMenu category={category} setCategory={setCategory} searchText={search} setSearchText={setSearch} />
          <FoodDisplay category={category} searchText={search} />
        </div>
      </section>
      <section id="contact" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <Contact embedded />
      </section>
    </main>
  );
};

const Home = () => {
  const { user } = useContext(StoreContext);
  if (user?.role === 'DELIVERY') return <Navigate to="/delivery" replace />;
  if (user) return <LoggedInHome user={user} />;
  return <GuestHome />;
};

export default Home;
