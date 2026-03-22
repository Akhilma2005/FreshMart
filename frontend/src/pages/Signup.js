import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiUserPlus, FiShoppingBag, FiShoppingCart, FiShield, FiRefreshCw } from 'react-icons/fi';
import { AuthContext } from '../App';
import API from '../api';
import './Signup.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '633026567214-7r9ht0b8lilnsf61j2lefn7484o4d1vh.apps.googleusercontent.com';
const ALLOWED_REGEX = /^[a-zA-Z0-9._%+\-]+@(gmail|hotmail)\.com$/;
const OTP_COOLDOWN = 60;

export default function Signup() {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole]                       = useState('buyer');
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  const [otpSent, setOtpSent]         = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp]                 = useState('');
  const [otpLoading, setOtpLoading]   = useState(false);
  const [otpError, setOtpError]       = useState('');
  const [otpSuccess, setOtpSuccess]   = useState('');
  const [cooldown, setCooldown]       = useState(0);

  // Google states
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [tempToken, setTempToken]           = useState('');
  const [selectedRole, setSelectedRole]     = useState('buyer');
  const [roleLoading, setRoleLoading]       = useState(false);

  const otpInputRef  = useRef(null);
  const timerRef     = useRef(null);
  const googleBtnRef = useRef(null);
  const { login }    = useContext(AuthContext);
  const navigate     = useNavigate();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  // Reset OTP when email changes
  useEffect(() => {
    setOtpSent(false);
    setOtpVerified(false);
    setOtp('');
    setOtpError('');
    setOtpSuccess('');
  }, [email]);

  // Google button init
  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    try {
      const res = await fetch(`${API}/auth/google`, {
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
      setError('Google sign-up failed. Make sure backend is running.');
    }
  }, [login, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: '100%', text: 'signup_with',
      });
    };
    if (window.google) {
      initGoogle();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      script?.addEventListener('load', initGoogle);
      return () => script?.removeEventListener('load', initGoogle);
    }
  }, [handleGoogleResponse]);

  const handleSetRole = async () => {
    setRoleLoading(true);
    try {
      const res = await fetch(`${API}/auth/set-role`, {
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

  const isValidEmail = ALLOWED_REGEX.test(email.trim());

  const pwdRules = [
    { label: 'At least 8 characters',      pass: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)',  pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)',  pass: /[a-z]/.test(password) },
    { label: 'One number (0-9)',            pass: /[0-9]/.test(password) },
    { label: 'One special character (!@#$)', pass: /[^a-zA-Z0-9]/.test(password) },
  ];
  const pwdStrong = pwdRules.every(r => r.pass);

  const sendOtp = async () => {
    setOtpLoading(true); setOtpError(''); setOtpSuccess('');
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpSent(false);
        return setOtpError(data.message || 'Failed to send OTP.');
      }
      setOtpSent(true);
      setOtpError('');
      setOtpSuccess(`OTP sent to ${email.trim()}`);
      setCooldown(OTP_COOLDOWN);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch {
      setOtpError('Server error. Make sure backend is running.');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.trim();
    if (code.length < 6) return setOtpError('Enter the complete 6-digit OTP.');
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      });
      const data = await res.json();
      if (!res.ok) return setOtpError(data.message || 'Invalid OTP.');
      setOtpVerified(true);
      setOtpSuccess('✅ Email verified successfully!');
    } catch {
      setOtpError('Server error.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!isValidEmail)                return setError('Only @gmail.com or @hotmail.com addresses are allowed.');
    if (!otpVerified)                 return setError('Please verify your email with OTP first.');
    if (!pwdStrong)                   return setError('Password does not meet all requirements.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      alert('Registered successfully! Please log in.');
      navigate('/login');
    } catch {
      setError('Server error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const LeftPanel = () => (
    <div className="signup-left">
      <div className="sl-logo">
        <div className="sl-logo-icon">🌿</div>
        FreshMart
      </div>
      <h1 className="sl-title">
        Fresh Food,<br /><em>Delivered Fast</em>
      </h1>
      <p className="sl-sub">
        Join thousands of families who trust FreshMart for farm-fresh groceries delivered straight to their door.
      </p>
      <div className="sl-steps">
        {[
          ['1', 'Create your free account in seconds'],
          ['2', 'Browse 500+ fresh products'],
          ['3', 'Get delivery in under 30 minutes'],
        ].map(([num, text]) => (
          <div className="sl-step" key={num}>
            <div className="sl-step-num">{num}</div>
            <span className="sl-step-text">{text}</span>
          </div>
        ))}
      </div>
      <div className="sl-emojis">
        {['🍎','🥦','🥩','🌶','🥛','🫙','🥜','🍋','🧅'].map((e, i) => <span key={i}>{e}</span>)}
      </div>
    </div>
  );

  // ── Google role selection screen ──
  if (showRoleSelect) {
    return (
      <div className="signup-page">
        <LeftPanel />
        <div className="signup-right"><div className="signup-container">
          <div className="signup-header">
            <h2>Almost there!</h2>
            <p>How would you like to use FreshMart?</p>
          </div>
          <div className="role-selector" style={{ margin: '24px 0' }}>
            <button type="button" className={`role-btn ${selectedRole === 'buyer' ? 'active' : ''}`} onClick={() => setSelectedRole('buyer')}>
              <FiShoppingCart /> Shop as Customer
            </button>
            <button type="button" className={`role-btn ${selectedRole === 'vendor' ? 'active' : ''}`} onClick={() => setSelectedRole('vendor')}>
              <FiShoppingBag /> Become a Vendor
            </button>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="signup-btn" onClick={handleSetRole} disabled={roleLoading}>
            {roleLoading ? 'Setting up...' : 'Continue'}
          </button>
        </div></div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <LeftPanel />
      <div className="signup-right"><div className="signup-container">
        <div className="signup-header">
          <div className="signup-header-badge">✦ Free to join — no hidden fees</div>
          <h2>Start Fresh<em>.</em></h2>
          <p>Your farm-fresh groceries are one account away</p>
          <div className="signup-trust-row">
            <span>🔒 Secure & private</span>
            <span>·</span>
            <span>🌿 500+ products</span>
            <span>·</span>
            <span>⚡ 30-min delivery</span>
          </div>
        </div>

        <form className="signup-form" onSubmit={handleSignup}>

          {/* Role */}
          <div className="role-selector">
            <button type="button" className={`role-btn ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
              <FiShoppingCart /> Buyer
            </button>
            <button type="button" className={`role-btn ${role === 'vendor' ? 'active' : ''}`} onClick={() => setRole('vendor')}>
              <FiShoppingBag /> Vendor
            </button>
          </div>

          {/* Name */}
          <div className="input-group fade-item delay-1">
            <FiUser />
            <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {/* Email */}
          <div className="input-group fade-item delay-2">
            <FiMail />
            <input
              type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)}
              disabled={otpVerified} required
            />
            {otpVerified && <span className="otp-verified-tag">✅ Verified</span>}
          </div>

          {/* Invalid email warning */}
          {email && !isValidEmail && (
            <p className="otp-hint error">⚠️ Only @gmail.com or @hotmail.com addresses are accepted.</p>
          )}

          {/* Send OTP button */}
          {isValidEmail && !otpVerified && (
            <button type="button" className="otp-send-btn-block"
              onClick={sendOtp}
              disabled={otpLoading || cooldown > 0}>
              {otpLoading
                ? <><span className="otp-spinner" /> Sending...</>
                : cooldown > 0
                  ? `Resend OTP in ${cooldown}s`
                  : otpSent
                    ? <><FiRefreshCw size={13} /> Resend OTP</>
                    : <><FiShield size={13} /> Send OTP to Email</>}
            </button>
          )}

          {/* Error from send-otp (e.g. email already exists) */}
          {!otpSent && otpError && <p className="otp-hint error">{otpError}</p>}

          {/* Single OTP input */}
          {otpSent && !otpVerified && (
            <div className="otp-section">
              <p className="otp-label"><FiShield size={13} /> Enter the 6-digit OTP sent to your email</p>
              <div className="otp-single-wrap">
                <input
                  ref={otpInputRef}
                  className={`otp-single-input ${otpError ? 'shake' : ''}`}
                  type="text" inputMode="numeric"
                  maxLength={6} placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                />
                <button type="button" className="otp-verify-inline-btn"
                  onClick={verifyOtp}
                  disabled={otpLoading || otp.length < 6}>
                  {otpLoading ? <span className="otp-spinner" /> : 'Verify'}
                </button>
              </div>
              {otpError  && <p className="otp-hint error">{otpError}</p>}
              {otpSuccess && <p className="otp-hint success">{otpSuccess}</p>}
            </div>
          )}

          {otpVerified && <p className="otp-hint success">{otpSuccess}</p>}

          {/* Password */}
          <div className="input-group fade-item delay-3">
            <FiLock />
            <input type="password" placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required />
          </div>

          {/* Password rules — show as soon as user starts typing */}
          {password && (
            <div className="pwd-rules">
              {pwdRules.map((r, i) => (
                <div key={i} className={`pwd-rule ${r.pass ? 'pass' : 'fail'}`}>
                  <span className="pwd-rule-icon">{r.pass ? '✅' : '❌'}</span>
                  {r.label}
                </div>
              ))}
            </div>
          )}

          <div className="input-group fade-item delay-4">
            <FiLock />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="signup-btn fade-item delay-5" disabled={loading}>
            <FiUserPlus /> {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <div className="google-section fade-item delay-6">
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

        <div className="login-cta-box">
          <div className="login-cta-left">
            <span className="login-cta-emoji">👋</span>
            <div>
              <p className="login-cta-title">Already a member?</p>
              <p className="login-cta-sub">Sign in and pick up right where you left off</p>
            </div>
          </div>
          <Link to="/login" className="login-cta-btn">Log In</Link>
        </div>
      </div></div>
    </div>
  );
}
