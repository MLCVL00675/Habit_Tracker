/* ==========================================================================
   CHRONOLOG // AUTHENTICATION & USER SESSION ENGINE
   ========================================================================== */

// Storage Keys
const STORAGE_USERS_KEY = 'chronolog_users_registry';
const STORAGE_SESSION_KEY = 'chronolog_active_session';
const STORAGE_GUEST_KEY = 'chronolog_guest_data';

// Available Avatar Icons
export const AVATAR_PRESETS = [
  { id: 'avatar-1', icon: '⚡', name: 'Thunder', color: '#06b6d4' },
  { id: 'avatar-2', icon: '🧘', name: 'Zen Monk', color: '#10b981' },
  { id: 'avatar-3', icon: '🚀', name: 'Explorer', color: '#8b5cf6' },
  { id: 'avatar-4', icon: '🦁', name: 'Lionheart', color: '#f59e0b' },
  { id: 'avatar-5', icon: '🐺', name: 'Lone Wolf', color: '#64748b' },
  { id: 'avatar-6', icon: '🛡️', name: 'Guardian', color: '#38bdf8' },
  { id: 'avatar-7', icon: '💎', name: 'Diamond', color: '#ec4899' },
  { id: 'avatar-8', icon: '🌟', name: 'Radiant', color: '#eab308' },
  { id: 'avatar-9', icon: '👑', name: 'Crown', color: '#f43f5e' },
  { id: 'avatar-10', icon: '🎯', name: 'Sharpshooter', color: '#14b8a6' },
  { id: 'avatar-11', icon: '🔮', name: 'Mystic', color: '#a855f7' },
  { id: 'avatar-12', icon: '🌊', name: 'Ocean Flow', color: '#0284c7' }
];

