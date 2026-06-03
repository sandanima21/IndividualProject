import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { StoreProvider } from './context/StoreContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

// Google OAuth implicit-flow popup callback.
// When the popup redirects back to this origin with #access_token=...,
// we send it to the opener (same-origin postMessage — no COOP issue)
// then close the popup immediately before React renders.
const _oauthToken = new URLSearchParams(window.location.hash.slice(1)).get('access_token');
if (window.opener && _oauthToken) {
  try {
    window.opener.postMessage(
      { type: 'GOOGLE_OAUTH', token: _oauthToken },
      window.location.origin
    );
  } catch (_) {}
  window.close();
} else {
  createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <ThemeProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
