/**
 * App — root component for the KukiHabun admin panel.
 *
 * Auth strategy:
 *  - Uses sessionStorage (not localStorage) so the session expires automatically
 *    when the browser tab or window is closed — important for shared/office machines.
 *  - An idle timer auto-logs the admin out after 30 minutes of no interaction.
 *    The timer resets on any mouse move, key press, click, scroll, or touch event.
 *
 * Layout:
 *  - Sidebar (220 px, fixed on desktop / overlay drawer on mobile) + page content.
 *  - The sidebar can be toggled via the hamburger button in Menubar.
 *  - On mobile, a translucent backdrop appears behind the open sidebar;
 *    clicking it closes the drawer.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Menubar from './components/Menubar/Menubar'
import Analytics from './pages/Analytics/Analytics'
import Orders from './pages/Orders/Orders'
import AvailableFoods from './pages/AvailableFoods/AvailableFoods'
import Users from './pages/Users/Users'
import Reviews from './pages/Reviews/Reviews'
import Chat from './pages/Chat/Chat'
import History from './pages/History/History'
import Refunds from './pages/Refunds/Refunds'
import Offers from './pages/Offers/Offers'
import Login from './pages/Login/Login'
import { ToastContainer } from 'react-toastify'

// 30 minutes — enough time for a normal work session without risking leaving
// the panel exposed on an unattended machine.
const ADMIN_IDLE_MS = 30 * 60 * 1000;

const App = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // sessionStorage is intentionally used here: unlike localStorage it is cleared
  // when the tab closes, so admins are never silently kept logged in.
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('admin_token'));
  const [adminUser, setAdminUser]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('admin_user')); } catch { return null; }
  });

  const idleTimer = useRef(null);

  const handleLogin = (data) => {
    sessionStorage.setItem('admin_token', data.token);
    sessionStorage.setItem('admin_user', JSON.stringify(data));
    setAdminToken(data.token);
    setAdminUser(data);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    clearTimeout(idleTimer.current);
    setAdminToken(null);
    setAdminUser(null);
  };

  // ── Idle auto-logout ─────────────────────────────────────────────────────
  // Attaches passive listeners to the most common interaction events.
  // Each event resets the countdown. The cleanup removes all listeners and
  // clears the timer so a re-login starts with a fresh 30-minute window.
  useEffect(() => {
    if (!adminToken) return;

    const reset = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(handleLogout, ADMIN_IDLE_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the countdown immediately on login

    return () => {
      clearTimeout(idleTimer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show the login screen when there's no valid session.
  if (!adminToken || !adminUser) {
    return (
      <>
        <ToastContainer theme="dark" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  return (
    <div className="d-flex" id="wrapper">
      {/* Mobile backdrop — clicking it closes the sidebar drawer.
          Rendered in the DOM only when the sidebar is open so it doesn't
          intercept clicks when the drawer is hidden. */}
      <div
        className="sidebar-mobile-overlay"
        onClick={() => setSidebarVisible(false)}
        style={{ display: sidebarVisible ? undefined : 'none' }}
      />

      <Sidebar sidebarVisible={sidebarVisible} />

      <div id="page-content-wrapper">
        <Menubar toggleSidebar={toggleSidebar} adminUser={adminUser} onLogout={handleLogout} />
        <ToastContainer theme="dark" />
        <div className="container-fluid">
          <Routes>
            <Route path='/'          element={<Analytics />} />
            <Route path='/analytics' element={<Analytics adminToken={adminToken} />} />
            <Route path='/orders'    element={<Orders adminToken={adminToken} />} />
            <Route path='/foods'     element={<AvailableFoods />} />
            <Route path='/users'     element={<Users />} />
            <Route path='/reviews'   element={<Reviews />} />
            <Route path='/chat'      element={<Chat />} />
            <Route path='/history'   element={<History />} />
            <Route path='/refunds'   element={<Refunds />} />
            <Route path='/offers'    element={<Offers />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
