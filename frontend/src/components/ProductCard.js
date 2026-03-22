import React, { useContext } from 'react';
import { CartContext, FavoritesContext } from '../App';
import { FiStar, FiShoppingCart, FiPlus, FiMinus, FiHeart } from 'react-icons/fi';
import './ProductCard.css';

const badgeColors = {
  Premium: '#7c3aed', Organic: '#16a34a', Fresh: '#0891b2',
  Pure: '#d97706', Spicy: '#dc2626', Refined: '#6366f1',
  Natural: '#059669', 'Whole Grain': '#92400e',
};

export default function ProductCard({ product }) {
  const { cartItems, addToCart, updateQty } = useContext(CartContext);
  const { favorites, toggleFavorite } = useContext(FavoritesContext);
  const pid = product._id || product.id;
  const cartItem = cartItems.find(i => i.id === pid);
  const isFavorite = favorites.includes(pid);
  const badgeColor = badgeColors[product.badge] || '#16a34a';

  // Use vendor-set discount if available, otherwise fall back to badge-based
  const hasVendorDiscount = product.discountPrice && product.discountPrice < product.price;
  const displayPrice    = hasVendorDiscount ? product.discountPrice : product.price;
  const originalPrice   = hasVendorDiscount ? product.price : null;
  const discPct         = hasVendorDiscount
    ? (product.discountPct || Math.round(((product.price - product.discountPrice) / product.price) * 100))
    : null;

  return (
    <div className="pcard">

      {/* Image */}
      <div className="pcard-img">
        {product.image
          ? <img src={product.image} alt={product.name}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          : null}
        <span className="pcard-emoji" style={{ display: product.image ? 'none' : 'flex' }}>
          {product.emoji}
        </span>
        <div className="pcard-img-overlay" />
        <div className="pcard-badge" style={{ background: badgeColor }}>{product.badge}</div>
        {discPct > 0 && <div className="pcard-disc">{discPct}% OFF</div>}
        <button className={`pcard-wish ${isFavorite ? 'active' : ''}`} onClick={() => toggleFavorite(pid)}>
          <FiHeart size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="pcard-body">
        <p className="pcard-cat">{product.category}</p>
        <h3 className="pcard-name">{product.name}</h3>

        <div className="pcard-rating">
          {[1,2,3,4,5].map(s => (
            <FiStar key={s} className={s <= Math.round(product.rating) ? 'star filled' : 'star'} />
          ))}
          <span className="rating-val">{product.rating}</span>
          <span className="rating-count">({product.reviews})</span>
        </div>

        <div className="pcard-footer">
          <div className="pcard-price-row">
            <span className="pcard-price">₹{displayPrice}</span>
            {originalPrice && <span className="pcard-original">₹{originalPrice}</span>}
            <span className="pcard-unit">/ {product.unit}</span>
          </div>

          {cartItem ? (
            <div className="qty-ctrl">
              <button onClick={() => updateQty(pid, cartItem.qty - 1)}><FiMinus size={13} /></button>
              <span>{cartItem.qty}</span>
              <button onClick={() => updateQty(pid, cartItem.qty + 1)}><FiPlus size={13} /></button>
            </div>
          ) : (
            <button className="pcard-add-btn" onClick={() => addToCart({ ...product, id: pid })}>
              <FiShoppingCart size={14} /> Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
