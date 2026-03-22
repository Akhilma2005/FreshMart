import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext, FavoritesContext } from '../App';
import './MiniCard.css';

const badgeColors = {
  Premium: '#7c3aed', Organic: 'var(--hk-green-700)', Fresh: 'var(--hk-green-700)',
  Pure: '#d97706', Spicy: '#dc2626', Refined: '#6366f1',
  Natural: '#059669', 'Whole Grain': '#92400e',
};

export default function MiniCard({ product }) {
  const { cartItems, addToCart, updateQty } = useContext(CartContext);
  const { favorites, toggleFavorite } = useContext(FavoritesContext);
  const navigate = useNavigate();
  const pid = String(product.id || product._id);
  const cartItem = cartItems.find(i => i.id === pid);
  const isFav = favorites.includes(pid);
  const badgeColor = badgeColors[product.badge] || 'var(--hk-amber)';

  const hasVendorDiscount = product.discountPrice && product.discountPrice < product.price;
  const displayPrice  = hasVendorDiscount ? product.discountPrice : product.price;
  const originalPrice = hasVendorDiscount ? product.price : null;

  return (
    <div className="prod-card" onClick={() => navigate(`/product/${pid}`)}>
      {product.badge && (
        <div 
          className={`prod-badge ${product.badge === 'Fresh' || product.badge === 'Organic' ? 'fresh' : product.badge.includes('%') ? '' : 'new'}`} 
          style={{background: product.badge.includes('%') ? 'var(--hk-red)' : badgeColor}}
        >
          {product.badge}
        </div>
      )}
      
      <div className={`prod-wishlist ${isFav ? 'active' : ''}`} onClick={e => { e.stopPropagation(); toggleFavorite(pid); }}>
        {isFav ? '❤️' : '🤍'}
      </div>
      
      <div className="prod-img-box">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            onError={e => { e.target.style.display = 'none'; e.target.parentNode.querySelector('span').style.display = 'flex'; }} 
          />
        ) : null}
        <span style={{ display: product.image ? 'none' : 'flex' }}>{product.emoji || '🛒'}</span>
      </div>
      
      <div className="prod-body">
        <div className="prod-cat">{product.category || 'CATEGORY'}</div>
        <div className="prod-name">{product.name}</div>
        <div className="prod-rating">
          <span className="star">★</span>
          <span className="rating-val">{product.averageRating?.toFixed(1) || '0.0'}</span>
          <span className="rating-count">({product.totalReviews || 0})</span>
        </div>
        <div className="prod-weight">{product.unit || '1 unit'}</div>
        
        <div className="prod-footer">
          <div className="prod-price">
            ₹{displayPrice} {originalPrice && <span className="mrp">₹{originalPrice}</span>}
          </div>
          
          {cartItem ? (
            <div className="prod-qty" onClick={e => e.stopPropagation()}>
              <button onClick={() => updateQty(pid, cartItem.qty - 1)}>−</button>
              <span>{cartItem.qty}</span>
              <button onClick={() => updateQty(pid, cartItem.qty + 1)}>+</button>
            </div>
          ) : (
            <button className="add-btn" onClick={e => { e.stopPropagation(); addToCart({ ...product, id: pid }); }}>+</button>
          )}
        </div>
      </div>
    </div>
  );
}
