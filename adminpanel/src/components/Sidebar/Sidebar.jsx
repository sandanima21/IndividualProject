/**
 * Sidebar — admin panel navigation menu.
 *
 * Renders nav links for all admin sections. The Chat link shows a badge with the
 * number of conversations that have received new messages since the admin last
 * visited the Chat page — the count itself is computed once in App.jsx (shared
 * with Menubar's own badge) and passed down here as a prop.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { assets } from '../../assets/assets';

const Sidebar = ({ sidebarVisible, chatUnread }) => {
  const { pathname } = useLocation();

  // Helper to build a nav link with optional unread badge.
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
    // `d-none` hides the sidebar completely when toggled off (desktop collapse).
    // On mobile, CSS promotes it to position:fixed so it becomes an overlay drawer.
    <div className={`sidebar-wrapper ${sidebarVisible ? '' : 'd-none'}`} id="sidebar-wrapper">
      <div className="sidebar-brand">
        <img src={assets.logo} alt="KukiHabun" height={44} width={44} style={{ borderRadius: 9 }} />
        <span className="sidebar-brand-name">KukiHabun</span>
      </div>
      <nav className="sidebar-nav">
        {navItem('/analytics', 'bi-bar-chart-line',  'Analytics')}
        {navItem('/orders',    'bi-bag',             'Orders')}
        {navItem('/foods',     'bi-grid',            'Available Foods')}
        {navItem('/users',     'bi-people',          'Users')}
        {navItem('/reviews',   'bi-star',            'Reviews & Ratings')}
        {navItem('/chat',      'bi-chat-dots',            'Customer Chat', chatUnread)}
        {navItem('/history',   'bi-clock-history',       'History')}
        {navItem('/refunds',   'bi-arrow-counterclockwise', 'Refunds')}
        {navItem('/offers',    'bi-tag',                  'Offers')}
      </nav>
    </div>
  );
};

export default Sidebar;
