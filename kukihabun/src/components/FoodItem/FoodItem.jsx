/**
 * FoodItem — a single food card in the menu grid.
 *
 * Add-to-cart behaviour depends on whether the item has customization options:
 *  - No options → add directly.
 *  - Has options, first add → show "Customize Now / Continue Anyway" prompt.
 *  - Has options, subsequent add (already in cart) → "Same customization / Change" prompt.
 *
 * The two prompts are kept separate because the second add has different copy
 * (it references the existing customization rather than introducing the feature).
 *
 * Foods with portions get a picker before the above. Once exactly one portion line
 * is in the cart, the card shows the same +/- stepper as a plain food (targeting
 * that line) — only a rare second simultaneous portion line falls back to a plain
 * "N in cart" + Add.
 */

import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import PortionPicker from '../PortionPicker/PortionPicker';
import './FoodItem.css';

const FoodItem = ({ food }) => {
  const { increaseQty, decreaseQty, quantities, user, addPortionToCart, selectedPortions } = useContext(StoreContext);
  const navigate = useNavigate();
  const [showCustomizePrompt, setShowCustomizePrompt]     = useState(false);
  const [showSameCustomPrompt, setShowSameCustomPrompt]   = useState(false);
  const [showPortionPicker, setShowPortionPicker]         = useState(false);
  // Portion picked in the popup above, held until the (optional) customization
  // prompt below is resolved — that's when it actually gets added to the cart.
  const [chosenPortion, setChosenPortion]                 = useState(null);

  const hasPortions = food.portions?.length > 0;

  const hasCustomizations = food.customizationOptions &&
    ((food.customizationOptions.spiceLevels?.length > 0) ||
     (food.customizationOptions.ingredientsToAvoid?.length > 0) ||
     (food.customizationOptions.customizables?.length > 0));

  // Every portion-line of this food currently in the cart (each portion is its own
  // cart line — see StoreContext's lineKey). Almost always 0 or 1 in practice — a
  // second entry only happens if the customer picked a second portion of the same
  // dish (e.g. one Small + one Large).
  const portionCartKeys = hasPortions
    ? Object.keys(quantities).filter(key => key.startsWith(`${food.id}::`) && quantities[key] > 0)
    : [];
  const totalInCart = hasPortions
    ? portionCartKeys.reduce((sum, key) => sum + quantities[key], 0)
    : (quantities[food.id] || 0);
  // Exactly one portion line → the card can show the normal +/- stepper just like a
  // food with no portions, targeting that one line. With 0 or 2+ lines there's no
  // single line to target, so the stepper falls back to "N in cart" + Add.
  const singlePortionKey = portionCartKeys.length === 1 ? portionCartKeys[0] : null;
  const stepperKey = hasPortions ? singlePortionKey : food.id;

  const handleAdd = () => {
    // Unauthenticated users are sent to /signin first.
    if (!user) { navigate('/signin'); return; }
    if (hasPortions) {
      setShowPortionPicker(true);
      return;
    }
    if (hasCustomizations) {
      // Show the "Would you like to customise?" prompt before adding.
      setShowCustomizePrompt(true);
    } else {
      increaseQty(food.id);
    }
  };

  // Handler for the stepper's + button once the item is already in the cart —
  // shared by plain foods and foods with exactly one portion line (stepperKey
  // points at the right cart line either way).
  const handleStepperIncrease = () => {
    if (hasCustomizations) {
      // Ask whether they want the same customization or a different one. Remember
      // which portion this line is so "Change Customization" can preselect it.
      if (hasPortions) setChosenPortion(selectedPortions[singlePortionKey] || null);
      setShowSameCustomPrompt(true);
    } else {
      increaseQty(stepperKey);
    }
  };

  const handlePortionConfirm = (portion) => {
    setShowPortionPicker(false);
    if (hasCustomizations) {
      setChosenPortion(portion);
      setShowCustomizePrompt(true);
    } else {
      addPortionToCart(food.id, portion);
    }
  };

  const addWithoutCustomize = () => {
    setShowCustomizePrompt(false);
    if (chosenPortion) {
      addPortionToCart(food.id, chosenPortion);
      setChosenPortion(null);
    } else {
      increaseQty(food.id);
    }
  };

  const goToDetails = () => {
    setShowCustomizePrompt(false);
    setShowSameCustomPrompt(false);
    navigate(`/food/${food.id}`, chosenPortion ? { state: { portionName: chosenPortion.name } } : undefined);
    setChosenPortion(null);
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
          {food.available === false ? (
            <span className="badge" style={{ background: 'rgba(244,115,115,0.15)', color: '#f47373', fontSize: '0.75rem', padding: '6px 10px' }}>
              <i className="bi bi-slash-circle me-1"></i>Out of Stock
            </span>
          ) : hasPortions && portionCartKeys.length > 1 ? (
            // Two+ different portions of this dish are already in the cart at once —
            // there's no single line for a +/- stepper to target, so fall back to a
            // summary badge; Add reopens the picker for another portion.
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{totalInCart} in cart</span>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                <i className="bi bi-cart-plus me-1"></i>Add
              </button>
            </div>
          ) : stepperKey && quantities[stepperKey] > 0 ? (
            // Item is in cart — show the quantity stepper (same UI whether or not the
            // food has portions; stepperKey points at the right cart line either way).
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-danger btn-sm" onClick={() => decreaseQty(stepperKey)}>
                <i className="bi bi-dash-circle"></i>
              </button>
              <span className="fw-bold">{quantities[stepperKey]}</span>
              <button className="btn btn-success btn-sm" onClick={handleStepperIncrease}>
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

      {/* ── Portion picker (shown first when the food has portions) ── */}
      {showPortionPicker && (
        <PortionPicker
          foodName={food.name}
          portions={food.portions}
          onConfirm={handlePortionConfirm}
          onCancel={() => setShowPortionPicker(false)}
        />
      )}

      {/* ── First-add customization prompt ── */}
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

      {/* ── Subsequent-add prompt (item already in cart) ── */}
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
                onClick={() => { setShowSameCustomPrompt(false); increaseQty(stepperKey); setChosenPortion(null); }}
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
