import React, { useState } from 'react';
import { assets } from '../../assets/assets';
import { addFood } from '../../services/foodService';
import { toast } from 'react-toastify';

const AddFood = () => {
  const [image, setImage] = useState(null);
  const [data, setData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Rice',
  });
  const [spiceInput, setSpiceInput] = useState('');
  const [spiceLevels, setSpiceLevels] = useState([]);
  const [avoidInput, setAvoidInput] = useState('');
  const [ingredientsToAvoid, setIngredientsToAvoid] = useState([]);

  const onChangeHandler = (e) => {
    setData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addTag = (input, list, setList, setInput) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList(prev => [...prev, trimmed]);
    }
    setInput('');
  };

  const removeTag = (item, list, setList) => {
    setList(list.filter(i => i !== item));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!image) {
      toast.error('Please upload an image');
      return;
    }
    try {
      const foodData = {
        ...data,
        customizationOptions: {
          spiceLevels,
          ingredientsToAvoid,
        },
      };
      await addFood(foodData, image);
      toast.success('Food added successfully.');
      setData({ name: '', description: '', category: 'Rice', price: '' });
      setImage(null);
      setSpiceLevels([]);
      setIngredientsToAvoid([]);
    } catch {
      toast.error('Error adding food');
    }
  };

  return (
    <div className="mx-2 mt-2">
      <div className="row">
        <div className="card col-md-6">
          <div className="card-body">
            <h2 className="mb-4">Add Food</h2>
            <form onSubmit={onSubmitHandler}>

              <div className="mb-3">
                <label htmlFor="image" className="form-label">
                  <img
                    src={image ? URL.createObjectURL(image) : assets.upload}
                    alt="food"
                    width={98}
                    style={{ objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                  />
                </label>
                <input type="file" className="form-control" id="image" hidden onChange={e => setImage(e.target.files[0])} />
              </div>

              <div className="mb-3">
                <label className="form-label">Name</label>
                <input type="text" className="form-control" placeholder="Chicken Biriyani" name="name" required onChange={onChangeHandler} value={data.name} />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="3" placeholder="Write content here..." name="description" required onChange={onChangeHandler} value={data.description}></textarea>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Category</label>
                  <select name="category" className="form-select" onChange={onChangeHandler} value={data.category}>
                    <option value="Rice">Rice</option>
                    <option value="Kottu">Kottu</option>
                    <option value="Salad">Salad</option>
                    <option value="Soup">Soup</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Price (Rs.)</label>
                  <input type="number" name="price" className="form-control" placeholder="1000" onChange={onChangeHandler} value={data.price} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <i className="bi bi-fire me-1 text-danger"></i>Spice Levels
                  <small className="text-muted ms-2">(optional)</small>
                </label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {spiceLevels.map(tag => (
                    <span key={tag} className="badge bg-warning text-dark d-flex align-items-center gap-1">
                      {tag}
                      <button type="button" className="btn-close btn-close-sm" style={{ fontSize: '0.55rem' }}
                        onClick={() => removeTag(tag, spiceLevels, setSpiceLevels)} />
                    </span>
                  ))}
                </div>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mild, Medium, Hot — press Enter"
                    value={spiceInput}
                    onChange={e => setSpiceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(spiceInput, spiceLevels, setSpiceLevels, setSpiceInput); } }}
                  />
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => addTag(spiceInput, spiceLevels, setSpiceLevels, setSpiceInput)}>
                    Add
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">
                  <i className="bi bi-slash-circle me-1 text-danger"></i>Ingredients to Avoid
                  <small className="text-muted ms-2">(optional)</small>
                </label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {ingredientsToAvoid.map(tag => (
                    <span key={tag} className="badge bg-danger d-flex align-items-center gap-1">
                      {tag}
                      <button type="button" className="btn-close btn-close-white btn-close-sm" style={{ fontSize: '0.55rem' }}
                        onClick={() => removeTag(tag, ingredientsToAvoid, setIngredientsToAvoid)} />
                    </span>
                  ))}
                </div>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Nuts, Dairy, Gluten — press Enter"
                    value={avoidInput}
                    onChange={e => setAvoidInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(avoidInput, ingredientsToAvoid, setIngredientsToAvoid, setAvoidInput); } }}
                  />
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => addTag(avoidInput, ingredientsToAvoid, setIngredientsToAvoid, setAvoidInput)}>
                    Add
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-plus-circle me-2"></i>Add Food
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFood;
