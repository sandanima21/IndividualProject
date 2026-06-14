/**
 * App — root component for the customer-facing KukiHabun app.
 *
 * Responsibilities:
 *  - Defines all client-side routes (public, authenticated, role-gated).
 *  - Manages the post-login welcome popup and phone-verification flow.
 *  - Suppresses the navbar on pages that have their own full-screen layout
 *    (SignIn, ChangePassword) via HIDE_NAVBAR.
 *  - Lazily loads legal pages (Privacy / Terms) so they don't bloat the
 *    main bundle — they're rarely visited.
 */

import React, { useContext, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Menubar from './components/Menubar/Menubar'
import WelcomePopup from './components/WelcomePopup/WelcomePopup'
import PhoneVerificationModal from './components/PhoneVerification/PhoneVerificationModal'
import FloatingChat from './components/FloatingChat/FloatingChat'
import Home from './pages/Home/Home'
import Cart from './pages/Cart/Cart'
import Orders from './pages/Orders/Orders'
import Profile from './pages/Profile/Profile'
import Chat from './pages/Chat/Chat'
import Contact from './pages/Contact/Contact'
import AboutUs from './pages/AboutUs/AboutUs'
import DeliveryDashboard from './pages/Delivery/DeliveryDashboard'
import FoodDetails from './pages/FoodDetails/FoodDetails'
import SignIn from './pages/SignIn/SignIn'
import ChangePassword from './pages/ChangePassword/ChangePassword'
import Explore from './pages/Explore/Explore'
import Offers from './pages/Offers/Offers'
import { StoreContext } from './context/StoreContext'

// Legal pages are code-split because they're large static text pages
// that the vast majority of users never visit.
const PrivacyPolicy  = React.lazy(() => import('./pages/Legal/PrivacyPolicy'))
const TermsOfService = React.lazy(() => import('./pages/Legal/TermsOfService'))

// These pages render their own full-screen layouts, so the shared navbar would clash.
const HIDE_NAVBAR = ['/signin', '/change-password'];

const App = () => {
  const { user, token, updateUserPhone, updateUser } = useContext(StoreContext)
  const location = useLocation()

  // Welcome popup state — shown once after sign-in or new registration.
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeUser, setWelcomeUser]  = useState(null)

  // Phone verification is offered right after the welcome popup for new users
  // who haven't provided a number yet (e.g. signed in via Google).
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const handleLoginSuccess = (userData) => {
    setWelcomeUser(userData)
    setShowWelcome(true)
  }

  // If the user object has `isNew: true` (set by the backend on first registration),
  // show the welcome popup even after a hard refresh — the flag persists in localStorage
  // until handleWelcomeDone clears it.
  React.useEffect(() => {
    if (user?.isNew) {
      setWelcomeUser(user)
      setShowWelcome(true)
    }
  }, [user?.id])

  const handleWelcomeDone = () => {
    setShowWelcome(false)
    // Clear isNew so refreshing the page doesn't re-show the welcome popup.
    updateUser({ isNew: false })
    // Only prompt for a phone number if the user hasn't already verified one
    // (e.g. Google users who skipped phone entry at sign-up).
    if (welcomeUser && !welcomeUser.phone) {
      setShowPhoneModal(true)
    }
  }

  const handlePhoneVerified = (phone) => {
    updateUserPhone(phone)
    setShowPhoneModal(false)
  }

  const hideNav = HIDE_NAVBAR.includes(location.pathname)

  return (
    <div>
      {!hideNav && <Menubar onLoginSuccess={handleLoginSuccess} />}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="dark"
        toastStyle={{ background: '#1e1e1e', color: '#f0ece0', border: '1px solid rgba(201,168,76,0.2)' }}
      />

      {/* Post-login welcome overlay */}
      {showWelcome && welcomeUser && (
        <WelcomePopup user={welcomeUser} onDone={handleWelcomeDone} />
      )}

      {/* Phone verification modal — shown after welcome for users without a number */}
      {showPhoneModal && (
        <PhoneVerificationModal
          token={token}
          onVerified={handlePhoneVerified}
          onSkip={() => setShowPhoneModal(false)}
        />
      )}

      {/* Floating chat button rendered globally so it appears on every page */}
      <FloatingChat />

      <Routes>
        {/* ── Public routes (no auth required) ──────────────────────────────── */}
        <Route path='/'         element={<Home />} />
        <Route path='/explore'  element={<Explore />} />
        <Route path='/contact'  element={<Contact />} />
        <Route path='/about'    element={<AboutUs />} />
        <Route path='/offers'   element={<Offers />} />
        <Route path='/food/:id' element={<FoodDetails />} />

        {/* Lazy-loaded legal pages — wrapped in Suspense so the rest of the app
            doesn't wait for them to load before rendering. */}
        <Route path='/privacy' element={<React.Suspense fallback={null}><PrivacyPolicy /></React.Suspense>} />
        <Route path='/terms'   element={<React.Suspense fallback={null}><TermsOfService /></React.Suspense>} />

        {/* Redirect signed-in users away from /signin to avoid a confusing double-login. */}
        <Route path='/signin'  element={user ? <Navigate to="/" replace /> : <SignIn />} />

        {/* ── Authenticated routes (any role) ───────────────────────────────── */}
        <Route path='/cart'    element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path='/orders'  element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path='/chat'    element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path='/change-password' element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

        {/* ── Delivery personnel only ────────────────────────────────────────── */}
        <Route path='/delivery' element={<ProtectedRoute roles={['DELIVERY']}><DeliveryDashboard /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}

export default App
