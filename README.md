# 🌿 FreshMart — Farm Fresh Grocery Delivery Platform

A full-stack grocery e-commerce platform where buyers can shop fresh produce, vendors can sell their products, and admins can manage the entire marketplace — all in real time.

**Live Site:** [https://fresh-mart-sigma.vercel.app](https://fresh-mart-sigma.vercel.app)  
**Backend API:** [https://freshmart-1-z1ib.onrender.com/api](https://freshmart-1-z1ib.onrender.com/api)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Socket.io Client |
| Backend | Node.js, Express 5, Socket.io |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT, Google OAuth 2.0 |
| File Storage | Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Features

### Buyer Features
- **Browse & Search** — Browse 500+ products across categories like Vegetables, Fruits, Raw Meats, Masalas & Spices, Dairy, and more
- **Category Filtering** — Filter products by category with a dynamic category bar
- **Product Detail Page** — View product images, price, discount %, weight variants (250g / 500g / 1kg / 2kg), stock status, seller info, nutrition info, and delivery details
- **Add to Cart** — Add products with quantity controls, update or remove items
- **Favorites / Wishlist** — Save products to a personal wishlist
- **Coupon Codes** — Apply discount coupons at checkout (percent or flat discount)
- **Checkout** — Place orders with delivery address, payment mode (COD / Online), and order summary
- **Order History** — View all past orders with itemized breakdown, delivery status, and payment info
- **Product Reviews** — Submit star ratings and written reviews on products
- **Search** — Search products by name across the entire catalog

### Authentication
- **Email & Password** signup and login
- **Google OAuth** — Sign in with Google (one-click login)
- **OTP Email Verification** — 6-digit OTP sent to email during signup
- **Forgot Password** — Reset password via OTP sent to registered email
- **Role Selection** — New Google users choose between Buyer or Vendor on first login
- **JWT Sessions** — 7-day token-based sessions with auto-refresh on page load

### User Profile
- **Edit Profile** — Update name, phone, gender, date of birth, bio
- **Address Management** — Save street address, city, state, pincode, country
- **Profile Picture** — Upload avatar image (stored on Cloudinary)
- **Order History Tab** — View orders directly from profile
- **Account Settings** — Change photo, edit profile, logout, delete account
- **Delete Account** — Permanently delete account with confirmation prompt

### Vendor Features
- **Vendor Dashboard** — Overview of total products, sales, revenue, and out-of-stock count
- **Add Products** — List products from the catalog or submit custom products for admin approval
- **Edit / Delete Products** — Manage existing listings with inline editing
- **Real-time Sales Updates** — Live stock and sales stats via Socket.io when orders are placed
- **Shop Profile** — Set up shop name, tagline, description, contact info, address, and shop logo
- **Payment Details** — Save UPI ID and bank account details for earnings transfer
- **UPI Verification** — Validate UPI ID format and bank handle before saving
- **Customer Reviews** — View all reviews left by buyers on vendor products
- **Product Stats** — Per-product breakdown of units sold, revenue earned, and order count

### Admin Panel (`/dashboard`)
- **Overview Stats** — Total buyers, vendors, products, orders, and revenue
- **User Management** — View, edit, delete users and manage their roles (buyer / vendor / admin)
- **Product Management** — Edit or delete any product across the platform
- **Vendor Payments** — View all vendor bank and UPI payment details
- **Shop Management** — Edit or delete vendor shops, update shop avatar
- **Order Management** — View all orders with full item breakdown and customer info
- **Coupon Management** — Create, edit, enable/disable, and delete discount coupons
- **Product Approvals** — Approve or reject custom vendor product submissions with optional rejection notes
- **Catalog Management** — Add/edit/delete product categories and items used by vendors when listing products
- **Front Categories** — Manage the homepage category grid (name, icon, color, background, image)
- **Navbar Config** — Edit the scrolling ticker messages and category navigation links shown in the navbar
- **Default Products** — Add/edit/delete the platform's default product listings with images, badges, ratings

### Real-time Features
- **Socket.io** — Live product updates pushed to all connected clients when products change
- **Vendor Live Dashboard** — Vendors receive real-time stock and sales updates the moment an order is placed
- **Products Updated Event** — Homepage and product pages refresh automatically when inventory changes

### UI / UX
- **Smooth Scroll** — Lenis smooth scrolling library
- **Page Transitions** — Animated route transitions between pages
- **Countdown Timer** — Live deal countdown timer on homepage
- **Responsive Design** — Mobile-friendly layout across all pages
- **Toast Notifications** — Success and error feedback throughout the app
- **Image Fallbacks** — Emoji fallback shown when product images fail to load

---

## Project Structure

```
FreshMart/
├── backend/
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # Mongoose models (User, Product, Order, Shop, Coupon, etc.)
│   ├── routes/            # Express route handlers
│   │   ├── auth.js        # Register, login, Google OAuth, OTP, password reset
│   │   ├── users.js       # Profile CRUD, avatar upload
│   │   ├── products.js    # Product listing and search
│   │   ├── orders.js      # Place and fetch orders
│   │   ├── vendor.js      # Vendor shop, products, stats, payment
│   │   ├── admin.js       # Admin management routes
│   │   └── reviews.js     # Product reviews
│   ├── utils/
│   │   ├── cloudinary.js  # Cloudinary upload helper
│   │   ├── mailer.js      # Nodemailer email sender
│   │   └── otpStore.js    # In-memory OTP store with expiry
│   └── server.js          # Express + Socket.io server entry point
│
└── frontend/
    └── src/
        ├── components/    # Navbar, Footer, MiniCard, ProductCard, SearchBar
        ├── hooks/         # useFrontCategories custom hook
        ├── pages/         # All page components
        │   ├── Home.js
        │   ├── Products.js
        │   ├── ProductDetail.js
        │   ├── Cart.js
        │   ├── Checkout.js
        │   ├── OrderHistory.js
        │   ├── Favorites.js
        │   ├── Profile.js
        │   ├── Login.js
        │   ├── Signup.js
        │   ├── ForgotPassword.js
        │   ├── VendorDashboard.js
        │   ├── AddProduct.js
        │   ├── AdminPanel.js
        │   ├── Dashboard.js
        │   ├── Categories.js
        │   └── About.js
        ├── App.js         # Routes, global context providers
        └── api.js         # Base API URL config
```

---

## Environment Variables

### Backend `.env`
```
MONGO_URI=
JWT_SECRET=
PORT=5000
MAIL_USER=
MAIL_PASS=
GOOGLE_CLIENT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_URL=
BACKEND_URL=
```

### Frontend `.env`
```
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=
```

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Akhilma2005/FreshMart.git
cd FreshMart
```

### 2. Start the backend
```bash
cd backend
npm install
npm start
```

### 3. Start the frontend
```bash
cd frontend
npm install
npm start
```

The app will run at `http://localhost:3000` with the backend at `http://localhost:5000`.

---

## Deployment

- **Frontend** is deployed on [Vercel](https://vercel.com) — auto-deploys on every push to `main`
- **Backend** is deployed on [Render](https://render.com) — set all backend env variables in the Render dashboard
- **Images** are stored on [Cloudinary](https://cloudinary.com) — no local file storage needed in production
- **Database** is hosted on [MongoDB Atlas](https://cloud.mongodb.com)

---

## Author

Built by **Akhil** — [GitHub](https://github.com/Akhilma2005)
