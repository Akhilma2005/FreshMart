// In-memory OTP store: { email: { otp, expiresAt } }
const store = {};

module.exports = {
  set: (email, otp) => {
    store[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 minutes
  },
  verify: (email, otp) => {
    const entry = store[email];
    if (!entry) return 'OTP not found. Please request a new one.';
    if (Date.now() > entry.expiresAt) {
      delete store[email];
      return 'OTP has expired. Please request a new one.';
    }
    if (entry.otp !== otp) return 'Invalid OTP. Please try again.';
    delete store[email]; // clear after successful verify
    return null; // null = success
  },
};
