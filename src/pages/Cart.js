import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext, AuthContext } from '../App';
import { FiTrash2, FiPlus, FiMinus, FiShoppingBag, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import './Cart.css';

export default function Cart() {
  const { cartItems, removeFromCart, updateQty, appliedCoupon, applyCoupon, removeCoupon } = useContext(CartContext);
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [couponInp, setCouponInp] = React.useState('');
  const [couponErr, setCouponErr] = React.useState('');

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal > 499 ? 0 : 49;
  const discountPct = appliedCoupon ? appliedCoupon.discountPct : 0;
  const discountAmount = Math.floor(subtotal * (discountPct / 100));
  const total = subtotal + delivery - discountAmount;

  const handleApply = () => {
    if (!couponInp.trim()) return;
    const res = applyCoupon(couponInp);
    if (!res.success) setCouponErr(res.message);
    else { setCouponErr(''); setCouponInp(''); }
  };

  if (cartItems.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-content">
          <span>🛒</span>
          <h2>Your cart is empty</h2>
          <p>Add some fresh groceries to get started!</p>
          <Link to="/products" className="btn-shop">Start Shopping <FiArrowRight /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="sticky-back-bar">
        <button onClick={() => navigate(-1)}><FiArrowLeft size={16} /> Back</button>
      </div>
      <div className="cart-hero">
        <h1>🛒 My Cart</h1>
        <p>{cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart</p>
      </div>

      <div className="cart-container">
        <div className="cart-items">
          <h3>Cart Items</h3>
          {cartItems.map(item => (
            <div className="cart-item" key={item.id}>
              <div className="item-emoji">
                {item.image
                  ? <img src={item.image} alt={item.name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                  : null}
                <span style={{ display: item.image ? 'none' : 'block' }}>{item.emoji}</span>
              </div>
              <div className="item-info">
                <h4>{item.name}</h4>
                <p>{item.category} · {item.unit}</p>
                <span className="item-price">₹{item.price} each</span>
              </div>
              <div className="item-qty">
                <button onClick={() => updateQty(item.id, item.qty - 1)}><FiMinus /></button>
                <span>{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)}><FiPlus /></button>
              </div>
              <div className="item-total">₹{item.price * item.qty}</div>
              <button className="remove-btn" onClick={() => removeFromCart(item.id)}><FiTrash2 /></button>
            </div>
          ))}
        </div>

        <div className="order-summary">
          <h3>Order Summary</h3>
          <div className="coupon-box">
            {appliedCoupon ? (
              <div className="applied-tag">
                <span>🎟️ <strong>{appliedCoupon.code}</strong> applied ({appliedCoupon.discountPct}%)</span>
                <button onClick={removeCoupon}>✕</button>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Enter coupon code" value={couponInp} onChange={e => { setCouponInp(e.target.value.toUpperCase()); setCouponErr(''); }} onKeyDown={e => e.key === 'Enter' && handleApply()} />
                <button onClick={handleApply}>Apply</button>
              </>
            )}
          </div>
          {couponErr && <p className="cart-coupon-err">{couponErr}</p>}
          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal ({cartItems.length} items)</span>
              <span>₹{subtotal}</span>
            </div>
            {discountPct > 0 && (
              <div className="summary-row green">
                <span>Discount ({discountPct}%)</span>
                <span>− ₹{discountAmount}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Delivery</span>
              <span>{delivery === 0 ? <span className="free">FREE</span> : `₹${delivery}`}</span>
            </div>
            {delivery > 0 && <p className="delivery-note">Add ₹{499 - subtotal} more for free delivery</p>}
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <button className="checkout-btn" onClick={() => navigate('/checkout')}>
            Place Order · ₹{total} <FiArrowRight />
          </button>
          <div className="secure-badges">
            <span>🔒 Secure Payment</span>
            <span>🚚 Fast Delivery</span>
            <span>✅ Fresh Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
}
