/**
 * PortionPicker — popup shown before adding a food with portions (e.g. Small/Medium/
 * Large) to the cart. Reuses FoodItem's `.customize-backdrop`/`.customize-prompt`
 * styling so it looks consistent with the customization prompts shown right after it.
 */

import React, { useState } from 'react';
import '../FoodItem/FoodItem.css';

const PortionPicker = ({ foodName, portions, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="customize-backdrop" onClick={onCancel}>
      <div className="customize-prompt" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-3">
          <div style={{ fontSize: '2.2rem', lineHeight: 1, marginBottom: '0.4rem' }}>🍽️</div>
          <h5 className="fw-bold mb-1" style={{ color: 'var(--gold)' }}>Choose a Portion</h5>
          <p className="small mb-0" style={{ color: 'rgba(240,236,224,0.6)' }}>{foodName}</p>
        </div>

        <div className="d-flex flex-column gap-2 mb-3">
          {portions.map(p => {
            const isSelected = selected === p.name;
            return (
              <button
                key={p.name}
                type="button"
                className="btn d-flex justify-content-between align-items-center py-2 px-3"
                style={isSelected
                  ? { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700 }
                  : { background: 'transparent', color: '#f0ece0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10 }}
                onClick={() => setSelected(p.name)}
              >
                <span>{p.name}</span>
                <span>Rs.{Number(p.price).toFixed(2)}</span>
              </button>
            );
          })}
        </div>

        <div className="d-flex flex-column gap-2">
          <button
            type="button"
            className="btn fw-semibold py-2"
            style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 10, opacity: selected ? 1 : 0.5 }}
            disabled={!selected}
            onClick={() => onConfirm(portions.find(p => p.name === selected))}
          >
            <i className="bi bi-check-circle me-2"></i>OK
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary py-2"
            style={{ borderRadius: 10, fontSize: '0.85rem' }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortionPicker;
