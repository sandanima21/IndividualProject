import React, { useEffect, useRef, useState } from 'react';
import { getFoodList, deleteFood, addFood, updateFood, setFoodAvailability } from '../../services/foodService';
import { getCategoryList } from '../../services/categoryService';
import { toast } from 'react-toastify';

const EMPTY_FORM = { name: '', description: '', price: '', category: '' };

const validatePrice = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return 'Price is required.';
  if (!/^\d+(\.\d{1,2})?$/.test(String(raw))) return 'Enter a valid amount (numbers only).';
  if (Number(raw) <= 0) return 'Price must be greater than 0.';
  return '';
};

/* ── Inline option chips for one customization type ── */
const OptionChips = ({ options = [], setOptions }) => {
  const [input, setInput] = useState('');
  const safeOptions = Array.isArray(options) ? options : [];
  const add = () => {
    const v = input.trim();
    if (!v || safeOptions.includes(v)) return;
    setOptions([...safeOptions, v]);
    setInput('');
  };
  return (
    <div>
      <div className="d-flex gap-2 mb-2">
        <input
          className="form-control form-control-sm"
          placeholder="e.g. Mild, Medium, Spicy…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          style={{ background: 'rgba(255,255,255,0.06)', color: '#e8e4da', border: '1px solid rgba(201,168,76,0.15)' }}
        />
        <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0" onClick={add}>
          <i className="bi bi-plus me-1"></i>Add
        </button>
      </div>
      {safeOptions.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-1">
          {safeOptions.map(opt => (
            <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>
              {opt}
              <button type="button" onClick={() => setOptions(safeOptions.filter(o => o !== opt))}
                style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '0.7rem' }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Portions builder (optional named/priced variants — e.g. Small/Medium/Large) ── */
const validatePortions = (list) => {
  const names = new Set();
  for (const p of list) {
    const name = (p.name || '').trim();
    const hasName = !!name;
    const hasPrice = p.price !== '' && p.price != null;
    if (!hasName && !hasPrice) continue; // fully empty row — ignored, not an error
    if (!hasName) return 'Each portion needs a name.';
    if (!hasPrice) return `Enter a price for "${name}".`;
    const priceErr = validatePrice(p.price);
    if (priceErr) return `"${name}": ${priceErr}`;
    const key = name.toLowerCase();
    if (names.has(key)) return `Duplicate portion name "${name}".`;
    names.add(key);
  }
  return '';
};

const PortionBuilder = ({ portions, setPortions }) => {
  const addPortion = () => setPortions(prev => [...prev, { name: '', price: '' }]);
  const updatePortion = (idx, field, value) =>
    setPortions(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  const removePortion = (idx) => setPortions(prev => prev.filter((_, i) => i !== idx));

  return (
    <div>
      {portions.map((p, idx) => {
        const priceErr = p.price !== '' && p.price != null ? validatePrice(p.price) : '';
        return (
          <div key={idx} className="d-flex gap-2 align-items-start mb-2">
            <input
              className="form-control form-control-sm"
              placeholder="e.g. Small"
              value={p.name}
              onChange={e => updatePortion(idx, 'name', e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e8e4da', border: '1px solid rgba(201,168,76,0.2)' }}
            />
            <div style={{ width: 130, flexShrink: 0 }}>
              <input
                type="number" min="0.01" step="0.01"
                className={`form-control form-control-sm${priceErr ? ' is-invalid' : ''}`}
                placeholder="Price"
                value={p.price}
                onChange={e => updatePortion(idx, 'price', e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#e8e4da', border: '1px solid rgba(201,168,76,0.2)' }}
              />
            </div>
            <button type="button" className="btn btn-sm btn-outline-danger flex-shrink-0" onClick={() => removePortion(idx)}>
              <i className="bi bi-trash"></i>
            </button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addPortion}>
        <i className="bi bi-plus me-1"></i>Add Portion
      </button>
    </div>
  );
};

/* ── Unified Customization Builder ── */
const CustomizationBuilder = ({ customizables, setCustomizables }) => {
  const [typeInput, setTypeInput] = useState('');

  const addType = () => {
    const t = typeInput.trim();
    if (!t) return;
    if (customizables.find(c => c.thing.toLowerCase() === t.toLowerCase())) return;
    setCustomizables(prev => [...prev, { thing: t, options: [] }]);
    setTypeInput('');
  };

  const setOptions = (thing, newOptions) => {
    setCustomizables(prev => prev.map(c => c.thing === thing ? { ...c, options: newOptions } : c));
  };

  const removeType = (thing) => {
    setCustomizables(prev => prev.filter(c => c.thing !== thing));
  };

  return (
    <div>
      {/* Add new type */}
      <div className="d-flex gap-2 mb-3">
        <input
          className="form-control form-control-sm"
          placeholder="e.g. Spicy Level, Sugar Level, Ice Level…"
          value={typeInput}
          onChange={e => setTypeInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
          style={{ background: 'rgba(255,255,255,0.06)', color: '#e8e4da', border: '1px solid rgba(201,168,76,0.2)' }}
        />
        <button type="button" className="btn btn-sm btn-primary flex-shrink-0" onClick={addType}>
          <i className="bi bi-plus me-1"></i>Add Type
        </button>
      </div>

      {customizables.length === 0 && (
        <p className="text-muted small mb-0">No customization types added. Type a name above and click Add Type.</p>
      )}

      {/* Each type block */}
      <div className="d-flex flex-column gap-3">
        {customizables.map(c => (
          <div key={c.thing} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 10, padding: '0.75rem 1rem' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem' }}>
                <i className="bi bi-sliders2 me-2" style={{ opacity: 0.6 }}></i>{c.thing}
              </span>
              <button type="button" onClick={() => removeType(c.thing)}
                style={{ background: 'none', border: 'none', color: 'rgba(244,115,115,0.7)', cursor: 'pointer', padding: '2px 5px', fontSize: '0.75rem' }}>
                <i className="bi bi-trash me-1"></i>Remove
              </button>
            </div>
            <OptionChips
              options={c.options}
              setOptions={(newOpts) => setOptions(c.thing, newOpts)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Food Form Modal (Add / Edit) ── */
const FoodModal = ({ mode, initial, categories, onClose, onSaved }) => {
  const [data, setData] = useState(initial?.form || EMPTY_FORM);

  // Merge legacy spiceLevels into customizables on edit
  const initCustomizables = () => {
    const customs = initial?.customizables
      ? initial.customizables.map(c => ({ ...c, options: Array.isArray(c.options) ? c.options : [] }))
      : [];
    const spice = initial?.spiceLevels || [];
    if (spice.length > 0 && !customs.find(c => c.thing === 'Spice Level')) {
      customs.unshift({ thing: 'Spice Level', options: spice });
    }
    return customs;
  };

  const [customizables, setCustomizables] = useState(initCustomizables);
  const [portions, setPortions] = useState(initial?.portions?.map(p => ({ name: p.name, price: String(p.price) })) || []);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(initial?.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState('');

  const handleField = e => {
    const { name, value } = e.target;
    setData(p => ({ ...p, [name]: value }));
    if (name === 'price') setPriceError(validatePrice(value));
  };
  const handleImage = e => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'add' && !image) { toast.error('Please upload an image.'); return; }
    if (!data.name.trim()) { toast.error('Food name is required.'); return; }
    if (!data.category) { toast.error('Please select a category.'); return; }
    const priceErr = validatePrice(data.price);
    if (priceErr) { setPriceError(priceErr); toast.error(priceErr); return; }
    const portionsErr = validatePortions(portions);
    if (portionsErr) { toast.error(portionsErr); return; }
    setSubmitting(true);
    try {
      const customizationOptions = { spiceLevels: [], ingredientsToAvoid: [], customizables };
      const cleanedPortions = portions
        .filter(p => p.name.trim())
        .map(p => ({ name: p.name.trim(), price: Number(p.price) }));
      if (mode === 'add') {
        await addFood({ ...data, price: Number(data.price), customizationOptions, portions: cleanedPortions }, image);
        toast.success('Food added successfully!');
      } else {
        await updateFood(initial.id, { ...data, price: Number(data.price), customizationOptions, portions: cleanedPortions }, image);
        toast.success('Food updated successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || null;
      toast.error(msg || (mode === 'add' ? 'Failed to add food.' : 'Failed to update food.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 18, width: '100%', maxWidth: 640, padding: '1.75rem', position: 'relative' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0">
            <i className={`bi ${mode === 'add' ? 'bi-plus-circle' : 'bi-pencil-square'} me-2`} style={{ color: 'var(--gold)' }}></i>
            {mode === 'add' ? 'Add New Food' : 'Edit Food'}
          </h5>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3 gy-5">

            {/* Image upload */}
            <div className="col-12 text-center">
              <label htmlFor="foodImgInput" style={{ cursor: 'pointer', display: 'inline-block' }}>
                <div style={{ width: 110, height: 88, borderRadius: 12, overflow: 'hidden', border: '2px dashed rgba(201,168,76,0.35)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#202020' }}>
                  {preview
                    ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="text-center"><i className="bi bi-cloud-upload fs-3 text-muted d-block"></i><small className="text-muted" style={{ fontSize: '0.68rem' }}>Upload</small></div>}
                </div>
                <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                  {mode === 'edit' ? 'Click to change image' : 'Click to upload *'}
                </small>
              </label>
              <input type="file" id="foodImgInput" hidden onChange={handleImage} accept="image/*" />
            </div>

            {/* Name */}
            <div className="col-md-6">
              <label className="form-label small">Food Name *</label>
              <input name="name" className="form-control" placeholder="e.g. Chicken Biriyani"
                value={data.name} onChange={handleField} required />
            </div>

            {/* Category */}
            <div className="col-md-3">
              <label className="form-label small">Category *</label>
              <select name="category" className="form-select" value={data.category} onChange={handleField} required>
                <option value="" disabled style={{ background: '#1a1a1a' }}>Select…</option>
                {categories.map(c => <option key={c.id} value={c.name} style={{ background: '#1a1a1a' }}>{c.name}</option>)}
              </select>
            </div>

            {/* Price */}
            <div className="col-md-3">
              <label className="form-label small">Price (Rs.) *</label>
              <input name="price" type="number" className={`form-control${priceError ? ' is-invalid' : ''}`} placeholder="850" min="1" step="0.01"
                value={data.price} onChange={handleField}
                onBlur={() => setPriceError(validatePrice(data.price))} required />
              {priceError && <div className="invalid-feedback d-block">{priceError}</div>}
            </div>

            {/* Description */}
            <div className="col-12">
              <label className="form-label small">Description *</label>
              <textarea name="description" className="form-control" rows="2" placeholder="Describe the dish..."
                value={data.description} onChange={handleField} required />
            </div>

            {/* Portions */}
            <div className="col-12">
              <label className="form-label small d-block mb-2">
                <i className="bi bi-rulers me-1" style={{ color: 'var(--gold)' }}></i>
                Portions
              </label>
              <PortionBuilder portions={portions} setPortions={setPortions} />
              {portions.length === 0 && (
                <p className="text-muted small mb-0 mt-1">No portions added — customers will just pay the price above.</p>
              )}
            </div>

            {/* Unified Customization */}
            <div className="col-12">
              <label className="form-label small d-block mb-2">
                <i className="bi bi-sliders2 me-1" style={{ color: 'var(--gold)' }}></i>
                Customization <span className="text-muted small">(add a type, then add its options)</span>
              </label>
              <CustomizationBuilder customizables={customizables} setCustomizables={setCustomizables} />
            </div>

            {/* Actions */}
            <div className="col-12 d-flex justify-content-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm px-4" disabled={submitting || !!priceError}>
                {submitting
                  ? <span className="spinner-border spinner-border-sm me-1" />
                  : <i className={`bi ${mode === 'add' ? 'bi-plus-circle' : 'bi-check2'} me-1`}></i>}
                {mode === 'add' ? 'Add Food' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main page ─── */
const AvailableFoods = () => {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', ...food }

  const load = async () => {
    try { setList(await getFoodList()); }
    catch { toast.error('Failed to load foods.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    getCategoryList().then(setCategories).catch(() => toast.error('Failed to load categories.'));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this food item?')) return;
    try { await deleteFood(id); toast.success('Deleted.'); load(); }
    catch { toast.error('Delete failed.'); }
  };

  const handleToggleAvailability = async (food) => {
    const nextAvailable = !food.available;
    try {
      await setFoodAvailability(food.id, nextAvailable);
      toast.success(nextAvailable ? `${food.name} is back in stock.` : `${food.name} marked out of stock.`);
      load();
    } catch {
      toast.error('Failed to update availability.');
    }
  };

  const openEdit = (food) => {
    setModal({
      mode: 'edit',
      id: food.id,
      imageUrl: food.imageUrl,
      form: { name: food.name, description: food.description, price: String(food.price), category: food.category || '' },
      spiceLevels: food.customizationOptions?.spiceLevels || [],
      customizables: food.customizationOptions?.customizables || [],
      portions: food.portions || [],
    });
  };

  const filtered = list.filter(f =>
    (!search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.category?.toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === 'all' || f.category === categoryFilter)
  );

  return (
    <div className="py-4 px-3">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-grid me-2" style={{ color: 'var(--gold)' }}></i>Available Foods
          <span className="badge bg-secondary ms-2">{list.length}</span>
        </h4>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 170 }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div className="position-relative">
            <i className="bi bi-search position-absolute" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.6)', fontSize: '0.85rem', pointerEvents: 'none' }}></i>
            <input
              className="form-control form-control-sm"
              placeholder="Search foods..."
              style={{ width: 200, paddingLeft: '2rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm px-3" onClick={() => setModal({ mode: 'add' })}>
            <i className="bi bi-plus-circle me-1"></i>Add Food
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-center py-5">No foods found.</p>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: '20%', textAlign: 'center' }}>Image</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Name</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Category</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Price</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={item.available === false ? { opacity: 0.55 } : undefined}>
                  <td style={{ textAlign: 'center' }}>
                    <img src={item.imageUrl} alt={item.name} width={60} height={48} style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="fw-semibold d-flex align-items-center justify-content-center gap-2">
                      {item.name}
                      {item.available === false && (
                        <span className="badge" style={{ background: 'rgba(244,115,115,0.15)', color: '#f47373', fontSize: '0.65rem' }}>Out of Stock</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', fontSize: '0.75rem' }}>{item.category}</span>
                  </td>
                  <td className="fw-semibold" style={{ textAlign: 'center' }}>Rs.{item.price}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="d-flex justify-content-center gap-1">
                      <button
                        className={`btn btn-sm px-2 ${item.available === false ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                        title={item.available === false ? 'Resume — back in stock' : 'Pause — out of stock'}
                        onClick={() => handleToggleAvailability(item)}
                      >
                        <i className={`bi ${item.available === false ? 'bi-play-fill' : 'bi-pause-fill'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-warning px-2" title="Edit" onClick={() => openEdit(item)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger px-2" onClick={() => handleDelete(item.id)} title="Delete">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <FoodModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal : null}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default AvailableFoods;