// Helper: Hash password with SHA-256 + salt using native Web Crypto API
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(password + '::chronolog_salt::' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate secure random ID
function generateId(prefix = 'user') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class AuthManager {
  constructor() {
    this.activeUser = null;
    this.listeners = [];
    this.init();
  }

  init() {
    this.loadSession();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data) {
    this.listeners.forEach(fn => {
      try {
        fn(event, data, this.activeUser);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // USER REGISTRY & STORAGE
  // --------------------------------------------------------------------------
  getAllUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to read users registry:', e);
      return [];
    }
  }

  saveUsersRegistry(users) {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users registry:', e);
    }
  }

  getUserById(id) {
    const users = this.getAllUsers();
    return users.find(u => u.id === id) || null;
  }

  getUserByIdentifier(identifier) {
    const query = identifier.trim().toLowerCase();
    const users = this.getAllUsers();
    return users.find(u => 
      (u.email && u.email.toLowerCase() === query) ||
      (u.username && u.username.toLowerCase() === query)
    ) || null;
  }

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------
  loadSession() {
    try {
      // 1. Check local session (Remember Me or Persistent)
      let sessionRaw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!sessionRaw) {
        // 2. Check temporary session storage
        sessionRaw = sessionStorage.getItem(STORAGE_SESSION_KEY);
      }

      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session.isGuest) {
          this.activeUser = {
            id: session.userId || 'guest_user',
            name: session.name || 'Guest Explorer',
            email: 'guest@chronolog.local',
            username: 'guest',
            avatar: session.avatar || '⚡',
            isGuest: true,
            createdAt: session.createdAt || new Date().toISOString()
          };
        } else {
          const user = this.getUserById(session.userId);
          if (user) {
            this.activeUser = this.sanitizeUser(user);
            // Update last active
            this.updateUserLastActive(user.id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
      this.activeUser = null;
    }
  }

  setSession(user, rememberMe = true) {
    const sessionData = {
      userId: user.id,
      isGuest: !!user.isGuest,
      name: user.name,
      avatar: user.avatar,
      timestamp: Date.now()
    };

    const serialized = JSON.stringify(sessionData);
    if (rememberMe) {
      localStorage.setItem(STORAGE_SESSION_KEY, serialized);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
    } else {
      sessionStorage.setItem(STORAGE_SESSION_KEY, serialized);
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }

  clearSession() {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    this.activeUser = null;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  updateUserLastActive(userId) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].lastActiveAt = new Date().toISOString();
      this.saveUsersRegistry(users);
    }
  }

  // --------------------------------------------------------------------------
  // AUTH ACTIONS (REGISTER, LOGIN, LOGOUT, GUEST)
  // --------------------------------------------------------------------------

  /**
   * Register a new user account
   */
  async register({ name, email, username, password, avatar = '⚡' }) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedUsername = (username || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();

    if (!trimmedName) {
      throw new Error('Please enter your full name.');
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!trimmedUsername || trimmedUsername.length < 3) {
      throw new Error('Username must be at least 3 characters.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const users = this.getAllUsers();

    // Check if email already exists
    if (users.some(u => u.email && u.email.toLowerCase() === trimmedEmail)) {
      throw new Error('An account with this email already exists.');
    }

    // Check if username already exists
    if (users.some(u => u.username && u.username.toLowerCase() === trimmedUsername)) {
      throw new Error('This username is already taken. Please choose another.');
    }

    const salt = Math.random().toString(36).substr(2, 16);
    const passwordHash = await hashPassword(password, salt);

    const newUser = {
      id: generateId('user'),
      name: trimmedName,
      email: trimmedEmail,
      username: trimmedUsername,
      passwordHash,
      salt,
      avatar,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsersRegistry(users);

    // Set active session
    this.activeUser = this.sanitizeUser(newUser);
    this.setSession(this.activeUser, true);

    this.notify('REGISTER_SUCCESS', this.activeUser);
    return this.activeUser;
  }

  /**
   * Sign In with Email or Username + Password
   */
  async login({ identifier, password, rememberMe = true }) {
    if (!identifier || !identifier.trim()) {
      throw new Error('Please enter your email or username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const user = this.getUserByIdentifier(identifier);
    if (!user) {
      throw new Error('Invalid email/username or password.');
    }

    const calculatedHash = await hashPassword(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      throw new Error('Invalid email/username or password.');
    }

    this.activeUser = this.sanitizeUser(user);
    this.setSession(this.activeUser, rememberMe);
    this.updateUserLastActive(user.id);

    this.notify('LOGIN_SUCCESS', this.activeUser);
    return this.activeUser;
  }

  /**
   * Login as Guest (quick 1-click access)
   */
  loginAsGuest({ name = 'Guest Explorer', avatar = '⚡', sampleData = false } = {}) {
    const guestId = 'guest_user';
    this.activeUser = {
      id: guestId,
      name,
      email: 'guest@chronolog.local',
      username: 'guest',
      avatar,
      isGuest: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    this.setSession(this.activeUser, true);
    this.notify('GUEST_LOGIN', { user: this.activeUser, sampleData });
    return this.activeUser;
  }

  /**
   * Switch between registered accounts saved on this device
   */
  switchAccount(userId) {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('User account not found.');
    }

    this.activeUser = this.sanitizeUser(user);
    this.setSession(this.activeUser, true);
    this.updateUserLastActive(user.id);

    this.notify('ACCOUNT_SWITCH', this.activeUser);
    return this.activeUser;
  }

  /**
   * Convert Guest progress into a registered account seamlessly
   */
  async convertGuestToAccount({ name, email, username, password, avatar }) {
    const newUser = await this.register({ name, email, username, password, avatar });
    this.notify('GUEST_CONVERTED', { newUser });
    return newUser;
  }

  /**
   * Update User Profile (Name, Avatar, Email)
   */
  async updateProfile(userId, { name, avatar, email }) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) {
      throw new Error('User not found.');
    }

    if (name) users[idx].name = name.trim();
    if (avatar) users[idx].avatar = avatar;
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      // Check if email already in use by someone else
      const conflict = users.find(u => u.id !== userId && u.email.toLowerCase() === trimmedEmail);
      if (conflict) throw new Error('Email is already registered by another account.');
      users[idx].email = trimmedEmail;
    }

    users[idx].lastActiveAt = new Date().toISOString();
    this.saveUsersRegistry(users);

    if (this.activeUser && this.activeUser.id === userId) {
      this.activeUser = this.sanitizeUser(users[idx]);
      this.setSession(this.activeUser, true);
    }

    this.notify('PROFILE_UPDATED', this.activeUser);
    return this.activeUser;
  }

  /**
   * Change Password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found.');

    const user = users[idx];
    const checkHash = await hashPassword(currentPassword, user.salt);
    if (checkHash !== user.passwordHash) {
      throw new Error('Current password is incorrect.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const newSalt = Math.random().toString(36).substr(2, 16);
    user.salt = newSalt;
    user.passwordHash = await hashPassword(newPassword, newSalt);

    this.saveUsersRegistry(users);
    this.notify('PASSWORD_CHANGED', { userId });
    return true;
  }

  /**
   * Delete User Account & associated state data
   */
  deleteAccount(userId) {
    let users = this.getAllUsers();
    users = users.filter(u => u.id !== userId);
    this.saveUsersRegistry(users);

    // Remove user scoped database from storage
    try {
      localStorage.removeItem(`chronolog_user_${userId}_db`);
      localStorage.removeItem(`chronolog_user_${userId}_backup`);
    } catch (e) {
      console.warn('Failed to clear user data on delete:', e);
    }

    if (this.activeUser && this.activeUser.id === userId) {
      this.logout();
    }

    this.notify('ACCOUNT_DELETED', { userId });
  }

  /**
   * Sign Out
   */
  logout() {
    const previousUser = this.activeUser;
    this.clearSession();
    this.notify('LOGOUT', { previousUser });
  }

  // --------------------------------------------------------------------------
  // GETTERS & HELPERS
  // --------------------------------------------------------------------------
  getActiveUser() {
    return this.activeUser;
  }

  isLoggedIn() {
    return !!this.activeUser;
  }

  isGuest() {
    return this.activeUser ? !!this.activeUser.isGuest : false;
  }

  getUserStorageKey() {
    if (!this.activeUser) return 'chronolog_bullet_journal_db';
    if (this.activeUser.isGuest) return STORAGE_GUEST_KEY;
    return `chronolog_user_${this.activeUser.id}_db`;
  }
}

export const authManager = new AuthManager();
