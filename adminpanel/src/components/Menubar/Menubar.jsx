import React from 'react';
import { Link } from 'react-router-dom';

const Menubar = ({ toggleSidebar, adminUser, onLogout, chatUnread }) => {
  return (
    <nav className="navbar" style={{
      background: '#111',
      borderBottom: '1px solid rgba(201,168,76,0.15)',
      padding: '0.6rem 1rem',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container-fluid px-0 d-flex align-items-center justify-content-between">
        <button
          className="btn btn-sm"
          onClick={toggleSidebar}
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)' }}
        >
          <i className="bi bi-list fs-5"></i>
        </button>

        {adminUser && (
          <div className="d-flex align-items-center gap-3">
            {chatUnread > 0 && (
              <Link to="/chat" className="d-flex align-items-center gap-1 text-decoration-none" style={{ color: '#f0ece0' }} title="Unread customer messages">
                <i className="bi bi-chat-dots" style={{ color: 'var(--gold)' }}></i>
                <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.62rem', minWidth: 18 }}>
                  {chatUnread}
                </span>
              </Link>
            )}
            <span className="small" style={{ color: 'rgba(240,236,224,0.55)' }}>
              <i className="bi bi-person-circle me-1" style={{ color: 'var(--gold)' }}></i>
              {adminUser.name || adminUser.username}
            </span>
            <button
              className="btn btn-sm btn-outline-danger"
              style={{ fontSize: '0.78rem' }}
              onClick={onLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Menubar;
