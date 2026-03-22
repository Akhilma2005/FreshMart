import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { FiPackage, FiChevronDown, FiChevronUp, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import API, { imgUrl } from '../api';

const imgSrc = (img) => imgUrl(img);

export default function OrderHistory() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    if (!auth?.user?.id) { setLoading(false); return; }
    fetch(`${API}/orders?userId=${auth.user.id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [auth?.user?.id]); // eslint-disable-line

  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  const statusLabel = (date) => {
    const mins = (Date.now() - new Date(date)) / 60000;
    if (mins < 45) return { label: 'Out for Delivery', color: '#E07B00' };
    return { label: 'Delivered', color: '#2d6a4f' };
  };

  return (
    <div className="oh-page">
      <div className="sticky-back-bar">
        <button onClick={() => navigate(-1)}><FiArrowLeft size={16} /> Back</button>
      </div>
      <div className="oh-hero">
        <FiPackage size={32} />
        <h1>Order History</h1>
        <p>{auth ? `All orders for ${auth.user.name?.split(' ')[0]}` : 'Sign in to view your orders'}</p>
      </div>

      <div className="oh-container">
        {!auth ? (
          <div className="oh-empty">
            <span>🔒</span>
            <h3>Please sign in</h3>
            <Link to="/login" className="oh-btn">Sign In</Link>
          </div>
        ) : loading ? (
          <div className="oh-empty"><span>⏳</span><h3>Loading orders...</h3></div>
        ) : orders.length === 0 ? (
          <div className="oh-empty">
            <span>📦</span>
            <h3>No orders yet</h3>
            <p>Your placed orders will appear here.</p>
            <Link to="/products" className="oh-btn">Start Shopping</Link>
          </div>
        ) : (
          <div className="oh-list">
            {orders.map((order) => {
              const status = statusLabel(order.createdAt || order.date);
              const isOpen = expanded === (order._id || order.orderId);
              return (
                <div className="oh-card" key={order._id || order.orderId}>
                  <div className="oh-card-header" onClick={() => toggle(order._id || order.orderId)}>
                    <div className="oh-card-left">
                      <FiShoppingBag size={18} />
                      <div>
                        <div className="oh-order-id">#{order.orderId || order._id?.slice(-8).toUpperCase()}</div>
                        <div className="oh-order-date">
                          {new Date(order.createdAt || order.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="oh-card-right">
                      <span className="oh-status" style={{ color: status.color, borderColor: status.color }}>
                        {status.label}
                      </span>
                      <span className="oh-total">₹{order.total}</span>
                      {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="oh-card-body">
                      <div className="oh-items">
                        {order.items?.map((item, i) => (
                          <div className="oh-item" key={i}>
                            <div className="oh-item-img">
                              {imgSrc(item.image)
                                ? <img
                                    src={imgSrc(item.image)}
                                    alt={item.name}
                                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                                  />
                                : null}
                              <span style={{ display: imgSrc(item.image) ? 'none' : 'block' }}>
                                {item.emoji || '🛒'}
                              </span>
                            </div>
                            <div className="oh-item-info">
                              <span className="oh-item-name">{item.name || `Item ${i + 1}`}</span>
                              <span className="oh-item-unit">{item.unit}</span>
                            </div>
                            <div className="oh-item-qty">×{item.qty}</div>
                            <div className="oh-item-price">₹{item.price * item.qty}</div>
                          </div>
                        ))}
                      </div>

                      <div className="oh-summary">
                        <div className="oh-summary-row"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                        <div className="oh-summary-row green"><span>Discount</span><span>−₹{order.discount}</span></div>
                        <div className="oh-summary-row">
                          <span>Delivery</span>
                          <span>{order.delivery === 0 ? 'FREE' : `₹${order.delivery}`}</span>
                        </div>
                        <div className="oh-summary-total"><span>Total</span><span>₹{order.total}</span></div>
                      </div>

                      <div className="oh-addr">
                        {order.address && <>📍 {order.address.line1}, {order.address.city} — {order.address.pincode} &nbsp;·&nbsp;</>}
                        {order.payMode === 'cod' ? '💵 Cash on Delivery' : order.payMode === 'online' ? '📱 Online Payment' : ''}
                        {order.coupon && <> &nbsp;·&nbsp; 🏷️ {order.coupon}</>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
