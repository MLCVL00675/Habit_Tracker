/* ==========================================================================
   CHRONOLOG // AUTHENTICATION & USER PROFILE MODAL COMPONENT
   ========================================================================== */

import { authManager, AVATAR_PRESETS } from '../auth.js';
import { state } from '../state.js';
import { sound, showToast, triggerConfetti, escapeHtml } from '../utils.js';
import { showConfirmDialog } from './confirmModal.js';

let selectedRegisterAvatar = '⚡';
let selectedEditAvatar = '⚡';

/**
 * Initialize all Auth and Profile UI event listeners
 */
export function initAuthUI() {
  renderAuthModal();
  renderProfileDrawer();
  renderEditProfileModal();
  updateHeaderUserPill();

  // Listen to auth state changes to update the UI
  authManager.subscribe((event, data, activeUser) => {
    updateHeaderUserPill();
    renderProfileDrawer();
    renderAuthModal();
  });
}

/**
 * Update the Top-Right User Pill in Header
 */
export function updateHeaderUserPill() {
  const container = document.getElementById('header-user-pill-container');
  if (!container) return;

  const activeUser = authManager.getActiveUser();
  const gamification = state.getGamificationOverview();

  if (!activeUser || activeUser.isGuest) {
    const isGuest = activeUser && activeUser.isGuest;
    container.innerHTML = `
      <button id="header-auth-btn" class="header-user-btn guest-mode" title="${isGuest ? 'Guest Mode · Click to manage account or sign in' : 'Sign in to save your habits'}">
        <div class="user-avatar-badge">${isGuest ? activeUser.avatar : '👤'}</div>
        <div class="user-pill-meta">
          <span class="user-pill-name">${isGuest ? escapeHtml(activeUser.name) : 'Sign In'}</span>
          <span class="user-pill-tag ${isGuest ? 'guest-tag' : 'offline-tag'}">${isGuest ? 'Guest' : 'Local'}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="user-dropdown-arrow"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    `;

    const btn = document.getElementById('header-auth-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (isGuest) {
          openProfileDrawer();
        } else {
          showAuthModal('signin');
        }
      });
    }
  } else {
    // Authenticated User
    container.innerHTML = `
      <button id="header-user-profile-btn" class="header-user-btn authenticated" title="Signed in as ${escapeHtml(activeUser.name)} · Click for Profile & Accounts">
        <div class="user-avatar-badge glow-ring">${escapeHtml(activeUser.avatar || '⚡')}</div>
        <div class="user-pill-meta">
          <span class="user-pill-name">${escapeHtml(activeUser.name)}</span>
          <span class="user-pill-tag level-tag">Lv. ${gamification.level}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="user-dropdown-arrow"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    `;

    const btn = document.getElementById('header-user-profile-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        openProfileDrawer();
      });
    }
  }
}

/**
 * Show the Auth Modal on a specific tab
 * @param {'signin' | 'register' | 'switch' | 'guest'} tab
 */
export function showAuthModal(tab = 'signin') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  renderAuthModal();
  switchAuthTab(tab);
  modal.classList.remove('hidden');
  sound.playClick();
}

/**
 * Close Auth Modal
 */
export function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Switch Tab inside Auth Modal
 */
function switchAuthTab(tabId) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  modal.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  modal.querySelectorAll('.auth-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `auth-pane-${tabId}`);
  });
}

/**
 * Render the HTML inside Auth Modal
 */
