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
import Offers from './pages/Offers/Offers'
import Login from './pages/Login/Login'
import { ToastContainer } from 'react-toastify'

const ADMIN_IDLE_MS = 30 * 60 * 1000; // 30 minutes

const App = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // sessionStorage clears automatically when the browser tab/window is closed
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState(() => {
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

  // 30-minute idle auto-logout
  useEffect(() => {
    if (!adminToken) return;

    const reset = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(handleLogout, ADMIN_IDLE_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(idleTimer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <Sidebar sidebarVisible={sidebarVisible} />
      <div id="page-content-wrapper">
        <Menubar toggleSidebar={toggleSidebar} adminUser={adminUser} onLogout={handleLogout} />
        <ToastContainer theme="dark" />
        <div className="container-fluid">
          <Routes>
            <Route path='/' element={<Analytics />} />
            <Route path='/analytics' element={<Analytics adminToken={adminToken} />} />
            <Route path='/orders' element={<Orders adminToken={adminToken} />} />
            <Route path='/foods' element={<AvailableFoods />} />
            <Route path='/users' element={<Users />} />
            <Route path='/reviews' element={<Reviews />} />
            <Route path='/chat' element={<Chat />} />
            <Route path='/history' element={<History />} />
            <Route path='/offers' element={<Offers />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
