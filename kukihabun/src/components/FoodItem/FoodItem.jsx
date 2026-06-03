import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import './FoodItem.css';

const FoodItem = ({ food }) => {
  const { increaseQty, decreaseQty, quantities, user } = useContext(StoreContext);
  const navigate = useNavigate();
  const [showCustomizePrompt, setShowCustomizePrompt] = useState(false);
  const [showSameCustomPrompt, setShowSameCustomPrompt] = useState(false);
  const hasCustomizations = food.customizationOptions &&
    ((food.customizationOptions.spiceLevels?.length > 0) ||
     (food.customizationOptions.ingredientsToAvoid?.length > 0) ||
     (food.customizationOptions.customizables?.length > 0));

  const handleAdd = () => {
    if (!user) { navigate('/signin'); return; }
    if (hasCustomizations) {
      setShowCustomizePrompt(true);
    } else {
      increaseQty(food.id);
    }
  };

  // Called when user clicks + on an item already in cart
  const handleIncrease = () => {
    if (hasCustomizations) {
      setShowSameCustomPrompt(true);
    } else {
      increaseQty(food.id);
    }
  };

  const addWithoutCustomize = () => {
    setShowCustomizePrompt(false);
    increaseQty(food.id);
  };

  const goToDetails = () => {
    setShowCustomizePrompt(false);
    setShowSameCustomPrompt(false);
    navigate(`/food/${food.id}`);
  };

  return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4 d-flex justify-content-center">
      <div className="card food-item-card h-100">
        <Link to={`/food/${food.id}`}>
          <img
            src={food.imageUrl || 'https://via.placeholder.com/320x200'}
            className="card-img-top food-item-image"
            alt={food.name || 'Food Image'}
          />
        </Link>
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{food.name}</h5>
          <p className="card-text text-muted small flex-fill">{food.description}</p>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="h5 mb-0 fw-bold">Rs.{food.price}</span>
            {food.averageRating > 0 && (
              <div className="d-flex align-items-center gap-1">
                <i className="bi bi-star-fill text-warning small"></i>
                <small className="text-muted">{food.averageRating?.toFixed(1)}</small>
              </div>
            )}
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center bg-transparent border-top">
          <Link className="btn btn-outline-primary btn-sm" to={`/food/${food.id}`}>Details</Link>
          {quantities[food.id] > 0 ? (
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-danger btn-sm" onClick={() => decreaseQty(food.id)}>
                <i className="bi bi-dash-circle"></i>
              </button>
              <span className="fw-bold">{quantities[food.id]}</span>
              <button className="btn btn-success btn-sm" onClick={handleIncrease}>
                <i className="bi bi-plus-circle"></i>
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>
              <i className="bi bi-cart-plus me-1"></i>Add
            </button>
          )}
        </div>
      </div>

      {/* Customize prompt (first add) */}
      {showCustomizePrompt && (
        <div className="customize-backdrop" onClick={() => setShowCustomizePrompt(false)}>
          <div className="customize-prompt" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div style={{ fontSize: '2.4rem', lineHeight: 1, marginBottom: '0.5rem' }}>🍜</div>
              <h5 className="fw-bold mb-2" style={{ color: 'var(--gold)' }}>Wait! Don't miss out.</h5>
              <p className="small mb-1" style={{ color: 'rgba(240,236,224,0.8)' }}>
                You can customise this dish before adding it to your cart.
              </p>
              <p className="small mb-0" style={{ color: 'rgba(240,236,224,0.45)' }}>
                Adjust spice level, add-ons, and more — just the way you like it.
              </p>
            </div>
            <div className="d-flex flex-column gap-2">
              <button
                className="btn fw-semibold py-2"
                style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 10 }}
                onClick={goToDetails}
              >
                <i className="bi bi-sliders2 me-2"></i>Customize Now
              </button>
              <button
                className="btn btn-outline-secondary py-2"
                style={{ borderRadius: 10, fontSize: '0.85rem' }}
                onClick={addWithoutCustomize}
              >
                <i className="bi bi-cart-plus me-2"></i>Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Same customization prompt (subsequent adds) */}
      {showSameCustomPrompt && (
        <div className="customize-backdrop" onClick={() => setShowSameCustomPrompt(false)}>
          <div className="customize-prompt" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div style={{ fontSize: '2.4rem', lineHeight: 1, marginBottom: '0.5rem' }}>🔄</div>
              <h5 className="fw-bold mb-2" style={{ color: 'var(--gold)' }}>Adding another serving</h5>
              <p className="small mb-0" style={{ color: 'rgba(240,236,224,0.7)' }}>
                Would you like the same customization as your previous serving, or set a different one?
              </p>
            </div>
            <div className="d-flex flex-column gap-2">
              <button
                className="btn fw-semibold py-2"
                style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 10 }}
                onClick={() => { setShowSameCustomPrompt(false); increaseQty(food.id); }}
              >
                <i className="bi bi-check-circle me-2"></i>Same Customization
              </button>
              <button
                className="btn btn-outline-secondary py-2"
                style={{ borderRadius: 10, fontSize: '0.85rem' }}
                onClick={goToDetails}
              >
                <i className="bi bi-sliders2 me-2"></i>Change Customization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodItem;