function renderAuthModal() {
  const modalBody = document.getElementById('auth-modal-content');
  if (!modalBody) return;

  const users = authManager.getAllUsers();
  const hasMultipleUsers = users.length > 0;
  const isGuest = authManager.isGuest();

  modalBody.innerHTML = `
    <!-- Modal Header -->
    <div class="modal-header auth-header">
      <div class="auth-brand-badge">
        <span class="auth-brand-icon">⚡</span>
        <div class="auth-brand-text">
          <h3 class="modal-title">ChronoLog Account Hub</h3>
          <span class="modal-subtitle">Secure personal habit tracking & cloud persistence</span>
        </div>
      </div>
      <button class="modal-close-btn" id="auth-modal-close-btn" aria-label="Close modal">&times;</button>
    </div>

    <!-- Auth Tabs Navigation -->
    <div class="auth-nav-tabs">
      <button class="auth-tab-btn active" data-tab="signin">
        <span>🔑 Sign In</span>
      </button>
      <button class="auth-tab-btn" data-tab="register">
        <span>✨ Create Account</span>
      </button>
      ${hasMultipleUsers ? `
        <button class="auth-tab-btn" data-tab="switch">
          <span>🔄 Switch (${users.length})</span>
        </button>
      ` : ''}
      <button class="auth-tab-btn" data-tab="guest">
        <span>⚡ Guest Mode</span>
      </button>
    </div>

    <!-- Auth Tab Panes -->
    <div class="auth-panes-wrapper">
      
      <!-- TAB 1: SIGN IN -->
      <div id="auth-pane-signin" class="auth-tab-pane active">
        <form id="auth-signin-form" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="signin-identifier">Email or Username</label>
            <div class="input-with-icon">
              <span class="input-icon">👤</span>
              <input type="text" id="signin-identifier" class="form-input" placeholder="e.g. pavan or pavan@gmail.com" required autocomplete="username" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="signin-password">Password</label>
            <div class="input-with-icon">
              <span class="input-icon">🔒</span>
              <input type="password" id="signin-password" class="form-input" placeholder="••••••••" required autocomplete="current-password" />
              <button type="button" class="password-toggle-btn" data-target="signin-password" title="Toggle password visibility">👁️</button>
            </div>
          </div>

          <div class="form-row-checkbox">
            <label class="custom-checkbox-label">
              <input type="checkbox" id="signin-remember" checked />
              <span class="checkbox-box"></span>
              <span class="checkbox-text">Keep me signed in on this device</span>
            </label>
          </div>

          <div id="signin-error-box" class="auth-error-box hidden"></div>

          <button type="submit" id="signin-submit-btn" class="btn-primary auth-submit-btn">
            <span>Sign In to Habit Matrix</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div class="auth-footer-prompt">
            <span>New to ChronoLog?</span>
            <button type="button" class="btn-link-action" id="goto-register-btn">Create your free account</button>
          </div>
        </form>
      </div>

      <!-- TAB 2: CREATE ACCOUNT -->
      <div id="auth-pane-register" class="auth-tab-pane">
        <form id="auth-register-form" class="auth-form">
          <div class="form-row-grid">
            <div class="form-group">
              <label class="form-label" for="register-name">Full Name</label>
              <div class="input-with-icon">
                <span class="input-icon">🏷️</span>
                <input type="text" id="register-name" class="form-input" placeholder="Pavan Kumar" required autocomplete="name" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="register-username">Username</label>
              <div class="input-with-icon">
                <span class="input-icon">@</span>
                <input type="text" id="register-username" class="form-input" placeholder="pavan26" required autocomplete="username" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="register-email">Email Address</label>
            <div class="input-with-icon">
              <span class="input-icon">✉️</span>
              <input type="email" id="register-email" class="form-input" placeholder="pavan@example.com" required autocomplete="email" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="register-password">Create Password (min. 6 characters)</label>
            <div class="input-with-icon">
              <span class="input-icon">🔑</span>
              <input type="password" id="register-password" class="form-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" />
              <button type="button" class="password-toggle-btn" data-target="register-password" title="Toggle password visibility">👁️</button>
            </div>
            <!-- Password Strength Bar -->
            <div class="password-strength-container">
              <div class="strength-bar-track">
                <div id="register-strength-bar" class="strength-bar-fill strength-empty"></div>
              </div>
              <span id="register-strength-label" class="strength-label">Enter password</span>
            </div>
          </div>

          <!-- Avatar Picker -->
          <div class="form-group">
            <label class="form-label">Choose Your Profile Avatar</label>
            <div class="avatar-picker-grid" id="register-avatar-grid">
              ${AVATAR_PRESETS.map(av => `
                <button type="button" class="avatar-pick-btn ${av.icon === selectedRegisterAvatar ? 'selected' : ''}" data-avatar="${av.icon}" title="${av.name}">
                  <span class="avatar-emoji">${av.icon}</span>
                </button>
              `).join('')}
            </div>
          </div>

          ${isGuest ? `
            <div class="guest-migration-notice">
              <span class="notice-icon">💡</span>
              <span class="notice-text">Your current guest habits & streaks will automatically transfer to this new account!</span>
            </div>
          ` : ''}

          <div id="register-error-box" class="auth-error-box hidden"></div>

          <button type="submit" id="register-submit-btn" class="btn-primary auth-submit-btn">
            <span>Create Account & Start Tracking</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div class="auth-footer-prompt">
            <span>Already have an account?</span>
            <button type="button" class="btn-link-action" id="goto-signin-btn">Sign in instead</button>
          </div>
        </form>
      </div>

      <!-- TAB 3: SWITCH ACCOUNT -->
      <div id="auth-pane-switch" class="auth-tab-pane">
        <div class="accounts-switcher-view">
          <p class="switch-section-desc">Select an account saved on this browser to switch instantly:</p>
          <div class="saved-accounts-list">
            ${users.map(u => {
              const isCurrent = authManager.getActiveUser() && authManager.getActiveUser().id === u.id;
              const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : 'Recently';
              return `
                <div class="saved-account-card ${isCurrent ? 'current-active' : ''}">
                  <div class="account-card-left">
                    <div class="account-card-avatar">${escapeHtml(u.avatar || '⚡')}</div>
                    <div class="account-card-info">
                      <div class="account-card-name-row">
                        <span class="account-card-name">${escapeHtml(u.name)}</span>
                        ${isCurrent ? '<span class="current-pill">Active</span>' : ''}
                      </div>
                      <span class="account-card-handle">@${escapeHtml(u.username || u.email)} · ${lastActive}</span>
                    </div>
                  </div>
                  <div class="account-card-actions">
                    ${!isCurrent ? `
                      <button class="btn-secondary-sm switch-user-btn" data-user-id="${u.id}">Switch</button>
                    ` : `
                      <span class="active-check-badge">✓ Active</span>
                    `}
                    <button class="btn-icon-danger remove-user-btn" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}" title="Remove account from device">🗑️</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="switch-footer-actions">
            <button class="btn-ghost-sm" id="switch-add-account-btn">+ Add Another Account</button>
          </div>
        </div>
      </div>

      <!-- TAB 4: GUEST MODE -->
      <div id="auth-pane-guest" class="auth-tab-pane">
        <div class="guest-mode-cards-grid">
          <div class="guest-card">
            <div class="guest-card-icon">⚡</div>
            <div class="guest-card-content">
              <h4>Fresh Blank Workspace</h4>
              <p>Start logging your September 2026 daily habits and goals immediately without entering any password or email.</p>
            </div>
            <button id="start-guest-clean-btn" class="btn-secondary auth-guest-btn">Start as Guest</button>
          </div>

          <div class="guest-card highlight">
            <div class="guest-card-icon">🚀</div>
            <div class="guest-card-content">
              <h4>Load Interactive August 2026 Demo</h4>
              <p>Explore pre-filled habit logs, study records, streaks, heatmaps, and gamification tiers to test all features.</p>
            </div>
            <button id="start-guest-demo-btn" class="btn-primary auth-guest-btn">Explore Demo Workspace</button>
          </div>
        </div>

        <div class="guest-info-banner">
          <span class="banner-icon">🛡️</span>
          <span>Guest data is stored securely in your browser and can be converted into a permanent registered account at any time!</span>
        </div>
      </div>

    </div>
  `;

  // Attach event listeners inside auth modal
  attachAuthModalListeners();
}

/**
 * Event Listeners for Auth Modal Elements
 */
function attachAuthModalListeners() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  // Close Modal
  const closeBtn = document.getElementById('auth-modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }

  // Tab Switching
  modal.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchAuthTab(tab);
      sound.playClick();
    });
  });

  // Footer Prompts
  const gotoRegister = document.getElementById('goto-register-btn');
  if (gotoRegister) {
    gotoRegister.addEventListener('click', () => switchAuthTab('register'));
  }
  const gotoSignin = document.getElementById('goto-signin-btn');
  if (gotoSignin) {
    gotoSignin.addEventListener('click', () => switchAuthTab('signin'));
  }
  const switchAddBtn = document.getElementById('switch-add-account-btn');
  if (switchAddBtn) {
    switchAddBtn.addEventListener('click', () => switchAuthTab('register'));
  }

  // Password Visibility Toggles
  modal.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁️';
      }
    });
  });

  // Register Password Strength Meter
  const regPasswordInput = document.getElementById('register-password');
  const strengthBar = document.getElementById('register-strength-bar');
  const strengthLabel = document.getElementById('register-strength-label');

  if (regPasswordInput && strengthBar && strengthLabel) {
    regPasswordInput.addEventListener('input', () => {
      const val = regPasswordInput.value;
      if (!val) {
        strengthBar.className = 'strength-bar-fill strength-empty';
        strengthLabel.textContent = 'Enter password';
        return;
      }

      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score <= 2) {
        strengthBar.className = 'strength-bar-fill strength-weak';
        strengthLabel.textContent = 'Weak password';
      } else if (score <= 3) {
        strengthBar.className = 'strength-bar-fill strength-medium';
        strengthLabel.textContent = 'Medium strength';
      } else {
        strengthBar.className = 'strength-bar-fill strength-strong';
        strengthLabel.textContent = 'Strong password 🔥';
      }
    });
  }

  // Register Avatar Selection
  modal.querySelectorAll('#register-avatar-grid .avatar-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRegisterAvatar = btn.getAttribute('data-avatar');
      modal.querySelectorAll('#register-avatar-grid .avatar-pick-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      sound.playClick();
    });
  });

  // SIGN IN SUBMISSION
  const signinForm = document.getElementById('auth-signin-form');
  const signinError = document.getElementById('signin-error-box');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      signinError.classList.add('hidden');
      const submitBtn = document.getElementById('signin-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verifying...</span>`;

      const identifier = document.getElementById('signin-identifier').value.trim();
      const password = document.getElementById('signin-password').value;
      const rememberMe = document.getElementById('signin-remember').checked;

      try {
        const user = await authManager.login({ identifier, password, rememberMe });
        closeAuthModal();
        triggerConfetti('normal');
        showToast(`Welcome back, ${user.name}!`, '🎉');
        sound.playLevelUp();
      } catch (err) {
        signinError.textContent = err.message || 'Login failed. Please check your credentials.';
        signinError.classList.remove('hidden');
        sound.playError();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In to Habit Matrix</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      }
    });
  }

  // CREATE ACCOUNT SUBMISSION
  const registerForm = document.getElementById('auth-register-form');
  const registerError = document.getElementById('register-error-box');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      registerError.classList.add('hidden');
      const submitBtn = document.getElementById('register-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Creating Account...</span>`;

      const name = document.getElementById('register-name').value.trim();
      const username = document.getElementById('register-username').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;

      try {
        let user;
        if (authManager.isGuest()) {
          user = await authManager.convertGuestToAccount({
            name,
            username,
            email,
            password,
            avatar: selectedRegisterAvatar
          });
        } else {
          user = await authManager.register({
            name,
            username,
            email,
            password,
            avatar: selectedRegisterAvatar
          });
        }

        closeAuthModal();
        triggerConfetti('epic');
        showToast(`Account created! Welcome, ${user.name}!`, '👑');
        sound.playLevelUp();
      } catch (err) {
        registerError.textContent = err.message || 'Registration failed.';
        registerError.classList.remove('hidden');
        sound.playError();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Create Account & Start Tracking</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      }
    });
  }

  // GUEST ACTIONS
  const cleanGuestBtn = document.getElementById('start-guest-clean-btn');
  if (cleanGuestBtn) {
    cleanGuestBtn.addEventListener('click', () => {
      authManager.loginAsGuest({ sampleData: false });
      closeAuthModal();
      showToast('Started Guest Session (September 2026)', '⚡');
    });
  }

  const demoGuestBtn = document.getElementById('start-guest-demo-btn');
  if (demoGuestBtn) {
    demoGuestBtn.addEventListener('click', () => {
      authManager.loginAsGuest({ sampleData: true });
      state.loadSampleAugust2026();
      closeAuthModal();
      showToast('Loaded August 2026 Demo as Guest!', '🚀');
    });
  }

  // SWITCH ACCOUNT BUTTONS
  modal.querySelectorAll('.switch-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.getAttribute('data-user-id');
      try {
        const user = authManager.switchAccount(userId);
        closeAuthModal();
        showToast(`Switched to ${user.name}`, '🔄');
        sound.playClick();
      } catch (err) {
        showToast(err.message, '⚠️');
      }
    });
  });

  // REMOVE SAVED USER
  modal.querySelectorAll('.remove-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.getAttribute('data-user-id');
      const userName = btn.getAttribute('data-user-name');

      showConfirmDialog({
        title: 'Remove Account from Browser',
        message: `Are you sure you want to remove <strong>"${userName}"</strong> from this browser? Your logs and data on this device will be erased.`,
        badge: 'Account Deletion',
        variant: 'danger',
        confirmText: 'Yes, Remove Account',
        onConfirm: () => {
          authManager.deleteAccount(userId);
          renderAuthModal();
          showToast(`Account removed`, '🗑️');
        }
      });
    });
  });
}

