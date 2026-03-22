import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import API from './api';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Cart from './pages/Cart';
import About from './pages/About';
import Login from './pages/Login';
import Favorites from './pages/Favorites';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import VendorDashboard from './pages/VendorDashboard';
import AddProduct from './pages/AddProduct';
import ForgotPassword from './pages/ForgotPassword';
import Checkout from './pages/Checkout';
import OrderHistory from './pages/OrderHistory';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import ProductDetail from './pages/ProductDetail';
import PageTransition from './components/PageTransition';
import './index.css';

export const CartContext = React.createContext();
export const FavoritesContext = React.createContext();
export const AuthContext = React.createContext();
export const SocketContext = React.createContext();

const socket = io('http://localhost:5000', { autoConnect: true });

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token ? { token, user: JSON.parse(user) } : null;
  });

  useEffect(() => {
    const refreshSession = async () => {
      if (auth?.token) {
        try {
          const res = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            setAuth(prev => ({ ...prev, user: data.user }));
          } else if (res.status === 401) {
            logout();
          }
        } catch (e) {
          console.error("Session refresh failed", e);
        }
      }
      setAuthLoading(false);
    };
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to sync session logic

  const cartKey = auth?.user?.id ? `cart_${auth.user.id}` : null;
  const favKey  = auth?.user?.id ? `favorites_${auth.user.id}` : 'favorites_guest';

  const [cartItems, setCartItems] = useState(() => {
    if (!auth?.user?.id) return [];
    const saved = localStorage.getItem(`cart_${auth.user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState(() => {
    const key = auth?.user?.id ? `favorites_${auth.user.id}` : 'favorites_guest';
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    const saved = localStorage.getItem('applied_coupon');
    return saved ? JSON.parse(saved) : null;
  });

  // Reload cart when user changes
  useEffect(() => {
    if (cartKey) {
      const saved = localStorage.getItem(cartKey);
      setCartItems(saved ? JSON.parse(saved) : []);
    } else {
      setCartItems([]);
    }
  }, [cartKey]);

  // Persist cart & coupon
  useEffect(() => {
    if (cartKey) localStorage.setItem(cartKey, JSON.stringify(cartItems));
    if (appliedCoupon) localStorage.setItem('applied_coupon', JSON.stringify(appliedCoupon));
    else localStorage.removeItem('applied_coupon');
  }, [cartItems, cartKey, appliedCoupon]);

  const applyCoupon = (code) => {
    const c = code.toUpperCase();
    if (c === 'FRESH10') {
      setAppliedCoupon({ code: c, discountPct: 10 });
      return { success: true, message: '10% discount applied!' };
    }
    if (c === 'FRESH20') {
      setAppliedCoupon({ code: c, discountPct: 20 });
      return { success: true, message: '20% discount applied!' };
    }
    if (c === 'FRESH677') {
      setAppliedCoupon({ code: c, discountPct: 15 }); // 15% for the user's specific code
      return { success: true, message: 'Special 15% discount applied!' };
    }
    return { success: false, message: 'Invalid coupon code' };
  };

  const removeCoupon = () => setAppliedCoupon(null);

  // Reload favorites when user changes
  useEffect(() => {
    const saved = localStorage.getItem(favKey);
    setFavorites(saved ? JSON.parse(saved) : []);
  }, [favKey]);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem(favKey, JSON.stringify(favorites));
  }, [favorites, favKey]);

  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({ token, user });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(null);
    setCartItems([]);
    setFavorites([]);
  };

  const addToCart = (product) => {
    setCartItems(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCartItems(prev => prev.filter(i => i.id !== id));

  const updateQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  return (
    <AuthContext.Provider value={{ auth, authLoading, login, logout }}>
    <SocketContext.Provider value={socket}>
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, appliedCoupon, applyCoupon, removeCoupon }}>
      <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/*" element={
              <>
                <Navbar />
                <PageTransition>
                  <ScrollToTop />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/vendor" element={<VendorDashboard />} />
                    <Route path="/vendor/add-product" element={<AddProduct />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/orders" element={<OrderHistory />} />
                    <Route path="/dashboard" element={<AdminPanel />} />
                  </Routes>
                </PageTransition>
                <Footer />
              </>
            } />
          </Routes>
        </Router>
      </FavoritesContext.Provider>
    </CartContext.Provider>
    </SocketContext.Provider>
    </AuthContext.Provider>
  );
}
