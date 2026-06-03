import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { assets } from '../../assets/assets';

const LAST_VISIT_KEY = 'admin_chat_last_visit';

const Sidebar = ({ sidebarVisible }) => {
  const { pathname } = useLocation();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    // If no lastVisit recorded yet, record now so messages before this session don't show as new
    if (!localStorage.getItem(LAST_VISIT_KEY)) {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    }

    const fetchUnread = async () => {
      // Admin is actively viewing chat — badge should be zero
      if (pathname === '/chat') {
        setChatUnread(0);
        return;
      }
      try {
        const res = await fetch('http://localhost:8080/api/chat/conversations');
        if (!res.ok) return;
        const convs = await res.json();
        const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
        const cutoff = lastVisit ? new Date(lastVisit) : null;
        if (!cutoff) { setChatUnread(0); return; }
        const count = convs.filter(c =>
          c.unreadCount > 0 &&
          c.lastMessageAt &&
          new Date(c.lastMessageAt) > cutoff
        ).length;
        setChatUnread(count);
      } catch { /* silent */ }
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30_000);
    return () => clearInterval(iv);
  }, [pathname]); // refetch when navigating

  const navItem = (to, icon, label, badge) => {
    const active = pathname === to;
    return (
      <Link
        key={to}
        className={`sidebar-item d-flex align-items-center gap-3 px-3 py-3 text-decoration-none ${active ? 'active' : ''}`}
        to={to}
      >
        <i className={`bi ${icon}`}></i>
        <span className="flex-fill">{label}</span>
        {badge > 0 && (
          <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.62rem', minWidth: 18 }}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className={`sidebar-wrapper ${sidebarVisible ? '' : 'd-none'}`} id="sidebar-wrapper">
      <div className="sidebar-brand">
        <img src={assets.logo} alt="KukiHabun" height={56} width={56} style={{ borderRadius: 10 }} />
        <span className="sidebar-brand-name">KukiHabun</span>
      </div>
      <nav className="sidebar-nav">
        {navItem('/analytics', 'bi-bar-chart-line',  'Analytics')}
        {navItem('/orders',    'bi-bag',             'Orders')}
        {navItem('/foods',     'bi-grid',            'Available Foods')}
        {navItem('/users',     'bi-people',          'Users')}
        {navItem('/reviews',   'bi-star',            'Reviews & Ratings')}
        {navItem('/chat',      'bi-chat-dots',       'Customer Chat', chatUnread)}
        {navItem('/history',   'bi-clock-history',   'History')}
        {navItem('/offers',    'bi-tag',             'Offers')}
      </nav>
    </div>
  );
};

export default Sidebar;