/**
 * Render the User Profile Drawer / Hub
 */
export function renderProfileDrawer() {
  const drawer = document.getElementById('profile-drawer-content');
  if (!drawer) return;

  const activeUser = authManager.getActiveUser();
  const isGuest = !activeUser || activeUser.isGuest;
  const gamification = state.getGamificationOverview();
  const habits = state.getHabits();
  const allUsers = authManager.getAllUsers();

  drawer.innerHTML = `
    <!-- Drawer Header -->
    <div class="profile-drawer-header">
      <div class="drawer-user-card">
        <div class="drawer-avatar-wrap">
          <span class="drawer-avatar-emoji">${escapeHtml(activeUser ? activeUser.avatar : '👤')}</span>
          <span class="drawer-level-badge">Lv. ${gamification.level}</span>
        </div>
        <div class="drawer-user-meta">
          <h3 class="drawer-user-name">${escapeHtml(activeUser ? activeUser.name : 'Guest Explorer')}</h3>
          <span class="drawer-user-handle">${isGuest ? '⚡ Unregistered Guest' : `@${escapeHtml(activeUser.username || activeUser.email)}`}</span>
          <span class="drawer-rank-tag">${gamification.title}</span>
        </div>
      </div>
      <button class="drawer-close-btn" id="profile-drawer-close-btn" aria-label="Close drawer">&times;</button>
    </div>

    <!-- XP Progress Bar -->
    <div class="drawer-xp-card">
      <div class="drawer-xp-labels">
        <span>Level Progression</span>
        <span class="xp-val">${gamification.xpInLevel} / ${gamification.levelRange} XP (${gamification.progressPct}%)</span>
      </div>
      <div class="drawer-xp-track">
        <div class="drawer-xp-fill" style="width: ${gamification.progressPct}%"></div>
      </div>
    </div>

    <!-- Active Database Engine Status -->
    <div class="drawer-db-status-card">
      <div class="db-status-left">
        <span class="db-pulse-dot"></span>
        <div class="db-status-meta">
          <span class="db-status-title">IndexedDB Engine</span>
          <span class="db-status-sub">High-capacity persistent client database</span>
        </div>
      </div>
      <span class="db-badge-connected">● Active</span>
    </div>

    <!-- Quick Stats Grid -->
    <div class="drawer-stats-grid">
      <div class="drawer-stat-card">
        <span class="stat-icon">📓</span>
        <span class="stat-num">${habits.length}</span>
        <span class="stat-lbl">Habits Tracked</span>
      </div>
      <div class="drawer-stat-card">
        <span class="stat-icon">✨</span>
        <span class="stat-num">${gamification.totalHabitsDone}</span>
        <span class="stat-lbl">Checks Done</span>
      </div>
      <div class="drawer-stat-card">
        <span class="stat-icon">🌟</span>
        <span class="stat-num">${gamification.perfectDays}</span>
        <span class="stat-lbl">Perfect Days</span>
      </div>
      <div class="drawer-stat-card">
        <span class="stat-icon">🏆</span>
        <span class="stat-num">${gamification.unlockedBadgesXP} XP</span>
        <span class="stat-lbl">Badges XP</span>
      </div>
    </div>

    ${isGuest ? `
      <!-- Guest Upgrade Banner -->
      <div class="drawer-guest-banner">
        <div class="banner-title">🔒 Protect Your Habit Data</div>
        <p class="banner-desc">Create a free account to keep your streaks permanently and switch devices seamlessly.</p>
        <button id="drawer-upgrade-account-btn" class="btn-primary-sm" style="width: 100%;">Create Account & Save Data</button>
      </div>
    ` : ''}

    <!-- Drawer Actions List -->
    <div class="drawer-actions-list">
      ${!isGuest ? `
        <button class="drawer-action-btn" id="drawer-edit-profile-btn">
          <span class="action-icon">✏️</span>
          <div class="action-text">
            <strong>Edit Profile & Avatar</strong>
            <small>Update display name, avatar emoji, or password</small>
          </div>
        </button>
      ` : ''}

      <button class="drawer-action-btn" id="drawer-switch-account-btn">
        <span class="action-icon">🔄</span>
        <div class="action-text">
          <strong>Switch / Manage Accounts</strong>
          <small>${allUsers.length} saved account${allUsers.length === 1 ? '' : 's'} on this device</small>
        </div>
      </button>

      <button class="drawer-action-btn" id="drawer-export-sync-btn">
        <span class="action-icon">💾</span>
        <div class="action-text">
          <strong>Backup & Export Data</strong>
          <small>Download JSON backup or transfer data</small>
        </div>
      </button>

      <button class="drawer-action-btn danger" id="drawer-signout-btn">
        <span class="action-icon">🚪</span>
        <div class="action-text">
          <strong>${isGuest ? 'Leave Guest Mode' : 'Sign Out'}</strong>
          <small>End current session</small>
        </div>
      </button>
    </div>
  `;

  attachProfileDrawerListeners();
}

