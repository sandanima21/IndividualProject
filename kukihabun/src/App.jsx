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

const PrivacyPolicy = React.lazy(() => import('./pages/Legal/PrivacyPolicy'))
const TermsOfService = React.lazy(() => import('./pages/Legal/TermsOfService'))

// Pages where the top navbar is hidden
const HIDE_NAVBAR = ['/signin', '/change-password'];

const App = () => {
  const { user, token, updateUserPhone, updateUser } = useContext(StoreContext)
  const location = useLocation()
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeUser, setWelcomeUser] = useState(null)
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const handleLoginSuccess = (userData) => {
    setWelcomeUser(userData)
    setShowWelcome(true)
  }

  // Show welcome for new registrations after navigation lands on home
  React.useEffect(() => {
    if (user?.isNew) {
      setWelcomeUser(user)
      setShowWelcome(true)
    }
  }, [user?.id])

  const handleWelcomeDone = () => {
    setShowWelcome(false)
    // Clear isNew so this popup never shows again on refresh
    updateUser({ isNew: false })
    // Only ask for phone if not already verified during signup
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
      {showWelcome && welcomeUser && (
        <WelcomePopup user={welcomeUser} onDone={handleWelcomeDone} />
      )}
      {showPhoneModal && (
        <PhoneVerificationModal
          token={token}
          onVerified={handlePhoneVerified}
          onSkip={() => setShowPhoneModal(false)}
        />
      )}
      <FloatingChat />
      <Routes>
        {/* ── Public ───────────────────────────────────────────────────────── */}
        <Route path='/'        element={<Home />} />
        <Route path='/explore' element={<Explore />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/about'   element={<AboutUs />} />
        <Route path='/offers'  element={<Offers />} />
        <Route path='/food/:id' element={<FoodDetails />} />
        <Route path='/privacy' element={<React.Suspense fallback={null}><PrivacyPolicy /></React.Suspense>} />
        <Route path='/terms'   element={<React.Suspense fallback={null}><TermsOfService /></React.Suspense>} />

        {/* Redirect already-signed-in users away from /signin */}
        <Route path='/signin'  element={user ? <Navigate to="/" replace /> : <SignIn />} />

        {/* ── Authenticated (any role) ─────────────────────────────────────── */}
        <Route path='/cart'    element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path='/orders'  element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path='/chat'    element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path='/change-password' element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

        {/* ── Delivery personnel only ──────────────────────────────────────── */}
        <Route path='/delivery' element={<ProtectedRoute roles={['DELIVERY']}><DeliveryDashboard /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}

export default App
