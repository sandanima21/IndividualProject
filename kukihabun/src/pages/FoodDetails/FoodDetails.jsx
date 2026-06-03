import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { fetchFoodDetails } from '../../service/foodservice';
import { getReviewsByFood } from '../../service/reviewservice';
import { StoreContext } from '../../context/StoreContext';

const StarRating = ({ value }) => (
  <span>
    {[1, 2, 3, 4, 5].map(n => (
      <i key={n} className={`bi ${n <= value ? 'bi-star-fill text-warning' : 'bi-star text-muted'}`} />
    ))}
  </span>
);

const FoodDetails = () => {
  const { id } = useParams();
  const { increaseQty, decreaseQty, quantities, customizations, setSpice, toggleAvoid, setCustomization } = useContext(StoreContext);
  const myCustom = customizations[id] || {};
  const [data, setData] = useState({});
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [food, rev] = await Promise.all([fetchFoodDetails(id), getReviewsByFood(id)]);
        setData(food);
        setReviews(rev);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [id]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <section className="py-5">
      <div className="container px-4 px-lg-5 my-5">
        <div className="row gx-4 gx-lg-5 align-items-center">
          <div className="col-md-6">
            <img className="card-img-top mb-5 mb-md-0 rounded" src={data.imageUrl} alt={data.name} />
          </div>
          <div className="col-md-6">
            <div className="small mb-1">
              Category: <span className="badge text-bg-warning">{data.category}</span>
            </div>
            <h1 className="display-5 fw-bolder">{data.name}</h1>
            {avgRating && (
              <div className="d-flex align-items-center gap-2 mb-2">
                <StarRating value={Math.round(avgRating)} />
                <span className="fw-semibold">{avgRating}</span>
                <span className="text-muted small">({reviews.length} reviews)</span>
              </div>
            )}
            <div className="fs-5 mb-4">
              <span className="fw-bold">Rs. {data.price}</span>
            </div>
            <p className="lead">{data.description}</p>

            {/* Customization selectors */}
            {(data.customizationOptions?.spiceLevels?.length > 0 ||
              data.customizationOptions?.ingredientsToAvoid?.length > 0 ||
              data.customizationOptions?.customizables?.length > 0) && (
              <div className="mb-4 p-3 rounded" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                <div className="small fw-semibold mb-3" style={{ color: 'var(--gold)' }}>
                  <i className="bi bi-sliders2 me-1"></i>Customise Your Order
                </div>

                {/* Spice level */}
                {data.customizationOptions?.spiceLevels?.length > 0 && (
                  <div className="mb-3">
                    <div className="small fw-semibold mb-2">🌶 Spice Level</div>
                    <div className="d-flex flex-wrap gap-2">
                      {data.customizationOptions.spiceLevels.map(level => (
                        <button
                          key={level}
                          className={`btn btn-sm ${myCustom.spiceLevel === level ? 'btn-warning' : 'btn-outline-secondary'}`}
                          onClick={() => setSpice(id, myCustom.spiceLevel === level ? null : level)}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingredients to avoid */}
                {data.customizationOptions?.ingredientsToAvoid?.length > 0 && (
                  <div className="mb-3">
                    <div className="small fw-semibold mb-2">🚫 Remove Ingredients</div>
                    <div className="d-flex flex-wrap gap-2">
                      {data.customizationOptions.ingredientsToAvoid.map(ing => {
                        const selected = (myCustom.ingredientsToAvoid || []).includes(ing);
                        return (
                          <button
                            key={ing}
                            className={`btn btn-sm ${selected ? 'btn-danger' : 'btn-outline-secondary'}`}
                            onClick={() => toggleAvoid(id, ing)}
                          >
                            {selected && <i className="bi bi-x-circle me-1"></i>}
                            {ing}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Other customizables */}
                {data.customizationOptions?.customizables?.map(c => (
                  <div key={c.thing} className="mb-3">
                    <div className="small fw-semibold mb-2">{c.thing}</div>
                    <div className="d-flex flex-wrap gap-2">
                      {c.options.map(opt => (
                        <button
                          key={opt}
                          className={`btn btn-sm ${myCustom[c.thing] === opt ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setCustomization(id, c.thing, myCustom[c.thing] === opt ? null : opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {(myCustom.spiceLevel || myCustom.ingredientsToAvoid?.length > 0) && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                    <small style={{ color: 'rgba(200,196,188,0.6)' }}>
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Customisation saved — it will be applied when you add to cart or go to checkout.
                    </small>
                  </div>
                )}
              </div>
            )}

            <div className="d-flex align-items-center gap-3 mt-3">
              {quantities[id] > 0 ? (
                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-outline-danger btn-sm" onClick={() => decreaseQty(id)}>-</button>
                  <span className="fw-bold fs-5">{quantities[id]}</span>
                  <button className="btn btn-outline-success btn-sm" onClick={() => increaseQty(id)}>+</button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => increaseQty(id)}>
                  <i className="bi bi-cart-plus me-2"></i>Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="mb-4">
            Customer Reviews
            {reviews.length > 0 && <span className="text-muted fs-6 ms-2">({reviews.length})</span>}
          </h4>
          {reviews.length === 0 ? (
            <div className="py-4 text-center">
              <i className="bi bi-chat-square-text fs-2 text-muted d-block mb-2"></i>
              <p className="text-muted">No reviews yet. Order this dish and be the first to review!</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3" style={{ maxWidth: 680 }}>
              {reviews.map(review => (
                <div key={review.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.1rem 1.25rem' }}>
                  {/* Header row */}
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {review.userPicture
                      ? <img src={review.userPicture} alt={review.userName} width={42} height={42}
                          className="rounded-circle flex-shrink-0" referrerPolicy="no-referrer"
                          onError={e => { e.target.style.display = 'none'; }} style={{ border: '2px solid var(--border)', objectFit: 'cover' }} />
                      : <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{review.userName?.charAt(0)?.toUpperCase()}</span>
                        </div>
                    }
                    <div className="flex-fill">
                      <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{review.userName}</div>
                      <div className="d-flex align-items-center gap-2">
                        <StarRating value={review.rating} />
                        <span className="text-muted small">{new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <span style={{ background: review.rating >= 4 ? 'rgba(62,207,142,0.1)' : review.rating >= 3 ? 'rgba(255,193,7,0.1)' : 'rgba(244,115,115,0.1)', color: review.rating >= 4 ? '#3ecf8e' : review.rating >= 3 ? '#ffc107' : '#f47373', fontWeight: 700, fontSize: '0.8rem', borderRadius: 8, padding: '3px 10px', flexShrink: 0 }}>
                      {review.rating}.0
                    </span>
                  </div>
                  {/* Comment */}
                  {review.comment && (
                    <p className="mb-0" style={{ color: 'rgba(240,236,224,0.75)', fontSize: '0.88rem', lineHeight: 1.7, paddingLeft: '54px' }}>
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FoodDetails;