/**
 * Event Listeners for Profile Drawer
 */
function attachProfileDrawerListeners() {
  const drawerClose = document.getElementById('profile-drawer-close-btn');
  if (drawerClose) {
    drawerClose.addEventListener('click', closeProfileDrawer);
  }

  const upgradeBtn = document.getElementById('drawer-upgrade-account-btn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      closeProfileDrawer();
      showAuthModal('register');
    });
  }

  const editProfileBtn = document.getElementById('drawer-edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      closeProfileDrawer();
      openEditProfileModal();
    });
  }

  const switchAccountBtn = document.getElementById('drawer-switch-account-btn');
  if (switchAccountBtn) {
    switchAccountBtn.addEventListener('click', () => {
      closeProfileDrawer();
      showAuthModal('switch');
    });
  }

  const exportBtn = document.getElementById('drawer-export-sync-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      closeProfileDrawer();
      const dataModal = document.getElementById('data-modal');
      if (dataModal) dataModal.classList.remove('hidden');
    });
  }

  const signoutBtn = document.getElementById('drawer-signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      closeProfileDrawer();
      const activeUser = authManager.getActiveUser();
      const isGuest = !activeUser || activeUser.isGuest;

      showConfirmDialog({
        title: isGuest ? 'Leave Guest Session?' : 'Sign Out of ChronoLog',
        message: isGuest 
          ? 'Are you sure you want to end your guest session? Any unexported guest data may be cleared.'
          : 'Are you sure you want to sign out? Your habit data is safely saved in your account.',
        badge: 'Session',
        variant: 'info',
        confirmText: isGuest ? 'End Guest Session' : 'Sign Out',
        onConfirm: () => {
          authManager.logout();
          showAuthModal('signin');
          showToast('Signed out successfully', '👋');
        }
      });
    });
  }
}

