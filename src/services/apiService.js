// High-Reliability API Client with JWT / Bearer Token Injection & Graceful Session Expiry Handling
const BASE_URL = ''; // Relative to origin

class ApiService {
  constructor() {
    this.token = this.loadToken();
    this.unauthorizedHandlers = [];
  }

  loadToken() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('healthsync_session_token') || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  setToken(token) {
    this.token = token;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) {
          window.localStorage.setItem('healthsync_session_token', token);
        } else {
          window.localStorage.removeItem('healthsync_session_token');
        }
      }
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  }

  onUnauthorized(handler) {
    this.unauthorizedHandlers.push(handler);
    return () => {
      this.unauthorizedHandlers = this.unauthorizedHandlers.filter(h => h !== handler);
    };
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token invalid or expired
        this.setToken(null);
        this.unauthorizedHandlers.forEach(h => {
          try { h(); } catch (err) { console.error(err); }
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body || {})
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body || {})
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
