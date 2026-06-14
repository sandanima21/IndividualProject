import React, { useRef, useEffect, useState } from 'react';
import { categories } from '../../assets/assets';
import './ExploreMenu.css';

const ExploreMenu = ({ category, setCategory, searchText, setSearchText }) => {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 768);
      updateArrows();
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
    setTimeout(updateArrows, 350);
  };

  return (
    <div className="explore-menu py-5">
      <div className="text-center mb-4 animate-fade-up">
        <p className="explore-label">— What are you craving today? —</p>
        <h2 className="explore-title">Explore Our <span className="text-shimmer">Menu</span></h2>
        <p className="explore-description">
          From fiery kottu to soul-warming soups, refreshing beverages to indulgent desserts —
          every dish at KukiHabun is crafted with authentic Sri Lankan spices and a modern twist.
        </p>
      </div>

      {/* Search bar */}
      {setSearchText && (
        <div className="d-flex justify-content-center mb-4 px-3">
          <div className="position-relative" style={{ maxWidth: 480, width: '100%' }}>
            <i className="bi bi-search position-absolute" style={{ left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)', pointerEvents: 'none', zIndex: 1 }}></i>
            <input
              className="form-control"
              style={{ paddingLeft: '2.4rem', paddingRight: searchText ? '2.4rem' : '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--text)' }}
              placeholder="Search for dishes..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                className="btn btn-sm position-absolute border-0 bg-transparent"
                style={{ right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                onClick={() => setSearchText('')}
              >
                <i className="bi bi-x-circle"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Categories — horizontal scroll on mobile, wrapping grid on desktop */}
      <div className="explore-categories-wrapper">
        {isMobile && canLeft && (
          <button className="scroll-arrow scroll-arrow-left" onClick={() => scrollBy(-1)} aria-label="Scroll left">
            <i className="bi bi-chevron-left"></i>
          </button>
        )}

        <div className="explore-categories" ref={scrollRef} onScroll={updateArrows}>
          {categories.map((item, index) => (
            <button
              key={index}
              className={`explore-cat-btn ${item.category === category ? 'active' : ''}`}
              onClick={() => setCategory(prev => prev === item.category ? 'All' : item.category)}
            >
              <div className="explore-img-wrap">
                <img src={item.icon} alt={item.category} width={68} height={68} className="rounded-circle" />
              </div>
              <span className="explore-cat-label">{item.category}</span>
            </button>
          ))}
        </div>

        {isMobile && canRight && (
          <button className="scroll-arrow scroll-arrow-right" onClick={() => scrollBy(1)} aria-label="Scroll right">
            <i className="bi bi-chevron-right"></i>
          </button>
        )}
      </div>

      <hr className="border-gold mt-5" />
    </div>
  );
};

export default ExploreMenu;
