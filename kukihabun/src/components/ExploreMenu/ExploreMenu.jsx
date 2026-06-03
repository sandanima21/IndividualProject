import React from 'react';
import { categories } from '../../assets/assets';
import './ExploreMenu.css';

const ExploreMenu = ({ category, setCategory, searchText, setSearchText }) => (
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
      <div className="d-flex justify-content-center mb-4">
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

    <div className="explore-categories">
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
    <hr className="border-gold mt-5" />
  </div>
);

export default ExploreMenu;
