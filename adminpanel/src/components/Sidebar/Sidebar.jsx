/**
 * Sidebar — admin panel navigation menu.
 *
 * Renders nav links for all admin sections. The Chat link shows a badge with the
 * number of conversations that have received new messages since the admin last
 * visited the Chat page.
 *
 * Unread count logic:
 *  - `admin_chat_last_visit` (localStorage) stores the timestamp of the admin's
 *    last visit to /chat.
 *  - On every route change, conversations are re-fetched and those whose
 *    `lastMessageAt` is newer than `lastVisit` are counted as unread.
 *  - The count resets to 0 immediately when the admin navigates to /chat
 *    (before the fetch completes) so the badge clears without a delay.
 *  - localStorage is used (not sessionStorage) so the last-visit timestamp
 *    persists across tab refreshes — otherwise every refresh would reset it
 *    and make all messages appear new.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { assets } from '../../assets/assets';

const LAST_VISIT_KEY = 'admin_chat_last_visit';

const Sidebar = ({ sidebarVisible }) => {
  const { pathname } = useLocation();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    // Record the first-ever visit timestamp so messages that arrived before this
    // session don't appear as "new" on the very first load.
    if (!localStorage.getItem(LAST_VISIT_KEY)) {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    }

    const fetchUnread = async () => {
      // Viewing chat now — badge should be zero immediately, before the fetch.
      if (pathname === '/chat') {
        setChatUnread(0);
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/conversations`);
        if (!res.ok) return;
        const convs = await res.json();
        const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
        const cutoff = lastVisit ? new Date(lastVisit) : null;
        if (!cutoff) { setChatUnread(0); return; }
        // Count conversations where the latest message arrived after the last visit.
        const count = convs.filter(c =>
          c.unreadCount > 0 &&
          c.lastMessageAt &&
          new Date(c.lastMessageAt) > cutoff
        ).length;
        setChatUnread(count);
      } catch { /* silent — badge simply stays at its previous value */ }
    };

    fetchUnread();
    // Poll every 30 seconds as a fallback (no WebSocket on this route).
    const iv = setInterval(fetchUnread, 30_000);
    return () => clearInterval(iv);
  }, [pathname]); // re-run whenever the admin navigates so /chat clears instantly

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
        <img src={assets.logo} alt="KukiHabun" height={56} width={56} style={{ borderRadius: 10 }} />
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
