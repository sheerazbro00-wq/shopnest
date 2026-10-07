import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import AnnouncementBar from "./components/layout/AnnouncementBar";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Search from "./pages/Search";
import AboutUs from "./pages/content/AboutUs";
import Contact from "./pages/content/Contact";
import Faqs from "./pages/content/Faqs";
import Careers from "./pages/content/Careers";
import ReturnPolicy from "./pages/content/ReturnPolicy";
import PrivacyPolicy from "./pages/content/PrivacyPolicy";
import SizeGuide from "./pages/content/SizeGuide";
import Checkout from "./pages/Checkout";
import ThankYou from "./pages/ThankYou";
import PayPalTest from "./pages/PayPalTest";
import PayPalReturn from "./pages/PayPalReturn";
import Login from "./pages/account/Login";
import Register from "./pages/account/Register";
import ForgotPassword from "./pages/account/ForgotPassword";
import ResetPassword from "./pages/account/ResetPassword";
import Orders from "./pages/account/Orders";
import OrderDetail from "./pages/account/OrderDetail";
import Profile from "./pages/account/Profile";
import CartDrawer from "./components/cart/CartDrawer";
import CountryPopup from "./components/currency/CountryPopup";
import { SignOutOnArrival } from "./components/account/AccountLayout";
import ComingSoon from "./pages/ComingSoon";

// Admin is code-split: its JS only downloads when someone opens /admin.
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function StoreRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/collections/:handle" element={<Collection />} />
      <Route path="/products/:handle" element={<Product />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/search" element={<Search />} />
      <Route path="/pages/about-us" element={<AboutUs />} />
      <Route path="/pages/contact" element={<Contact />} />
      <Route path="/pages/faqs" element={<Faqs />} />
      <Route path="/pages/careers" element={<Careers />} />
      <Route path="/pages/return-exchange-policy" element={<ReturnPolicy />} />
      <Route path="/pages/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/pages/size-guides" element={<SizeGuide />} />
      <Route path="/pages/size-chart" element={<Navigate to="/pages/size-guides" replace />} />
      <Route path="*" element={<ComingSoon />} />
    </Routes>
  );
}

// Checkout, sign-in and the customer account are standalone flows (like
// Shopify's): no store header, footer or cart drawer.
function Shell() {
  const { pathname } = useLocation();

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return (
      <Routes>
        <Route path="/account" element={<Orders />} />
        <Route path="/account/orders/:id" element={<OrderDetail />} />
        <Route path="/account/profile" element={<Profile />} />
        <Route path="/account/login" element={<Login />} />
        <Route path="/account/register" element={<Register />} />
        <Route path="/account/forgot-password" element={<ForgotPassword />} />
        <Route path="/account/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/account" replace />} />
      </Routes>
    );
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <Suspense fallback={<div aria-busy="true" style={{ minHeight: "100vh", background: "#f1f1f1" }} />}>
        <AdminApp />
      </Suspense>
    );
  }

  if (pathname.startsWith("/checkout")) {
    return (
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/thank-you/:id" element={<ThankYou />} />
        <Route path="/checkout/paypal-test/:id" element={<PayPalTest />} />
        <Route path="/checkout/paypal-return/:id" element={<PayPalReturn />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    );
  }

  return (
    <>
      <div className="page">
        <AnnouncementBar />
        <Header />
        <main id="MainContent">
          <StoreRoutes />
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <CountryPopup />
      <SignOutOnArrival />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <ScrollToTop />
            <Shell />
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </BrowserRouter>
  );
}

export default App;
