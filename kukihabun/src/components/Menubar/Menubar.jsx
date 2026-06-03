import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Menubar.css';
import { assets } from '../../assets/assets';
import { StoreContext } from '../../context/StoreContext';

const SECTION_META = {
  hero:    { title: 'KukiHabun',              label: 'Home' },
  explore: { title: 'KukiHabun — Our Menu',   label: 'Menu' },
  contact: { title: 'KukiHabun — Contact Us', label: 'Contact Us' },
};

const Menubar = ({ onLoginSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quantities, user, logout } = useContext(StoreContext);
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const prevSectionRef = useRef(null);

  const uniqueItemsInCart = Object.values(quantities).filter(qty => qty > 0).length;
  const isDelivery = user?.role === 'DELIVERY';
  const loggedIn = !!user;
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Highlight nav link based on which section is visible (guest single-page layout)
  useEffect(() => {
    if (!isHome || loggedIn) return;
    const sections = ['contact', 'explore', 'hero'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.25, rootMargin: '-60px 0px 0px 0px' }
    );
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHome, loggedIn]);

  // Browser tab title update (guest landing page only)
  useEffect(() => {
    if (!isHome || loggedIn) return;
    const meta = SECTION_META[activeSection];
    if (!meta) return;
    document.title = meta.title;
    prevSectionRef.current = activeSection;
  }, [activeSection, isHome, loggedIn]);

  // Reset tab title when leaving the guest home page
  useEffect(() => {
    if (!isHome) document.title = 'KukiHabun';
  }, [isHome]);

  const scrollTo = (id) => {
    setNavOpen(false);
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 400);
    }
  };

  const handleCartClick = (e) => {
    if (!user) { e.preventDefault(); navigate('/signin'); }
  };

  const isActive = (path) => location.pathname === path ? ' active' : '';

  return (
    <header className={`kuki-header${scrolled ? ' scrolled' : ''}`}>
      <div className="container-fluid px-3 px-lg-5">

        {/* ── Top row: hamburger | logo | cart+account ── */}
        <div className="kuki-inner">
          <div className="kuki-nav-left">
            <button
              className="kuki-hamburger d-lg-none"
              onClick={() => setNavOpen(v => !v)}
              aria-label="Toggle navigation"
            >
              <i className={`bi ${navOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>
          </div>

          <button className="kuki-brand" onClick={() => navigate('/')}>
            <img src={assets.logo} alt="KukiHabun" className="kuki-logo" />
            <span className="kuki-brand-name">KukiHabun</span>
          </button>

          <div className="kuki-actions">
            {loggedIn && !isDelivery && (
              <Link to="/cart" className="kuki-icon-btn" onClick={handleCartClick} title="Shopping Cart">
                <i className="bi bi-handbag-fill"></i>
                {uniqueItemsInCart > 0 && (
                  <span className="kuki-badge">{uniqueItemsInCart > 9 ? '9+' : uniqueItemsInCart}</span>
                )}
              </Link>
            )}

            {user ? (
              <div className="dropdown">
                <button
                  className="kuki-icon-btn"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  title={user.name}
                  style={{ padding: 0 }}
                >
                  {user.picture
                    ? <img src={user.picture} alt={user.name} className="kuki-avatar-img" referrerPolicy="no-referrer" />
                    : <span className="kuki-avatar-letter">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow">
                  <li className="px-3 py-2">
                    <div className="fw-semibold" style={{ color: 'var(--gold)' }}>{user.name}</div>
                    <div className="small" style={{ color: 'var(--text-muted)' }}>{user.email || user.username}</div>
                    <span className="badge mt-1" style={{ background: 'var(--gold)', color: '#000' }}>{user.role}</span>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  {isDelivery ? (
                    <li><Link className="dropdown-item" to="/delivery"><i className="bi bi-truck me-2"></i>Delivery Dashboard</Link></li>
                  ) : (
                    <>
                      <li><Link className="dropdown-item" to="/profile"><i className="bi bi-person me-2"></i>My Profile</Link></li>
                      <li><Link className="dropdown-item" to="/orders"><i className="bi bi-bag me-2"></i>My Orders</Link></li>
                      <li><Link className="dropdown-item" to="/orders?tab=history"><i className="bi bi-clock-history me-2"></i>History</Link></li>
                      <li><Link className="dropdown-item" to="/chat"><i className="bi bi-chat-dots me-2"></i>Chat with Owner</Link></li>
                    </>
                  )}
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={() => logout()}>
                      <i className="bi bi-box-arrow-right me-2"></i>Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <Link to="/signin" className="kuki-signin-btn">
                <i className="bi bi-person me-1"></i>Sign In
              </Link>
            )}
          </div>
        </div>

        {/* ── Center nav row (desktop ≥ lg) ── */}
        <nav className="kuki-center-nav d-none d-lg-flex">
          {isDelivery ? (
            <Link className={`kuki-nav-link${isActive('/delivery')}`} to="/delivery">Dashboard</Link>
          ) : loggedIn ? (
            <>
              <Link className={`kuki-nav-link${isActive('/')}`} to="/">Home</Link>
              <Link className={`kuki-nav-link${isActive('/explore')}`} to="/explore">Menu</Link>
              <Link className={`kuki-nav-link${isActive('/offers')}`} to="/offers">Offers</Link>
              <Link className={`kuki-nav-link${isActive('/about')}`} to="/about">About Us</Link>
              <Link className={`kuki-nav-link${isActive('/orders')}`} to="/orders">My Orders</Link>
              <Link className={`kuki-nav-link${isActive('/contact')}`} to="/contact">Contact Us</Link>
            </>
          ) : (
            <>
              <button className={`kuki-nav-link${isHome && activeSection === 'hero' ? ' active' : ''}`} onClick={() => scrollTo('hero')}>Home</button>
              <button className={`kuki-nav-link${isHome && activeSection === 'explore' ? ' active' : ''}`} onClick={() => scrollTo('explore')}>Menu</button>
              <Link className={`kuki-nav-link${isActive('/offers')}`} to="/offers">Offers</Link>
              <Link className={`kuki-nav-link${isActive('/about')}`} to="/about">About Us</Link>
              <button className={`kuki-nav-link${isHome && activeSection === 'contact' ? ' active' : ''}`} onClick={() => scrollTo('contact')}>Contact Us</button>
            </>
          )}
        </nav>
      </div>

      {/* ── Mobile nav drawer ── */}
      <div className={`kuki-mobile-nav${navOpen ? ' is-open' : ''}`}>
        {isDelivery ? (
          <Link className="kuki-mobile-link" to="/delivery">Dashboard</Link>
        ) : loggedIn ? (
          <>
            <Link className="kuki-mobile-link" to="/">Home</Link>
            <Link className="kuki-mobile-link" to="/explore">Menu</Link>
            <Link className="kuki-mobile-link" to="/offers">Offers</Link>
            <Link className="kuki-mobile-link" to="/about">About Us</Link>
            <Link className="kuki-mobile-link" to="/orders">My Orders</Link>
            <Link className="kuki-mobile-link" to="/contact">Contact Us</Link>
          </>
        ) : (
          <>
            <button className="kuki-mobile-link" onClick={() => scrollTo('hero')}>Home</button>
            <button className="kuki-mobile-link" onClick={() => scrollTo('explore')}>Menu</button>
            <Link className="kuki-mobile-link" to="/offers">Offers</Link>
            <Link className="kuki-mobile-link" to="/about">About Us</Link>
            <button className="kuki-mobile-link" onClick={() => scrollTo('contact')}>Contact Us</button>
          </>
        )}
      </div>
    </header>
  );
};

export default Menubar;
