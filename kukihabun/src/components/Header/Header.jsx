import React, { useContext, useEffect, useState } from 'react';
import './Header.css';
import { StoreContext } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  { img: 'https://wallpapers.com/images/hd/food-4k-3gsi5u6kjma5zkj0.jpg',       heading: 'Crafted With Passion',           sub: 'Every dish tells a story of tradition and flavour' },
  { img: 'https://c4.wallpaperflare.com/wallpaper/454/252/888/food-backgrounds-for-laptop-wallpaper-preview.jpg', heading: 'Bold. Fresh. Unforgettable.',     sub: 'Sri Lankan cuisine reimagined for the modern palate' },
  { img: 'https://images.unsplash.com/photo-1458253756247-1e4ed949191b?fm=jpg&q=60&w=3000&auto=format&fit=crop', heading: 'Taste the Difference',             sub: 'Handpicked ingredients, prepared fresh every day' },
  { img: 'https://img.magnific.com/free-photo/smoked-mackerel-fresh-salad_2829-10911.jpg?semt=ais_hybrid&w=740&q=80', heading: 'From Our Kitchen to Your Door', sub: 'Order now and experience KukiHabun at its finest' },
];

const Header = () => {
  const { user } = useContext(StoreContext);
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => setCurrent(i);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const slide = SLIDES[current];

  return (
    <div className="hero-section">
      {/* Stacked background layers — CSS opacity transition gives a real crossfade */}
      {SLIDES.map((s, i) => (
        <div
          key={s.img}
          className="hero-bg-layer"
          style={{ backgroundImage: `url(${s.img})`, opacity: i === current ? 1 : 0 }}
        />
      ))}
      <div className="hero-overlay">
        <div className="hero-content text-center text-white animate-fade-up">
          <p className="hero-tagline">Fresh · Flavourful · Fast</p>
          <h1 className="hero-title">{slide.heading}</h1>
          <p className="hero-subtitle">{slide.sub}</p>

          <div className="d-flex gap-3 justify-content-center flex-wrap mt-4">
            {!user ? (
              <button className="btn btn-hero-secondary btn-lg px-5 py-3" onClick={() => navigate('/signin')}>
                <i className="bi bi-person-circle me-2"></i>Sign In to Order
              </button>
            ) : (
              <button className="btn btn-hero-secondary btn-lg px-5 py-3" onClick={() => scrollTo('explore')}>
                <i className="bi bi-cart me-2"></i>Order Now
              </button>
            )}
          </div>

          <div className="hero-badges d-flex gap-5 justify-content-center mt-5 flex-wrap">
            <div className="hero-badge"><i className="bi bi-clock-fill"></i><span>30 Min Delivery</span></div>
            <div className="hero-badge"><i className="bi bi-star-fill"></i><span>Top Rated</span></div>
            <div className="hero-badge"><i className="bi bi-shield-fill-check"></i><span>100% Fresh</span></div>
          </div>
        </div>

        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`hero-dot ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Header;
