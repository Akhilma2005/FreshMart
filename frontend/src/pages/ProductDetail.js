import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CartContext, FavoritesContext, AuthContext } from '../App';
import MiniCard from '../components/MiniCard';
import API from '../api';
import { FaFacebookF, FaWhatsapp } from 'react-icons/fa';
import { FiLink } from 'react-icons/fi';
import './ProductDetail.css';

const WEIGHT_OPTIONS = [
  { label: '250g', multiplier: 0.25 },
  { label: '500g', multiplier: 0.5 },
  { label: '750g', multiplier: 0.75 },
  { label: '1 kg', multiplier: 1 },
  { label: '2 kg', multiplier: 2 },
];

const isWeightUnit = (unit = '') => {
  const u = unit.toLowerCase().replace(/\s/g, '');
  return u.includes('kg') || u.includes('gram') || u.includes('gm') || u === 'g';
};

const badgeColors = { Premium: '#7c3aed', Organic: '#16a34a', Fresh: '#0891b2', Pure: '#d97706', Spicy: '#dc2626', Refined: '#6366f1', Natural: '#059669', 'Whole Grain': '#92400e' };


export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { cartItems, addToCart, updateQty } = useContext(CartContext);
  const { favorites, toggleFavorite } = useContext(FavoritesContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [activeThumb, setActiveThumb] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('desc');
  const [address, setAddress] = useState('');
  const [addressResult, setAddressResult] = useState('');
  const [helpfulClicked, setHelpfulClicked] = useState({});
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // NEW REVIEW STATE
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.message) {
          if (data.image?.startsWith('/uploads/')) data.image = `${(process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '')}${data.image}`;
          setProduct(data);
          if (isWeightUnit(data.unit)) {
            const u = data.unit?.toLowerCase().replace(/\s/g, '');
            const def = WEIGHT_OPTIONS.find(w => w.label.replace(/\s/g, '').toLowerCase() === u) || WEIGHT_OPTIONS[3];
            setSelectedWeight(def);
          }
        }
        setLoading(false);
      })
      .catch(err => setLoading(false));

    fetch(`${API}/products`).then(r => r.json()).then(d => {
      if (d.length > 0) setRelated(d.filter(p => String(p._id || p.id) !== id).slice(0, 5));
    }).catch(e => { });

    // Fetch real reviews
    setReviewsLoading(true);
    fetch(`${API}/reviews/product/${id}`)
      .then(r => r.json())
      .then(d => { if(Array.isArray(d)) setReviews(d); })
      .finally(() => setReviewsLoading(false));

  }, [id, API]);

  if (loading) return <div className="pd-loading"><div className="pd-spinner" /><p>Loading product...</p></div>;
  if (!product) return <div className="pd-not-found"><span>😕</span><h2>Product not found</h2><Link to="/products" className="btn-continue solid">← Back to Store</Link></div>;

  const pid = String(product._id || product.id);
  const isFav = favorites.includes(pid);
  const hasWeight = isWeightUnit(product.unit);
  const inStock = product.stock > 0;

  const basePrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
  const baseOriginal = product.discountPrice && product.discountPrice < product.price ? product.price : null;
  const discPct = baseOriginal ? (product.discountPct || Math.round(((product.price - product.discountPrice) / product.price) * 100)) : null;

  const unitPrice = hasWeight && selectedWeight ? Math.round(basePrice * selectedWeight.multiplier) : basePrice;
  const unitOriginal = hasWeight && selectedWeight && baseOriginal ? Math.round(baseOriginal * selectedWeight.multiplier) : baseOriginal;

  const variants = hasWeight
    ? WEIGHT_OPTIONS.map((w, i) => ({ label: w.label, price: Math.round(basePrice * w.multiplier), best: i === 3 }))
    : [{ label: product.unit || '1 unit', price: basePrice, best: true }];

  const handleAddToCart = () => {
    const cartItem = cartItems.find(i => i.id === pid);
    const item = { ...product, id: pid, price: unitPrice, unit: hasWeight && selectedWeight ? selectedWeight.label : product.unit };
    if (cartItem) updateQty(pid, cartItem.qty + qty);
    else for (let i = 0; i < qty; i++) addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const checkAddress = () => {
    if (address.trim().length > 5) setAddressResult('✓ Address confirmed for delivery!');
    else setAddressResult('⚠️ Please enter a complete address');
  };

  const thumbEmojis = [product.emoji];
  const ratingNum = product.averageRating || 0;
  const rFull = Math.floor(ratingNum);
  const rHalf = ratingNum % 1 >= 0.5;

  const stats = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };
  const totalRevs = reviews.length || 0;
  const getPct = (count) => totalRevs === 0 ? 0 : Math.round((count / totalRevs) * 100);

  return (
    <>
      <div className="breadcrumb-bar animate a1">
        <Link to="/">Home</Link>
        <span className="sep">›</span>
        <Link to={`/products?cat=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        <span className="sep">›</span>
        <span className="current">{product.name}</span>
      </div>

      <div className="product-main">
        {/* GALLERY */}
        <div className="gallery animate a2">
          <div className="gallery-main">
            {product.image && activeThumb === 0 ? <img src={product.image} alt={product.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} /> : <span id="mainEmoji">{thumbEmojis[activeThumb] || product.emoji}</span>}
            {product.badge && <div className={`gallery-badge ${product.badge === 'Fresh' || product.badge === 'Organic' ? 'fresh' : ''}`}>{product.badge}</div>}
            <div className="zoom-hint">🔍 Zoom</div>
          </div>
          {thumbEmojis.length > 1 && (
            <div className="gallery-thumbs">
              {thumbEmojis.map((e, i) => (
                <div key={i} className={`thumb ${activeThumb === i ? 'active' : ''}`} onClick={() => setActiveThumb(i)}>
                  {i === 0 && product.image ? <img src={product.image} alt="" /> : e}
                </div>
              ))}
            </div>
          )}
          <div className="share-row">
            <span className="share-lbl">Share:</span>
            <button className="share-btn fb" title="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}>
              <FaFacebookF size={14} />
            </button>
            <button className="share-btn wa" title="Share on WhatsApp" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this fresh ' + product.name + ' on FreshMart! ' + window.location.href)}`, '_blank')}>
              <FaWhatsapp size={16} />
            </button>
            <button className="share-btn link" title="Copy Link" onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}>
              <FiLink size={14} />
            </button>
          </div>
        </div>

        {/* INFO */}
        <div className="prod-info animate a3">
          <div className="prod-meta">
            <span className="prod-cat-tag">{product.category}</span>
            <span className={inStock ? "in-stock" : "in-stock out-stock"}>{inStock ? "In Stock" : "Out of Stock"}</span>
          </div>
          <h1 className="prod-title">{product.name}</h1>

          <div className="rating-row">
            <div className="stars">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="star">
                  {i < rFull ? '★' : (i === rFull && rHalf ? '½' : '☆')}
                </span>
              ))}
            </div>
            <span className="rating-num">{ratingNum.toFixed(1)}</span>
            <span className="rating-count">({totalRevs.toLocaleString()} ratings)</span>
            <span className="verified">✓ Verified Purchases</span>
          </div>

          <div className="price-block">
            <div className="price-main">
              <span className="price-now">₹{unitPrice}</span>
              {unitOriginal && <span className="price-mrp">₹{unitOriginal}</span>}
              {discPct > 0 && <span className="price-off">{discPct}% off</span>}
            </div>
            <p className="price-note">Inclusive of all taxes · <strong>FREE delivery</strong> above ₹499</p>
          </div>

          <div className="section-label">📦 Pack Size</div>
          <div className="variant-grid">
            {variants.map((v, i) => (
              <button key={i} className={`variant-btn ${hasWeight ? (selectedWeight?.label === v.label ? 'active' : '') : 'active'} ${v.best ? 'best' : ''}`} onClick={() => { if (hasWeight) setSelectedWeight(WEIGHT_OPTIONS.find(w => w.label === v.label)); }}>
                {v.label}<br /><small style={{ fontWeight: 700 }}>₹{v.price}</small>
              </button>
            ))}
          </div>

          <div className="section-label">🔢 Quantity</div>
          <div className="qty-row">
            <div className="qty-control">
              <button className="qty-dec" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
              <span className="qty-val">{qty}</span>
              <button className="qty-inc" onClick={() => setQty(q => Math.min(product.stock || 99, q + 1))} disabled={qty >= (product.stock || 99)}>+</button>
            </div>
            <span className="qty-note">Max {product.stock || 10} per order</span>
          </div>

          <div className="cta-row">
            <button className={`btn-cart ${added ? 'added' : ''}`} onClick={handleAddToCart} disabled={!inStock}>
              {added ? '✓ Added to Cart!' : '🛒 Add to Cart'}
            </button>
            <button className="btn-buy" onClick={() => { handleAddToCart(); navigate('/cart'); }} disabled={!inStock}>⚡ Buy Now</button>
          </div>
          <button className={`btn-wishlist ${isFav ? 'wishlisted' : ''}`} onClick={() => toggleFavorite(pid)}>
            {isFav ? '❤️ Saved to Wishlist' : '🤍 Add to Wishlist'}
          </button>

          <div className="side-card" style={{ marginTop: 24 }}>
            <h4>🏪 Sold By</h4>
            <p className="sold-by">Fulfilled &amp; shipped by</p>
            {product.seller?.avatar && (
              <img
                src={product.seller.avatar}
                alt={product.seller.shopName}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginBottom: 6 }}
              />
            )}
            <p className="seller-name">{product.seller?.shopName || 'HarvestKart Fresh Co.'}</p>
            <div className="seller-rating">
              {(product.seller?.isVerified ?? true) && (
                <span className="seller-badge">Verified Seller</span>
              )}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              📦 {product.seller?.deliveryInfo || 'Ships same day if ordered before 4 PM'}<br />
              🔁 {product.seller?.returnPolicy || 'Easy 24-hr return policy'}<br />
              💬 Support: 1800-xxx-xxxx
            </div>
          </div>

        </div >

        {/* SIDEBAR */}
        <div className="sticky-side animate a4">
          <div className="side-card">
            <div className="delivery-card" style={{ margin: 0, padding: 0, background: 'none', border: 'none', boxShadow: 'none' }}>
              <div className="delivery-row"><div className="delivery-icon">🚚</div><div className="delivery-text"><div className="d-title">Free Delivery</div><div className="d-sub">On orders above ₹499. <span className="d-highlight">Estimated: within 2 hours</span></div></div></div>
              <div className="delivery-row"><div className="delivery-icon">⚡</div><div className="delivery-text"><div className="d-title">Express Delivery</div><div className="d-sub"><span className="d-highlight">30-minute delivery</span> available · ₹29 extra</div></div></div>
              <div className="delivery-row"><div className="delivery-icon">🔄</div><div className="delivery-text"><div className="d-title">Easy Returns</div><div className="d-sub">Not satisfied? <span className="d-highlight">Full refund within 24 hrs</span> of delivery</div></div></div>
              <div className="delivery-row"><div className="delivery-icon">💳</div><div className="delivery-text"><div className="d-title">Secure Payment</div><div className="d-sub">UPI, Cards, Netbanking, COD all accepted</div></div></div>
            </div>
            <div className="trust-row" style={{ marginTop: 20 }}>
              {[['🌿', '100% Natural'], ['✅', 'FSSAI Certified'], ['🧊', 'Cold-Chain'], ['🏡', 'Farm Direct']].map(([i, l]) => (
                <div className="trust-badge" key={l}><div className="t-icon">{i}</div><div className="t-label">{l}</div></div>
              ))}
            </div>
          </div>


          <div className="side-card">
            <h4>🏷 Available Offers</h4>
            <ul className="side-offers-list">
              <li>10% off with code <strong>FRESH10</strong></li>
              <li>20% off with code <strong>FRESH20</strong></li>
              <li>Special 15% off with <strong>FRESH677</strong></li>
              <li>Flat ₹50 off on ₹599+ with GPay</li>
              <li>Buy 2 get 1 free on select produce</li>
            </ul>
          </div>

        </div>

      </div >

    {/* TABS */ }
    < div className = "tabs-section" >
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'desc' ? 'active' : ''}`} onClick={() => setActiveTab('desc')}>📋 Description</button>
        <button className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>🥗 Nutrition Info</button>
        <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>⭐ Reviews & Ratings</button>
        <button className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>🚚 Delivery & Returns</button>
      </div>

  {
    activeTab === 'desc' && (
      <div className="tab-content active">
        <div className="desc-grid">
          <div>
            <p className="desc-text">{product.description || `Fresh ${product.name} sourced directly from trusted local farms. Perfect for your daily nutritional needs.`}</p>
            <ul className="desc-highlights">
              <li>Farm-fresh, sourced directly from trusted farms</li>
              <li>Packed same day as harvest for maximum freshness</li>
              <li>FSSAI certified — safe for the whole family</li>
              <li>Cold-chain delivery to maintain quality</li>
            </ul>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 14 }}>📊 Product Specifications</div>
            <table className="spec-table">
              <tbody>
                <tr><td>Category</td><td>{product.category}</td></tr>
                <tr><td>Stock</td><td>{product.stock} units</td></tr>
                <tr><td>Rating</td><td>{ratingNum}/5</td></tr>
                <tr><td>Unit type</td><td>{product.unit}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  {
    activeTab === 'nutrition' && (
      <div className="tab-content active">
        <div className="nutrition-wrap">
          <div>
            <div className="nutrition-panel">
              <div className="nutrition-header">
                <h3>Nutrition Facts</h3><p>Per 100g serving</p>
              </div>
              <div className="nutrition-body">
                {[{ n: 'Calories', v: '45 kcal', b: 22 }, { n: 'Carbs', v: '10g', b: 45 }, { n: 'Protein', v: '1g', b: 10 }, { n: 'Vitamin C', v: '15mg', b: 30 }].map((x, i) => (
                  <div className={`nutr-row ${i === 0 ? 'bold' : ''}`} key={x.n}>
                    <span style={{ fontWeight: 500 }}>{x.n}</span>
                    <div className="bar-wrap"><div className="bar" style={{ width: x.b + '%' }}></div></div>
                    <span className="dv">{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="nutrition-info">
            <h4>Health Benefits</h4>
            <p>Rich in essential nutrients and vitamins.</p>
            <div className="benefit-grid">
              <div className="benefit-item"><div className="b-icon">❤️</div><div><h5>Heart Health</h5><p>Supports cardiovascular system</p></div></div>
              <div className="benefit-item"><div className="b-icon">🛡</div><div><h5>Immunity</h5><p>Boosts immune response</p></div></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  {
    activeTab === 'reviews' && (
      <div className="tab-content active">
        <div className="reviews-layout">
          {totalRevs > 0 && (
            <div className="rating-summary">
              <div className="rating-summary-left">
                <div className="big-rating">{ratingNum.toFixed(1)}</div>
                <div className="stars">
                  {'★'.repeat(rFull)}{rHalf ? '½' : ''}{'☆'.repeat(5 - rFull - (rHalf ? 1 : 0))}
                </div>
                <div className="total-reviews">{totalRevs.toLocaleString()} ratings</div>
              </div>
              <div className="rating-bars">
                {[5, 4, 3, 2, 1].map(s => {
                  const pct = getPct(stats[s]);
                  return (
                    <div className="rating-bar-row" key={s}>
                      <span className="label">{s} star</span>
                      <div className="rating-bar-outer">
                        <div className="rating-bar-inner" style={{ width: pct + '%' }}></div>
                      </div>
                      <span className="pct">{pct}%</span>
                      <span className="count">({stats[s]})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="write-review-section" style={{ marginTop: product.totalReviews > 0 ? 0 : 0 }}>
            {!auth ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', borderRadius: 16, background: '#f8fdf9', border: '1.5px dashed #b7e4c7' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✍️</div>
                <h4 style={{ fontSize: 15, color: 'var(--hk-green-900)', marginBottom: 8 }}>Want to write a review?</h4>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Please sign in to share your experience</p>
                <button className="btn-buy" style={{ padding: '10px 28px', borderRadius: 10, fontWeight: 600 }} onClick={() => navigate('/login')}>
                  Sign In to Review
                </button>
              </div>
            ) : !reviewSubmitted ? (
                <>
                  <h4 style={{ fontSize: 16, marginBottom: 8, color: 'var(--hk-green-900)' }}>Write a Review</h4>
                  <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Share your thoughts with other customers</p>
                  
                  <div className="user-rating-select" style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Overall Rating</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          type="button"
                          onClick={() => setUserRating(star)}
                          style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: star <= userRating ? 'var(--amber)' : '#ddd', transition: 'transform 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="user-comment-input" style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Review Details</label>
                    <textarea 
                      placeholder="What did you like or dislike? How was the freshness?"
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      style={{ width: '100%', padding: 14, borderRadius: 12, border: '1.5px solid #e8f0eb', minHeight: 120, fontFamily: 'inherit', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--hk-green-600)'}
                      onBlur={(e) => e.target.style.borderColor = '#e8f0eb'}
                    />
                  </div>
                  
                  <button 
                    className="btn-buy" 
                    style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 600 }}
                    onClick={async () => {
                      if (!auth) return navigate('/login');
                      if(!userComment.trim()) return alert('Please enter a comment');
                      const reviewData = {
                        productId: pid,
                        rating: userRating,
                        comment: userComment,
                        userName: auth?.user?.name || "Guest User",
                        userAvatar: auth?.user?.avatar || null,
                        userId: auth?.user?.id || null
                      };
                      try {
                        const res = await fetch(`${API}/reviews`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(reviewData)
                        });
                        if (res.ok) {
                          setReviewSubmitted(true);
                          const newRev = await res.json();
                          setReviews(prev => [newRev, ...prev]);
                        }
                      } catch (e) { alert('Failed to submit review'); }
                    }}
                  >
                    🚀 Submit Review
                  </button>
                </>
              ) : (
                <div className="review-success" style={{ textAlign: 'center', padding: '32px 16px', borderRadius: 16, background: 'var(--green-50)' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🌟</div>
                  <h4 style={{ color: 'var(--hk-green-800)', fontSize: 18, marginBottom: 8 }}>Thank you!</h4>
                  <p style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>Your review was successfully submitted and is under moderation.</p>
                </div>
              )}
            </div>
            {reviewsLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="no-reviews">
                <span className="nr-icon">💬</span>
                <h4>No reviews yet</h4>
                <p>Be the first to share your experience with this product!</p>
              </div>
            ) : (
              reviews.map((r, i) => (
                <div className="review-card" key={r._id || i} style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid #f0f0f0' }}>
                  <div className="review-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div className="review-author" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {r.userAvatar ? (
                        <img src={`${(process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '')}${r.userAvatar}`} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                      ) : null}
                      <div className="review-avatar" style={{ width: 40, height: 40, background: 'var(--green-100)', color: 'var(--green-800)', borderRadius: '50%', display: r.userAvatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>{r.userName?.charAt(0) || 'U'}</div>
                      <div>
                        <div className="review-name" style={{ fontWeight: 600, fontSize: 14 }}>{r.userName}</div>
                        <div className="review-meta" style={{ fontSize: 12, color: '#888' }}>Verified Purchase · {new Date(r.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="review-stars" style={{ color: 'var(--amber)', fontSize: 14, marginBottom: 8 }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                  <p className="review-text" style={{ fontSize: 14, color: '#444', lineHeight: 1.5, margin: 0 }}>{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  {
    activeTab === 'delivery' && (
      <div className="tab-content active">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 16, fontSize: 15 }}>🚚 Delivery Information</div>
            <div className="delivery-card">
              <div className="delivery-row"><div className="delivery-icon">📍</div><div className="delivery-text"><div className="d-title">Delivery Areas</div><div className="d-sub">Currently delivering across Madurai, Chennai, Coimbatore, Trichy, Salem and 50+ cities in Tamil Nadu.</div></div></div>
              <div className="delivery-row"><div className="delivery-icon">⏱</div><div className="delivery-text"><div className="d-title">Delivery Times</div><div className="d-sub"><span className="d-highlight">Standard:</span> Same day if ordered before 4 PM<br /><span className="d-highlight">Express:</span> 30 minutes, 6 AM–10 PM daily</div></div></div>
              <div className="delivery-row"><div className="delivery-icon">💵</div><div className="delivery-text"><div className="d-title">Delivery Charges</div><div className="d-sub">FREE above ₹499 · ₹29 standard · ₹49 express</div></div></div>
            </div>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 16, fontSize: 15 }}>🔄 Returns & Refunds</div>
            <div className="delivery-card">
              <div className="delivery-row"><div className="delivery-icon">✅</div><div className="delivery-text"><div className="d-title">Freshness Guarantee</div><div className="d-sub">100% satisfaction guaranteed. If your product isn't fresh, report within <span className="d-highlight">24 hours</span> of delivery.</div></div></div>
              <div className="delivery-row"><div className="delivery-icon">📸</div><div className="delivery-text"><div className="d-title">How to Return</div><div className="d-sub">Take a photo of the product and raise a return request in the app or call our helpline.</div></div></div>
              <div className="delivery-row"><div className="delivery-icon">💰</div><div className="delivery-text"><div className="d-title">Refund Process</div><div className="d-sub">Full refund to original payment method within <span className="d-highlight">24–48 hours</span> of approval.</div></div></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
      </div >

    {/* RELATED */ }
  {
    related.length > 0 && (
      <div className="related-section">
        <div className="section-header">
          <h2 className="section-title">You Might Also <span>Like</span></h2>
          <Link to="/products" className="see-all">Back to Store →</Link>
        </div>
        <div className="related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {related.map(rp => <MiniCard key={rp._id || rp.id} product={rp} />)}
        </div>
      </div>
    )
  }

  {/* CONTINUE */ }
  <div className="continue-bar">
    <div className="continue-inner">
      <div className="continue-text">
        <h3>Continue Exploring Fresh Picks 🌿</h3>
        <p>Hundreds of fresh fruits, vegetables, meats and more waiting for you</p>
      </div>
      <div className="continue-btns">
        <Link to="/about" className="btn-continue">Our Story</Link>
        <Link to="/products" className="btn-continue solid">🛍 Continue Shopping</Link>
      </div>
    </div>
  </div>
    </>
  );
}
