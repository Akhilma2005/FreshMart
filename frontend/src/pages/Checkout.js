import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext, AuthContext } from '../App';
import { FiMapPin, FiCreditCard, FiCheckCircle, FiArrowRight, FiHome, FiPhone } from 'react-icons/fi';
import API from '../api';
import './Checkout.css';

const STEPS = ['Address', 'Payment', 'Confirmation'];

const TRACKING = [
  { icon: '✅', label: 'Order Placed',       done: true  },
  { icon: '📦', label: 'Packing Your Order', done: true  },
  { icon: '🚚', label: 'Out for Delivery',   done: false },
  { icon: '🏠', label: 'Delivered',          done: false },
];

export default function Checkout() {
  const { cartItems, removeFromCart, appliedCoupon, applyCoupon, removeCoupon } = useContext(CartContext);
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal > 499 ? 0 : 49;
  
  const [couponInp, setCouponInp] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const discountPct = appliedCoupon ? appliedCoupon.discountPct : 0;
  const discount = Math.floor(subtotal * (discountPct / 100));
  const total    = subtotal + delivery - discount;

  const handleApply = () => {
    if (!couponInp.trim()) return;
    setCouponLoading(true);
    const res = applyCoupon(couponInp);
    setCouponLoading(false);
    if (!res.success) setCouponErr(res.message);
    else { setCouponErr(''); setCouponInp(''); }
  };

  const handleRemove = () => removeCoupon();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Step 1 — Address
  const [address, setAddress] = useState({
    name: auth?.user?.name || '',
    phone: '',
    line1: '',
    city: '',
    pincode: '',
  });

  // Step 2 — Payment
  const [payMode, setPayMode]   = useState('');   // 'online' | 'cod'
  const [upiApp, setUpiApp]     = useState('');   // 'gpay' | 'phonepe' | 'paytm'
  const [upiId, setUpiId]       = useState('');
  const [addrError, setAddrError] = useState('');
  const [payError, setPayError]   = useState('');

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.pincode) {
      return setAddrError('Please fill all fields.');
    }
    if (!/^\d{10}$/.test(address.phone)) return setAddrError('Enter a valid 10-digit phone number.');
    if (!/^\d{6}$/.test(address.pincode)) return setAddrError('Enter a valid 6-digit pincode.');
    setAddrError('');
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!payMode) return setPayError('Please select a payment method.');
    if (payMode === 'online' && !upiApp) return setPayError('Please select a UPI app.');
    setPayError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth?.user?.id || null,
          items: cartItems.map(i => ({ productId: i.id, name: i.name, image: i.image || '', emoji: i.emoji || '🛒', unit: i.unit || '', qty: i.qty, price: i.price })),
          subtotal, discount, delivery, total,
          address, payMode, upiApp: upiApp || null,
          coupon: appliedCoupon?.code || null,
        }),
      });
      const data = await res.json();
      const oid = data.orderId || `ORD${Date.now()}`;
      setOrderId(oid);
      cartItems.forEach(i => removeFromCart(i.id));
      removeCoupon();
      setStep(3);
    } catch {
      setPayError('Failed to place order. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="co-page">

      {/* ── Stepper ── */}
      <div className="co-stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`co-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
              <div className="co-step-circle">{step > i + 1 ? '✓' : i + 1}</div>
              <span>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`co-step-line ${step > i + 1 ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="co-body">

        {/* ══ STEP 1 — ADDRESS ══ */}
        {step === 1 && (
          <div className="co-card fade-item delay-1">
            <div className="co-card-head">
              <FiMapPin size={20} />
              <h2>Delivery Address</h2>
            </div>
            <form onSubmit={handleAddressSubmit} className="co-form">
              <div className="co-field-row">
                <div className="co-field">
                  <label>Full Name</label>
                  <input placeholder="John Doe" value={address.name}
                    onChange={e => setAddress({ ...address, name: e.target.value })} />
                </div>
                <div className="co-field">
                  <label>Phone Number</label>
                  <input placeholder="10-digit mobile" maxLength={10} value={address.phone}
                    onChange={e => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
              <div className="co-field">
                <label>Address Line</label>
                <input placeholder="House no., Street, Area" value={address.line1}
                  onChange={e => setAddress({ ...address, line1: e.target.value })} />
              </div>
              <div className="co-field-row">
                <div className="co-field">
                  <label>City</label>
                  <input placeholder="City" value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div className="co-field">
                  <label>Pincode</label>
                  <input placeholder="6-digit pincode" maxLength={6} value={address.pincode}
                    onChange={e => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
              {addrError && <p className="co-error">{addrError}</p>}
              <button type="submit" className="co-btn">
                Continue to Payment <FiArrowRight />
              </button>
            </form>
          </div>
        )}

        {/* ══ STEP 2 — PAYMENT ══ */}
        {step === 2 && (
          <div className="co-card fade-item delay-1">
            <div className="co-card-head">
              <FiCreditCard size={20} />
              <h2>Payment Method</h2>
            </div>

            <div className="co-pay-options">
              <button className={`co-pay-opt ${payMode === 'online' ? 'active' : ''}`}
                onClick={() => { setPayMode('online'); setPayError(''); }}>
                <span className="co-pay-icon">📱</span>
                <div>
                  <strong>Online Payment</strong>
                  <small>UPI / Google Pay / PhonePe / Paytm</small>
                </div>
              </button>
              <button className={`co-pay-opt ${payMode === 'cod' ? 'active' : ''}`}
                onClick={() => { setPayMode('cod'); setUpiApp(''); setPayError(''); }}>
                <span className="co-pay-icon">💵</span>
                <div>
                  <strong>Cash on Delivery</strong>
                  <small>Pay when your order arrives</small>
                </div>
              </button>
            </div>

            {/* UPI Apps */}
            {payMode === 'online' && (
              <div className="co-upi-section fade-item delay-1">
                <p className="co-upi-label">Select UPI App</p>
                <div className="co-upi-apps">
                  {[
                    { id: 'gpay',    logo: '🟢', name: 'Google Pay' },
                    { id: 'phonepe', logo: '🟣', name: 'PhonePe'    },
                    { id: 'paytm',   logo: '🔵', name: 'Paytm'      },
                  ].map(app => (
                    <button key={app.id}
                      className={`co-upi-app ${upiApp === app.id ? 'active' : ''}`}
                      onClick={() => setUpiApp(app.id)}>
                      <span className="co-upi-logo">{app.logo}</span>
                      <span>{app.name}</span>
                    </button>
                  ))}
                </div>
                {upiApp && (
                  <div className="co-upi-id fade-item delay-1">
                    <label>Enter UPI ID</label>
                    <input placeholder="yourname@upi" value={upiId}
                      onChange={e => setUpiId(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* Order summary mini */}
            <div className="co-summary">
              <div className="co-summary-row"><span>Subtotal</span><span>₹{subtotal}</span></div>
              {discountPct > 0 && (
                <div className="co-summary-row green">
                  <span>Coupon Discount ({appliedCoupon?.code}) {discountPct}%</span>
                  <span>−₹{discount}</span>
                </div>
              )}
              <div className="co-summary-row"><span>Delivery</span><span>{delivery === 0 ? 'FREE' : `₹${delivery}`}</span></div>
              <div className="co-summary-total"><span>Total</span><span>₹{total}</span></div>
            </div>

            {/* Coupon */}
            <div className="co-coupon-wrap">
              {appliedCoupon ? (
                <div className="co-coupon-applied">
                  <span>🎟️ <strong>{appliedCoupon.code}</strong> applied — saving ₹{discount}</span>
                  <button onClick={handleRemove} className="co-coupon-remove">✕ Remove</button>
                </div>
              ) : (
                <div className="co-coupon-row">
                  <input className="co-coupon-input" placeholder="Enter coupon code" value={couponInp}
                    onChange={e => { setCouponInp(e.target.value.toUpperCase()); setCouponErr(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleApply()} />
                  <button className="co-coupon-btn" onClick={handleApply} disabled={couponLoading}>
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponErr && <p className="co-error" style={{marginTop:4}}>{couponErr}</p>}
            </div>

            {payError && <p className="co-error">{payError}</p>}

            <div className="co-btn-row">
              <button className="co-btn-back" onClick={() => setStep(1)}>← Back</button>
              <button className="co-btn" onClick={handlePlaceOrder} disabled={loading}>
                {loading ? 'Placing Order…' : <>Place Order · ₹{total} <FiArrowRight /></>}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — CONFIRMATION ══ */}
        {step === 3 && (
          <div className="co-card co-confirm fade-item delay-1">
            <div className="co-confetti">🎉</div>
            <FiCheckCircle className="co-success-icon" />
            <h2>Order Placed Successfully!</h2>
            <p className="co-confirm-sub">
              Your fresh groceries are being packed and will be delivered soon.
            </p>
            <div className="co-order-id">Order ID: <strong>{orderId}</strong></div>

            {/* Delivery address recap */}
            <div className="co-addr-recap">
              <FiHome size={14} />
              <span>{address.line1}, {address.city} — {address.pincode}</span>
            </div>
            <div className="co-addr-recap">
              <FiPhone size={14} />
              <span>{address.phone}</span>
            </div>

            {/* Tracking */}
            <div className="co-tracking">
              <p className="co-tracking-title">📍 Live Order Tracking</p>
              <div className="co-track-steps">
                {TRACKING.map((t, i) => (
                  <div key={i} className={`co-track-step ${t.done ? 'done' : ''}`}>
                    <div className="co-track-dot">{t.done ? '✓' : ''}</div>
                    {i < TRACKING.length - 1 && <div className={`co-track-line ${t.done ? 'done' : ''}`} />}
                    <span>{t.icon} {t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="co-eta">
              🕐 Estimated Delivery: <strong>30–45 minutes</strong>
            </div>

            <Link to="/" className="co-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              Continue Shopping
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
