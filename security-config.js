// Security Configuration and Best Practices
class SecurityConfig {
  constructor() {
    this.init();
  }

  init() {
    this.setupSecurityHeaders();
    this.setupCSP();
    this.setupSessionSecurity();
    this.monitorSecurity();
  }

  setupSecurityHeaders() {
    // Add security headers via meta tags (limited in static sites)
    const securityMeta = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
      { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' }
    ];

    securityMeta.forEach(meta => {
      const metaTag = document.createElement('meta');
      Object.keys(meta).forEach(key => {
        metaTag.setAttribute(key, meta[key]);
      });
      document.head.appendChild(metaTag);
    });
  }

  setupCSP() {
    // Content Security Policy (limited effectiveness in static sites)
    const csp = document.createElement('meta');
    csp.setAttribute('http-equiv', 'Content-Security-Policy');
    csp.setAttribute('content', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https://cdnjs.cloudflare.com;"
    );
    document.head.appendChild(csp);
  }

  setupSessionSecurity() {
    // Enhanced session security
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.maxInactivity = 2 * 60 * 60 * 1000; // 2 hours
    this.lastActivity = Date.now();

    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = Date.now();
      }, { passive: true });
    });

    // Check session validity periodically
    setInterval(() => {
      this.validateSession();
    }, 60000); // Check every minute
  }

  validateSession() {
    try {
      const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
      
      if (!sessionData.token) return;

      const now = Date.now();
      const inactiveTime = now - this.lastActivity;
      
      // Check for inactivity timeout
      if (inactiveTime > this.maxInactivity) {
        this.invalidateSession('Session expired due to inactivity');
        return;
      }

      // Check for absolute session timeout
      if (sessionData.expiresAt && now > sessionData.expiresAt) {
        this.invalidateSession('Session expired');
        return;
      }

      // Validate token format
      if (!this.isValidTokenFormat(sessionData.token)) {
        this.invalidateSession('Invalid session token');
        return;
      }

    } catch (error) {
      console.error('Session validation error:', error);
      this.invalidateSession('Session validation failed');
    }
  }

  isValidTokenFormat(token) {
    // Validate token format (should be hex string with timestamp)
    return token && 
           typeof token === 'string' && 
           token.length >= 64 && 
           /^[a-f0-9]+$/i.test(token);
  }

  invalidateSession(reason) {
    console.warn('Session invalidated:', reason);
    
    // Clear all session data
    localStorage.removeItem('adminSession');
    
    // Redirect to login if on admin pages
    if (window.location.pathname.includes('admin-panel.html')) {
      alert('Your session has expired. Please log in again.');
      window.location.href = 'admin-login.html';
    }
  }

  monitorSecurity() {
    // Monitor for suspicious activity
    let failedAttempts = 0;
    const maxFailedAttempts = 5;
    const lockoutTime = 15 * 60 * 1000; // 15 minutes

    // Listen for failed login attempts
    document.addEventListener('loginFailed', () => {
      failedAttempts++;
      
      if (failedAttempts >= maxFailedAttempts) {
        const lockoutEnd = Date.now() + lockoutTime;
        localStorage.setItem('loginLockout', lockoutEnd.toString());
        alert('Too many failed login attempts. Please try again in 15 minutes.');
      }
    });

    // Check for active lockout
    const lockoutEnd = localStorage.getItem('loginLockout');
    if (lockoutEnd && Date.now() < parseInt(lockoutEnd)) {
      const remainingTime = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 60000);
      if (window.location.pathname.includes('admin-login.html')) {
        alert(`Account temporarily locked. Try again in ${remainingTime} minutes.`);
        // Disable login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
          loginForm.style.pointerEvents = 'none';
          loginForm.style.opacity = '0.5';
        }
      }
    }
  }

  // Secure data encryption/decryption utilities
  async encryptData(data, password) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const passwordBuffer = encoder.encode(password);
    
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    );
    
    // Combine salt, iv, and encrypted data
    const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    return Array.from(result, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async decryptData(encryptedHex, password) {
    const encryptedArray = new Uint8Array(
      encryptedHex.match(/.{2}/g).map(byte => parseInt(byte, 16))
    );
    
    // Extract salt, iv, and encrypted data
    const salt = encryptedArray.slice(0, 16);
    const iv = encryptedArray.slice(16, 28);
    const encryptedData = encryptedArray.slice(28);
    
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Derive key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }
}

// Initialize security configuration
document.addEventListener('DOMContentLoaded', () => {
  new SecurityConfig();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityConfig;
}