export function openProfileDrawer() {
  const drawer = document.getElementById('profile-drawer');
  if (drawer) {
    renderProfileDrawer();
    drawer.classList.remove('hidden');
    sound.playClick();
  }
}

export function closeProfileDrawer() {
  const drawer = document.getElementById('profile-drawer');
  if (drawer) drawer.classList.add('hidden');
}

/**
 * Render Edit Profile Modal
 */
function renderEditProfileModal() {
  const modalContent = document.getElementById('edit-profile-modal-content');
  if (!modalContent) return;

  const activeUser = authManager.getActiveUser();
  if (!activeUser) return;

  selectedEditAvatar = activeUser.avatar || '⚡';

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-title-group">
        <h3 class="modal-title">Edit Profile Settings</h3>
        <span class="modal-subtitle">Update your personal display name and avatar</span>
      </div>
      <button class="modal-close-btn" id="edit-profile-close-btn" aria-label="Close modal">&times;</button>
    </div>

    <div class="modal-body">
      <form id="edit-profile-form" class="auth-form">
        <div class="form-group">
          <label class="form-label" for="edit-profile-name">Display Name</label>
          <input type="text" id="edit-profile-name" class="form-input" value="${escapeHtml(activeUser.name)}" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-profile-email">Email Address</label>
          <input type="email" id="edit-profile-email" class="form-input" value="${escapeHtml(activeUser.email || '')}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Select Profile Avatar</label>
          <div class="avatar-picker-grid" id="edit-avatar-grid">
            ${AVATAR_PRESETS.map(av => `
              <button type="button" class="avatar-pick-btn ${av.icon === selectedEditAvatar ? 'selected' : ''}" data-avatar="${av.icon}" title="${av.name}">
                <span class="avatar-emoji">${av.icon}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Password Change Section (Collapsible) -->
        <div class="collapsible-section">
          <button type="button" id="toggle-password-change-btn" class="btn-ghost-sm" style="width: 100%; text-align: left; justify-content: space-between;">
            <span>🔒 Change Password</span>
            <span id="pw-collapse-arrow">▼</span>
          </button>
          <div id="password-change-fields" class="hidden" style="margin-top: 12px; padding: 12px; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div class="form-group">
              <label class="form-label" for="edit-current-pw">Current Password</label>
              <input type="password" id="edit-current-pw" class="form-input" placeholder="Current password" />
            </div>
            <div class="form-group">
              <label class="form-label" for="edit-new-pw">New Password (min 6 chars)</label>
              <input type="password" id="edit-new-pw" class="form-input" placeholder="New password" />
            </div>
          </div>
        </div>

        <div id="edit-profile-error" class="auth-error-box hidden"></div>
      </form>
    </div>

    <div class="modal-footer">
      <button class="btn-ghost" id="edit-profile-cancel-btn">Cancel</button>
      <button class="btn-primary" id="save-profile-btn">Save Changes</button>
    </div>
  `;

  attachEditProfileListeners();
}

function attachEditProfileListeners() {
  const closeBtn = document.getElementById('edit-profile-close-btn');
  const cancelBtn = document.getElementById('edit-profile-cancel-btn');
  const saveBtn = document.getElementById('save-profile-btn');
  const togglePw = document.getElementById('toggle-password-change-btn');
  const pwFields = document.getElementById('password-change-fields');
  const errorBox = document.getElementById('edit-profile-error');
  const editModal = document.getElementById('edit-profile-modal');

  if (closeBtn) closeBtn.addEventListener('click', closeEditProfileModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEditProfileModal);

  if (togglePw && pwFields) {
    togglePw.addEventListener('click', () => {
      pwFields.classList.toggle('hidden');
      const arrow = document.getElementById('pw-collapse-arrow');
      if (arrow) arrow.textContent = pwFields.classList.contains('hidden') ? '▼' : '▲';
    });
  }

  // Avatar Selection in Edit Modal
  if (editModal) {
    editModal.querySelectorAll('#edit-avatar-grid .avatar-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedEditAvatar = btn.getAttribute('data-avatar');
        editModal.querySelectorAll('#edit-avatar-grid .avatar-pick-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        sound.playClick();
      });
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      errorBox.classList.add('hidden');
      const nameInput = document.getElementById('edit-profile-name');
      const emailInput = document.getElementById('edit-profile-email');
      const currentPw = document.getElementById('edit-current-pw')?.value;
      const newPw = document.getElementById('edit-new-pw')?.value;

      const activeUser = authManager.getActiveUser();
      if (!activeUser) return;

      try {
        await authManager.updateProfile(activeUser.id, {
          name: nameInput.value,
          email: emailInput.value,
          avatar: selectedEditAvatar
        });

        // Handle password change if filled
        if (currentPw && newPw) {
          await authManager.changePassword(activeUser.id, currentPw, newPw);
          showToast('Password updated successfully!', '🔑');
        }

        closeEditProfileModal();
        updateHeaderUserPill();
        showToast('Profile updated!', '✨');
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
        sound.playError();
      }
    });
  }
}

export function openEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) {
    renderEditProfileModal();
    modal.classList.remove('hidden');
    sound.playClick();
  }
}

export function closeEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.add('hidden');
}
