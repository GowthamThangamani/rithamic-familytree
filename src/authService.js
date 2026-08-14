// Authentication & Privacy Service - rithamic-familytree
import { CONFIG } from './config.js';
import { trackEvent } from './telemetryService.js';

class AuthService {
  constructor() {
    this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    this.user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER) || 'null');
    this.listeners = [];
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({
      isAuthenticated: this.isAuthenticated(),
      user: this.user,
      isAdmin: this.isAdmin(),
      isEditor: this.isEditor()
    }));
  }

  isAuthenticated() {
    return Boolean(this.token && this.user);
  }

  isAdmin() {
    return this.user?.role === 'admin';
  }

  isEditor() {
    return this.user?.role === 'admin' || this.user?.role === 'editor';
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  // Handle SSO Ticket from URL query
  async handleUrlTicketExchange() {
    const urlParams = new URLSearchParams(window.location.search);
    const ssoTicket = urlParams.get('ticket');
    const directToken = urlParams.get('token');

    if (ssoTicket) {
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/sso/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticket: ssoTicket,
            targetProjectKey: CONFIG.PROJECT_KEY
          })
        });

        const data = await res.json();
        if (res.ok && data.token) {
          this.setSession(data.token, data.user);
          trackEvent('auth', 'sso_login_success', { email: data.user.email });
          this.cleanUrlParams();
          return true;
        }
      } catch (err) {
        console.error("SSO exchange error:", err);
      }
    } else if (directToken) {
      // If direct token passed
      await this.verifyAndSetToken(directToken);
      this.cleanUrlParams();
    }

    // Verify existing token if present
    if (this.token) {
      await this.verifyCurrentSession();
    }

    return false;
  }

  async verifyAndSetToken(token) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/${CONFIG.PROJECT_KEY}/verify-session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        this.setSession(token, data.user);
      }
    } catch {}
  }

  async verifyCurrentSession() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/${CONFIG.PROJECT_KEY}/verify-session`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        this.logout();
      }
    } catch {
      // Keep offline cache if server momentarily down
    }
  }

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    this.notifyListeners();
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
    this.notifyListeners();
    trackEvent('auth', 'logout');
  }

  // Redirect to Central Login Portal
  redirectToCentralLogin() {
    const currentUrl = window.location.origin + window.location.pathname;
    const loginUrl = `${CONFIG.AUTH_HUB_URL}?project=${CONFIG.PROJECT_KEY}&returnUrl=${encodeURIComponent(currentUrl)}`;
    window.location.href = loginUrl;
  }

  // Request OTP directly inside Family Tree modal
  async requestDirectOtp(recipient) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/${CONFIG.PROJECT_KEY}/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, channel: 'email', purpose: 'login' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send verification code");
    return data;
  }

  // Verify OTP directly inside Family Tree modal
  async verifyDirectOtp(recipient, otp) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/${CONFIG.PROJECT_KEY}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Invalid verification code");
    this.setSession(data.token, data.user);
    trackEvent('auth', 'otp_login_success', { email: data.user.email });
    return data;
  }

  // Privacy Protection Filter
  maskSensitiveData(individual) {
    if (!individual) return individual;
    const copy = { ...individual };

    // If unauthenticated, mask contact number and private notes for living persons
    if (!this.isAuthenticated()) {
      if (copy.contact) {
        const parts = copy.contact.split(' ');
        copy.contact = parts.length > 1 ? `${parts[0]} ${parts[1]?.substring(0, 3)} •••••` : `+91 ••••••••••`;
      }
      if (copy.isLiving && copy.notes && copy.notes.length > 50) {
        copy.notes = copy.notes.substring(0, 50) + "… [Sign in to view full family record]";
      }
    }

    return copy;
  }

  cleanUrlParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete('ticket');
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  }
}

export const auth = new AuthService();
