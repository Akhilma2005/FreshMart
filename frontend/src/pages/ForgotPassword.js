import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiShield, FiLock, FiCheck, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import API, { fetchWithTimeout } from '../api';
import './ForgotPassword.css';

const OTP_COOLDOWN = 60;

// step 0 = enter email + send code
// step 1 = enter otp
// step 2 = enter new password
// step 3 = success

export default function ForgotPassword() {
  const [step, setStep]               = useState(0);
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [waking, setWaking]           = useState(false);
  const [cooldown, setCooldown]       = useState(0);

  const otpRef   = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const sendCode = async () => {
    if (!email.trim()) return setError('Please enter your email.');
    setError(''); setLoading(true); setWaking(false);
    const wakingTimer = setTimeout(() => setWaking(true), 5000);
    try {
      const res = await fetchWithTimeout(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Failed to send code.');
      setStep(1);
      setCooldown(OTP_COOLDOWN);
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Server error. Make sure backend is running.');
    } finally {
      clearTimeout(wakingTimer);
      setLoading(false);
      setWaking(false);
    }
  };

  const resendCode = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Failed to resend.');
      setCooldown(OTP_COOLDOWN);
      setOtp('');
    } catch (err) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) return setError('Enter the complete 6-digit code.');
    setError(''); setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Invalid code.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pwd) => {
    const min = pwd.length >= 6;
    const up  = /[A-Z]/.test(pwd);
    const lw  = /[a-z]/.test(pwd);
    const num = /[0-9]/.test(pwd);
    const sp  = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return { min, up, lw, num, sp, valid: min && up && lw && num && sp };
  };

  const resetPassword = async () => {
    const v = validatePassword(newPassword);
    if (!v.valid) {
      if (!v.min) return setError('Password must be at least 6 characters.');
      if (!v.up)  return setError('Missing an uppercase letter.');
      if (!v.lw)  return setError('Missing a lowercase letter.');
      if (!v.num) return setError('Missing a number.');
      if (!v.sp)  return setError('Missing a special character.');
      return setError('Password does not meet requirements.');
    }
    if (newPassword !== confirmPwd) return setError('Passwords do not match.');
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Failed to reset password.');
      setStep(3);
    } catch {
      setError('Server error.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Success ──
  if (step === 3) {
    return (
      <div className="fp-page">
        <div className="fp-card">
          <div className="fp-success-icon"><FiCheck size={32} /></div>
          <h2>Password Reset!</h2>
          <p>Your password has been updated successfully. You can now log in with your new password.</p>
          <button className="fp-btn primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fp-page">
      <div className="fp-card">

        {/* Back */}
        <Link to="/login" className="fp-back"><FiArrowLeft size={15} /> Back to Login</Link>

        {/* Header */}
        <div className="fp-header">
          <div className="fp-icon">
            {step === 0 && <FiMail size={28} />}
            {step === 1 && <FiShield size={28} />}
            {step === 2 && <FiLock size={28} />}
          </div>
          <h2>
            {step === 0 && 'Forgot Password?'}
            {step === 1 && 'Enter Verify Code'}
            {step === 2 && 'Set New Password'}
          </h2>
          <p>
            {step === 0 && 'Enter your email and we\'ll send a verification code.'}
            {step === 1 && <>Code sent to <strong>{email}</strong></>}
            {step === 2 && 'Choose a strong new password.'}
          </p>
        </div>

        {/* Progress dots */}
        <div className="fp-steps">
          {[0, 1, 2].map(i => (
            <div key={i} className={`fp-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        {/* ── Step 0: Email ── */}
        {step === 0 && (
          <div className="fp-body">
            <div className="fp-field">
              <label>Email Address</label>
              <div className="fp-input-wrap">
                <FiMail size={15} />
                <input
                  type="email" placeholder="your@gmail.com"
                  value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && sendCode()}
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="fp-error">{error}</p>}
            <button className="fp-btn primary" onClick={sendCode} disabled={loading || !email.trim()}>
              {loading
                ? waking
                  ? <><span className="fp-spinner" /> Waking server, please wait...</>
                  : <><span className="fp-spinner" /> Sending...</>
                : <><FiShield size={14} /> Send Verify Code</>}
            </button>
          </div>
        )}

        {/* ── Step 1: OTP ── */}
        {step === 1 && (
          <div className="fp-body">
            <div className="fp-field">
              <label>6-Digit Verification Code</label>
              <div className="fp-input-wrap">
                <FiShield size={15} />
                <input
                  ref={otpRef}
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  className={error ? 'shake' : ''}
                />
              </div>
            </div>
            {error && <p className="fp-error">{error}</p>}
            <button className="fp-btn primary" onClick={verifyOtp} disabled={loading || otp.length < 6}>
              {loading ? <><span className="fp-spinner" /> Verifying...</> : 'Verify Code'}
            </button>
            <button className="fp-btn ghost" onClick={resendCode} disabled={loading || cooldown > 0}>
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : <><FiRefreshCw size={13} /> Resend Code</>}
            </button>
          </div>
        )}

        {/* ── Step 2: New Password ── */}
        {step === 2 && (
          <div className="fp-body">
            <div className="fp-field">
              <label>New Password</label>
              <div className="fp-input-wrap">
                <FiLock size={15} />
                <input
                  type="password" placeholder="Min. 6 characters"
                  value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
            </div>
            <div className="fp-field">
              <label>Confirm New Password</label>
              <div className="fp-input-wrap">
                <FiLock size={15} />
                <input
                  type="password" placeholder="Repeat new password"
                  value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && resetPassword()}
                />
              </div>
            </div>
            <div className="fp-pwd-hints">
              <Requirement met={newPassword.length >= 6} label="At least 6 characters" />
              <Requirement met={/[A-Z]/.test(newPassword)} label="Uppercase (A-Z)" />
              <Requirement met={/[a-z]/.test(newPassword)} label="Lowercase (a-z)" />
              <Requirement met={/[0-9]/.test(newPassword)} label="Number (0-9)" />
              <Requirement met={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)} label="Special character" />
            </div>
            {error && <p className="fp-error">{error}</p>}
            <button className="fp-btn primary" onClick={resetPassword}
              disabled={loading || !newPassword || !confirmPwd}>
              {loading ? <><span className="fp-spinner" /> Saving...</> : <><FiCheck size={14} /> Save New Password</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
function Requirement({ met, label }) {
  return (
    <div className={`fp-hint ${met ? 'met' : ''}`}>
      <FiCheck size={12} /> {label}
    </div>
  );
}
