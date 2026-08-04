import React, { useEffect, useState } from 'react';
import { getCategoryList, addCategory, updateCategory, deleteCategory } from '../../services/categoryService';
import { getFoodList } from '../../services/foodService';
import { toast } from 'react-toastify';

/* ── Add / Edit Category Modal ── */
const CategoryModal = ({ mode, initial, onClose, onSaved }) => {
  const [name, setName] = useState(initial?.name || '');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(initial?.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);

  const handleImage = e => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Category name is required.'); return; }
    if (mode === 'add' && !image) { toast.error('Please upload an image.'); return; }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        await addCategory(name.trim(), image);
        toast.success('Category added successfully!');
      } else {
        await updateCategory(initial.id, name.trim(), image);
        toast.success('Category updated successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || null;
      toast.error(msg || (mode === 'add' ? 'Failed to add category.' : 'Failed to update category.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 18, width: '100%', maxWidth: 420, padding: '1.75rem', position: 'relative' }}
        onClick={e => e.stopPropagation()}>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0">
            <i className={`bi ${mode === 'add' ? 'bi-plus-circle' : 'bi-pencil-square'} me-2`} style={{ color: 'var(--gold)' }}></i>
            {mode === 'add' ? 'Add Category' : 'Edit Category'}
          </h5>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 text-center">
              <label htmlFor="categoryImgInput" style={{ cursor: 'pointer', display: 'inline-block' }}>
                <div style={{ width: 110, height: 88, borderRadius: 12, overflow: 'hidden', border: '2px dashed rgba(201,168,76,0.35)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#202020' }}>
                  {preview
                    ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="text-center"><i className="bi bi-cloud-upload fs-3 text-muted d-block"></i><small className="text-muted" style={{ fontSize: '0.68rem' }}>Upload</small></div>}
                </div>
                <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                  {mode === 'edit' ? 'Click to change image' : 'Click to upload *'}
                </small>
              </label>
              <input type="file" id="categoryImgInput" hidden onChange={handleImage} accept="image/*" />
            </div>

            <div className="col-12">
              <label className="form-label small">Category Name *</label>
              <input className="form-control" placeholder="e.g. Rice"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="col-12 d-flex justify-content-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm px-4" disabled={submitting}>
                {submitting
                  ? <span className="spinner-border spinner-border-sm me-1" />
                  : <i className={`bi ${mode === 'add' ? 'bi-plus-circle' : 'bi-check2'} me-1`}></i>}
                {mode === 'add' ? 'Add Category' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Delete Category Confirmation Modal ── */
const DeleteCategoryModal = ({ category, foodCount, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1055, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={deleting ? undefined : onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid rgba(244,115,115,0.3)', borderRadius: 18, width: '100%', maxWidth: 440, padding: '1.75rem' }}
        onClick={e => e.stopPropagation()}>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0" style={{ color: '#f47373' }}>
            <i className="bi bi-exclamation-triangle me-2"></i>Delete Category
          </h5>
          <button className="btn-close btn-close-white" onClick={onClose} disabled={deleting} />
        </div>

        <p className="mb-2">
          Do you really want to delete <strong>"{category.name}"</strong>?
        </p>
        {foodCount > 0 ? (
          <p className="small mb-4" style={{ color: '#f47373' }}>
            <i className="bi bi-info-circle me-1"></i>
            {foodCount} food item{foodCount > 1 ? 's' : ''} {foodCount > 1 ? 'are' : 'is'} under this category — {foodCount > 1 ? 'they' : 'it'} will also be permanently deleted.
          </p>
        ) : (
          <p className="small text-muted mb-4">No foods are currently under this category.</p>
        )}

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={deleting}>
            No
          </button>
          <button type="button" className="btn btn-danger btn-sm px-4" onClick={handleConfirm} disabled={deleting}>
            {deleting
              ? <span className="spinner-border spinner-border-sm me-1" />
              : <i className="bi bi-trash me-1"></i>}
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main page ─── */
const Categories = () => {
  const [list, setList] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', ...category }
  const [deleteTarget, setDeleteTarget] = useState(null); // null | category to confirm-delete

  const load = async () => {
    try {
      const [categories, foodList] = await Promise.all([getCategoryList(), getFoodList()]);
      setList(categories);
      setFoods(foodList);
    } catch {
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const foodCount = (categoryName) =>
    foods.filter(f => f.category?.trim().toLowerCase() === categoryName.trim().toLowerCase()).length;

  const confirmDelete = async () => {
    try {
      await deleteCategory(deleteTarget.id);
      toast.success('Category and its foods were deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data;
      toast.error(msg || 'Delete failed.', msg ? { autoClose: 8000 } : undefined);
    }
  };

  return (
    <div className="py-4 px-3">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <h4 className="mb-0 fw-bold">
          <i className="bi bi-tags me-2" style={{ color: 'var(--gold)' }}></i>Food Categories
          <span className="badge bg-secondary ms-2">{list.length}</span>
        </h4>
        <button className="btn btn-primary btn-sm px-3" onClick={() => setModal({ mode: 'add' })}>
          <i className="bi bi-plus-circle me-1"></i>Add Category
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--gold)' }}></div></div>
      ) : list.length === 0 ? (
        <p className="text-muted text-center py-5">No categories found.</p>
      ) : (
        <div className="card">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: '25%', textAlign: 'center' }}>Image</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Name</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Foods</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>
                    <img src={item.imageUrl} alt={item.name} width={60} height={48} style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }} />
                  </td>
                  <td className="fw-semibold" style={{ textAlign: 'center' }}>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', fontSize: '0.75rem' }}>
                      {foodCount(item.name)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="d-flex justify-content-center gap-1">
                      <button className="btn btn-sm btn-outline-warning px-2" title="Edit" onClick={() => setModal({ mode: 'edit', ...item })}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger px-2" onClick={() => setDeleteTarget(item)} title="Delete">
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

      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal : null}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {deleteTarget && (
        <DeleteCategoryModal
          category={deleteTarget}
          foodCount={foodCount(deleteTarget.name)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default Categories;
