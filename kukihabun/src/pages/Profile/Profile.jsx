import React, { useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useContext(StoreContext);

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-person-x fs-1 text-muted"></i>
        <p className="mt-3">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <img
                src={user.picture}
                alt={user.name}
                width={100} height={100}
                className="rounded-circle border mb-3"
                referrerPolicy="no-referrer"
              />
              <h4 className="fw-bold">{user.name}</h4>
              <p className="text-muted">{user.email}</p>
              <span className="badge bg-primary mb-4">{user.role}</span>

              <div className="d-grid gap-2">
                <Link to="/orders" className="btn btn-outline-primary">
                  <i className="bi bi-bag me-2"></i>My Orders
                </Link>
                <Link to="/orders?tab=history" className="btn btn-outline-secondary">
                  <i className="bi bi-clock-history me-2"></i>History
                </Link>
                <Link to="/chat" className="btn btn-outline-secondary">
                  <i className="bi bi-chat-dots me-2"></i>Chat with Shop Owner
                </Link>
                <button className="btn btn-outline-danger" onClick={logout}>
                  <i className="bi bi-box-arrow-right me-2"></i>Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
