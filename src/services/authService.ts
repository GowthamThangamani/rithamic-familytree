import { CONFIG } from '../config/index.ts';
import { AuthUser, Individual } from '../types/index.ts';
import { trackEvent } from './telemetryService.ts';

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isAdmin: boolean;
  isEditor: boolean;
}

type AuthListener = (state: AuthState) => void;

class AuthService {
  private token: string | null;
  private user: AuthUser | null;
  private listeners: AuthListener[] = [];

  constructor() {
    this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER);
    this.user = userJson ? JSON.parse(userJson) : null;
  }

  onAuthChange(callback: AuthListener): void {
    this.listeners.push(callback);
  }

  private notifyListeners(): void {
    const state: AuthState = {
      isAuthenticated: this.isAuthenticated(),
      user: this.user,
      isAdmin: this.isAdmin(),
      isEditor: this.isEditor()
    };
    this.listeners.forEach(cb => cb(state));
  }

  isAuthenticated(): boolean {
    return Boolean(this.token && this.user);
  }

  isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  isEditor(): boolean {
    return this.user?.role === 'admin' || this.user?.role === 'editor';
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  async handleUrlTicketExchange(): Promise<boolean> {
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
      await this.verifyAndSetToken(directToken);
      this.cleanUrlParams();
    }

    if (this.token) {
      await this.verifyCurrentSession();
    }

    return false;
  }

  async verifyAndSetToken(token: string): Promise<void> {
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

  async verifyCurrentSession(): Promise<void> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/${CONFIG.PROJECT_KEY}/verify-session`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        this.logout();
      }
    } catch {}
  }

  setSession(token: string, user: AuthUser): void {
    this.token = token;
    this.user = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    this.notifyListeners();
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
    this.notifyListeners();
    trackEvent('auth', 'logout');
  }

  redirectToCentralLogin(): void {
    const currentUrl = window.location.origin + window.location.pathname;
    const loginUrl = `${CONFIG.AUTH_HUB_URL}?project=${CONFIG.PROJECT_KEY}&returnUrl=${encodeURIComponent(currentUrl)}`;
    window.location.href = loginUrl;
  }

  async requestDirectOtp(recipient: string) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/${CONFIG.PROJECT_KEY}/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, channel: 'email', purpose: 'login' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send verification code");
    return data;
  }

  async verifyDirectOtp(recipient: string, otp: string) {
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

  maskSensitiveData(individual: Individual): Individual {
    if (!individual) return individual;
    const copy: Individual = { ...individual };

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

  private cleanUrlParams(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('ticket');
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  }
}

export const auth = new AuthService();
