import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiLogIn, FiShoppingCart, FiShoppingBag } from 'react-icons/fi';
import { AuthContext } from '../App';
import API from '../api';
import './Login.css';

const GOOGLE_CLIENT_ID = '633026567214-7r9ht0b8lilnsf61j2lefn7484o4d1vh.apps.googleusercontent.com';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [tempToken, setTempToken]           = useState('');
  const [selectedRole, setSelectedRole]     = useState('buyer');
  const [roleLoading, setRoleLoading]       = useState(false);

  const { login }    = useContext(AuthContext);
  const navigate     = useNavigate();
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    try {
      const res  = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      if (data.needsRole) {
        setTempToken(data.tempToken);
        setShowRoleSelect(true);
      } else {
        login(data.token, data.user);
        navigate('/');
      }
    } catch {
      setError('Google sign-in failed. Make sure backend is running.');
    }
  }, [login, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        ux_mode: 'popup',
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'center',
      });
    };

    if (window.google) {
      initGoogle();
    } else {
      let script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', initGoogle);
      return () => script.removeEventListener('load', initGoogle);
    }
  }, [handleGoogleResponse]);

  const handleSetRole = async () => {
    setRoleLoading(true);
    try {
      const res  = await fetch(`${API}/auth/set-role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempToken}` },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      login(data.token, data.user);
      navigate('/');
    } catch {
      setError('Failed to set role. Try again.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      login(data.token, data.user);
      navigate('/');
    } catch {
      setError('Server error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const LeftPanel = () => (
    <div className="login-left">
      <Link to="/" className="ll-logo">
        <div className="ll-logo-icon">🌿</div>
        FreshMart
      </Link>
      <h1 className="ll-title">
        Welcome<br /><em>Back!</em>
      </h1>
      <p className="ll-sub">
        Sign in to access your orders, favourites, and exclusive member deals — all in one place.
      </p>
      <div className="ll-perks">
        {[
          ['🚚', 'Free delivery on orders above ₹499'],
          ['🌿', '100% fresh, farm-sourced produce'],
          ['⚡', 'Delivered to your door in 30 minutes'],
          ['💚', '24-hour freshness guarantee'],
        ].map(([icon, text]) => (
          <div className="ll-perk" key={text}>
            <div className="ll-perk-icon">{icon}</div>
            <span className="ll-perk-text">{text}</span>
          </div>
        ))}
      </div>
      <div className="ll-emojis">
        {['🍎','🥦','🥩','🌶','🥛','🫙','🥜','🍋','🧅'].map((e, i) => <span key={i}>{e}</span>)}
      </div>
    </div>
  );

  if (showRoleSelect) {
    return (
      <div className="login-page">
        <LeftPanel />
        <div className="login-right">
          <div className="login-container">
            <div className="login-header">
              <h2>Almost there!</h2>
              <p>How would you like to use FreshMart?</p>
            </div>
            <div className="role-selector">
              <button type="button" className={`role-btn ${selectedRole === 'buyer' ? 'active' : ''}`} onClick={() => setSelectedRole('buyer')}>
                <FiShoppingCart /> Shop as Customer
              </button>
              <button type="button" className={`role-btn ${selectedRole === 'vendor' ? 'active' : ''}`} onClick={() => setSelectedRole('vendor')}>
                <FiShoppingBag /> Become a Vendor
              </button>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="login-btn" onClick={handleSetRole} disabled={roleLoading}>
              {roleLoading ? 'Setting up...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <LeftPanel />
      <div className="login-right">
        <div className="login-container">
          <div className="login-header">
            <div className="login-header-badge">✦ Members get free delivery</div>
            <h2>Welcome Back<em>.</em></h2>
            <p>Sign in to your FreshMart account</p>
            <div className="login-trust-row">
              <span>🔒 Secure login</span>
              <span>·</span>
              <span>🌿 50K+ members</span>
              <span>·</span>
              <span>⚡ 30-min delivery</span>
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group fade-item delay-1">
              <FiUser />
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="input-group fade-item delay-2">
              <FiLock />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="login-options fade-item delay-3">
              <label><input type="checkbox" /> Remember me</label>
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="login-btn fade-item delay-4" disabled={loading}>
              <FiLogIn /> {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="google-section fade-item delay-5">
            <div className="google-section-label"><span>or continue with</span></div>
            <div className="google-btn-wrap">
              <div className="google-btn-face">
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </div>
              <div ref={googleBtnRef} className="google-btn-real" />
            </div>
          </div>

          <div className="signup-cta-box">
            <div className="signup-cta-left">
              <span className="signup-cta-emoji">🌿</span>
              <div>
                <p className="signup-cta-title">New to FreshMart?</p>
                <p className="signup-cta-sub">Join 50K+ families getting fresh groceries daily</p>
              </div>
            </div>
            <Link to="/signup" className="signup-cta-btn">Sign Up Free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
