/* ==========================================================================
   CHRONOLOG // GOOGLE CALENDAR SYNCHRONIZATION & ALERTS MODAL COMPONENT
   ========================================================================== */

import { state } from '../state.js';
import { googleCalendar } from '../googleCalendar.js';
import { escapeHtml, showToast, sound } from '../utils.js';

let modalElement = null;

export function initGoogleCalendarModal() {
  modalElement = document.getElementById('gcal-modal');
  if (!modalElement) {
    createModalInDOM();
  }
  setupEventListeners();

  // Subscribe to state & gcal updates to re-render if modal is open
  state.subscribe(() => {
    if (modalElement && !modalElement.classList.contains('hidden')) {
      renderModalContent();
    }
    updateGridSyncButtonBadge();
  });

  googleCalendar.subscribe(() => {
    if (modalElement && !modalElement.classList.contains('hidden')) {
      renderModalContent();
    }
    updateGridSyncButtonBadge();
  });

  updateGridSyncButtonBadge();
}

function createModalInDOM() {
  modalElement = document.createElement('div');
  modalElement.id = 'gcal-modal';
  modalElement.className = 'modal-backdrop hidden';
  modalElement.setAttribute('role', 'dialog');
  modalElement.setAttribute('aria-modal', 'true');
  modalElement.setAttribute('aria-labelledby', 'gcal-modal-title');

  modalElement.innerHTML = `
    <div class="modal-card gcal-modal-card">
      <div class="modal-header gcal-modal-header">
        <div class="modal-title-group">
          <div class="gcal-title-row">
            <div class="gcal-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" fill="#4285F4" />
                <path d="M3 9H21" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 2V5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                <path d="M16 2V5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                <circle cx="8" cy="14" r="1.5" fill="#ffffff" />
                <circle cx="12" cy="14" r="1.5" fill="#ffffff" />
                <circle cx="16" cy="14" r="1.5" fill="#ffffff" />
                <circle cx="8" cy="18" r="1.5" fill="#ffffff" />
                <circle cx="12" cy="18" r="1.5" fill="#ffffff" />
                <circle cx="16" cy="18" r="1.5" fill="#34A853" />
              </svg>
            </div>
            <h3 id="gcal-modal-title" class="modal-title">Google Calendar Alerts & Reminders</h3>
          </div>
          <span class="modal-subtitle">Schedule recurring daily popup alarms & sync enabled habits to Google Calendar</span>
        </div>
        <button class="modal-close-btn" id="close-gcal-modal-btn" aria-label="Close modal">&times;</button>
      </div>

      <div class="modal-body gcal-modal-body" id="gcal-modal-body">
        <!-- Content rendered dynamically -->
      </div>

      <div class="modal-footer gcal-modal-footer">
        <button class="btn-ghost" id="gcal-footer-close-btn">Close</button>
        <button class="btn-secondary-sm" id="gcal-export-ics-btn" title="Download standard iCalendar file with alarms for Google Calendar or Apple Calendar">
          📥 Download .ICS File
        </button>
        <button class="btn-primary gcal-primary-sync-btn" id="gcal-sync-all-btn">
          <span>🔄</span> Sync All Enabled Habits
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalElement);
}

export function showGoogleCalendarModal() {
  if (!modalElement) {
    initGoogleCalendarModal();
  }
  renderModalContent();
  modalElement.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

export function hideGoogleCalendarModal() {
  if (modalElement) {
    modalElement.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }
}

export function updateGridSyncButtonBadge() {
  const badge = document.getElementById('gcal-header-badge');
  const topBtn = document.getElementById('sync-google-calendar-btn');
  const enabledHabits = state.getGoogleCalendarEnabledHabits();
  const count = enabledHabits.length;

  if (badge) {
    badge.textContent = `${count}`;
    badge.className = `gcal-count-badge ${count > 0 ? 'badge-active' : 'badge-zero'}`;
  }

  if (topBtn) {
    topBtn.setAttribute('title', count > 0 
      ? `Google Calendar: ${count} habit(s) enabled for automatic alerts & sync`
      : 'Google Calendar: Click to configure reminder alerts & sync habits'
    );
  }
}

function renderModalContent() {
  const container = document.getElementById('gcal-modal-body');
  if (!container) return;

  const habits = state.getHabits();
  const enabledHabits = state.getGoogleCalendarEnabledHabits();
  const config = googleCalendar.config;
  const isAuth = googleCalendar.isAuthenticated();
  const isSyncing = googleCalendar.isSyncing;

  const lastSyncStr = config.lastSyncAllTimestamp 
    ? new Date(config.lastSyncAllTimestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

  const habitRowsHtml = habits.map(h => {
    const isEnabled = Boolean(h.googleCalendarEnabled);
    const timeVal = h.reminderTime || '08:00';
    const scheduleLabel = state.getHabitScheduleLabel(h);
    const lastSyncTime = h.lastSyncedAt 
      ? new Date(h.lastSyncedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
      : null;

    return `
      <div class="gcal-habit-item ${isEnabled ? 'item-enabled' : 'item-disabled'}" data-habit-id="${h.id}">
        <div class="gcal-habit-left">
          <label class="gcal-custom-checkbox-wrap" title="${isEnabled ? 'Disable Calendar Alert' : 'Enable Calendar Alert'}">
            <input type="checkbox" class="gcal-habit-toggle-check" data-habit-id="${h.id}" ${isEnabled ? 'checked' : ''} />
            <span class="gcal-custom-checkbox-mark"></span>
          </label>
          <div class="gcal-habit-icon">${h.icon || '⭐'}</div>
          <div class="gcal-habit-info">
            <div class="gcal-habit-name-line">
              <span class="gcal-habit-name">${escapeHtml(h.name)}</span>
              ${lastSyncTime ? `<span class="gcal-sync-pill" title="Last synced on ${lastSyncTime}">✓ Synced</span>` : ''}
            </div>
            <span class="gcal-habit-sub">${escapeHtml(h.category || 'General')} · ${escapeHtml(scheduleLabel)}</span>
          </div>
        </div>

        <div class="gcal-habit-right">
          <div class="gcal-time-picker-wrap" title="Set daily reminder alert time">
            <span class="gcal-time-icon">⏰</span>
            <input type="time" class="gcal-time-input" data-habit-id="${h.id}" value="${timeVal}" />
          </div>

          <button class="btn-gcal-single-sync" data-habit-id="${h.id}" title="Sync or open event in Google Calendar">
            <span>📅</span> Add
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Top Sync Status & Metrics Banner -->
    <div class="gcal-status-hero">
      <div class="gcal-status-stats">
        <div class="gcal-stat-box">
          <span class="gcal-stat-num">${enabledHabits.length} / ${habits.length}</span>
          <span class="gcal-stat-label">Alerts Enabled</span>
        </div>
        <div class="gcal-stat-box">
          <span class="gcal-stat-num">${isAuth ? 'Connected 🟢' : (config.clientId ? 'Ready 🟡' : 'Web / ICS ⚡')}</span>
          <span class="gcal-stat-label">Google Sync Mode</span>
        </div>
        <div class="gcal-stat-box">
          <span class="gcal-stat-num">${lastSyncStr}</span>
          <span class="gcal-stat-label">Last Batch Sync</span>
        </div>
      </div>

      <div class="gcal-status-info-note">
        <span>💡 <strong>Tip:</strong> Habits with checkmarks will receive calendar alerts. Select the exact reminder time for each habit and click <strong>Sync All</strong> or <strong>Add</strong>.</span>
      </div>
    </div>

    <!-- Quick Action Bar -->
    <div class="gcal-batch-controls-bar">
      <div class="gcal-quick-toggle-group">
        <button class="btn-ghost-sm" id="gcal-select-all-btn">Enable All (${habits.length})</button>
        <button class="btn-ghost-sm" id="gcal-deselect-all-btn">Disable All</button>
      </div>
      <div class="gcal-web-direct-link-wrap">
        <button class="btn-ghost-sm" id="gcal-open-web-calendar-btn" title="Open Google Calendar in new tab">
          ↗ Open Google Calendar
        </button>
      </div>
    </div>

    <!-- Habits List with Individual Time & Sync Pickers -->
    <div class="gcal-habits-list-container">
      <div class="gcal-list-header">
        <span>HABIT & SCHEDULE</span>
        <span>REMINDER TIME & ACTION</span>
      </div>
      <div class="gcal-habits-scroll-list">
        ${habitRowsHtml}
      </div>
    </div>

    <!-- Collapsible Advanced API & Notification Settings -->
    <details class="gcal-settings-accordion">
      <summary class="gcal-settings-summary">
        <span>⚙️ Advanced Google Calendar OAuth & Notification Settings</span>
        <span class="accordion-arrow">▼</span>
      </summary>
      <div class="gcal-settings-body">
        <div class="form-group">
          <label class="form-label" for="gcal-client-id-input">
            Google Cloud OAuth 2.0 Client ID (Optional for direct silent API sync)
          </label>
          <div class="input-with-action">
            <input type="text" id="gcal-client-id-input" class="form-input" 
                   placeholder="e.g. 123456789-abcdefgh.apps.googleusercontent.com" 
                   value="${escapeHtml(config.clientId || '')}" />
            <button id="gcal-save-client-id-btn" class="btn-secondary-sm">Save</button>
          </div>
          <small class="form-help-text">
            Leave blank to use instant 1-click Google Calendar web links and .ICS downloads. 
            Or enter your own OAuth 2.0 Web Client ID from Google Cloud Console for seamless in-app 1-click direct Calendar API sync.
          </small>
        </div>

        <div class="form-row-2col">
          <div class="form-group">
            <label class="form-label" for="gcal-default-lead-time">Default Alert Lead Time</label>
            <select id="gcal-default-lead-time" class="form-select">
              <option value="0" ${config.defaultMinutesBefore === 0 ? 'selected' : ''}>At time of event</option>
              <option value="5" ${config.defaultMinutesBefore === 5 ? 'selected' : ''}>5 minutes before</option>
              <option value="10" ${config.defaultMinutesBefore === 10 ? 'selected' : ''}>10 minutes before</option>
              <option value="15" ${config.defaultMinutesBefore === 15 ? 'selected' : ''}>15 minutes before</option>
              <option value="30" ${config.defaultMinutesBefore === 30 ? 'selected' : ''}>30 minutes before</option>
              <option value="60" ${config.defaultMinutesBefore === 60 ? 'selected' : ''}>1 hour before</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="gcal-reminder-type">Notification Type</label>
            <select id="gcal-reminder-type" class="form-select">
              <option value="popup" ${config.reminderType === 'popup' ? 'selected' : ''}>Popup Notification Alarm</option>
              <option value="email" ${config.reminderType === 'email' ? 'selected' : ''}>Email Alert</option>
              <option value="both" ${config.reminderType === 'both' ? 'selected' : ''}>Both Popup & Email</option>
            </select>
          </div>
        </div>

        ${isAuth ? `
          <div class="gcal-auth-status-box auth-connected">
            <span>🟢 Connected to Google Account</span>
            <button id="gcal-disconnect-btn" class="btn-danger-sm">Disconnect</button>
          </div>
        ` : (config.clientId ? `
          <div class="gcal-auth-status-box">
            <span>🟡 Ready to authorize with Google</span>
            <button id="gcal-connect-btn" class="btn-secondary-sm">Sign in with Google</button>
          </div>
        ` : '')}
      </div>
    </details>
  `;

  // Attach dynamic event handlers inside modal
  attachModalInnerListeners();
}

function setupEventListeners() {
  if (!modalElement) return;

  // Close handlers
  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement || e.target.id === 'close-gcal-modal-btn' || e.target.id === 'gcal-footer-close-btn') {
      hideGoogleCalendarModal();
    }
  });

  // Export .ICS file button
  const exportBtn = document.getElementById('gcal-export-ics-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const enabledHabits = state.getGoogleCalendarEnabledHabits();
      if (enabledHabits.length === 0) {
        showToast('Please enable at least one habit for Google Calendar first!', '⚠️');
        return;
      }
      googleCalendar.exportHabitsToICS(enabledHabits);
    });
  }

  // Sync All button in modal footer
  const syncAllBtn = document.getElementById('gcal-sync-all-btn');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', async () => {
      syncAllBtn.disabled = true;
      syncAllBtn.innerHTML = `<span>⏳</span> Syncing...`;
      try {
        const result = await googleCalendar.syncAllEnabledHabits();
        if (result && result.mode === 'unauthenticated' && result.count > 0) {
          // Open each or download ICS
          googleCalendar.exportHabitsToICS(result.habits);
          showToast(`Prepared .ICS file and opening first habit in Google Calendar...`, '📅');
          if (result.habits[0]) {
            googleCalendar.openGoogleCalendarWebEvent(result.habits[0]);
          }
        }
      } catch (err) {
        showToast('Sync failed: ' + err.message, '⚠️');
      } finally {
        syncAllBtn.disabled = false;
        syncAllBtn.innerHTML = `<span>🔄</span> Sync All Enabled Habits`;
      }
    });
  }
}

function attachModalInnerListeners() {
  const container = document.getElementById('gcal-modal-body');
  if (!container) return;

  // Toggle habit checkbox
  container.querySelectorAll('.gcal-habit-toggle-check').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const habitId = e.target.getAttribute('data-habit-id');
      const checked = e.target.checked;
      state.setHabitGoogleCalendarEnabled(habitId, checked);
    });
  });

  // Change reminder time input
  container.querySelectorAll('.gcal-time-input').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const habitId = e.target.getAttribute('data-habit-id');
      const timeVal = e.target.value;
      if (timeVal) {
        state.setHabitReminderTime(habitId, timeVal);
        showToast(`Reminder time set to ${timeVal}`, '⏰', 2000);
      }
    });
  });

  // Single sync / add button
  container.querySelectorAll('.btn-gcal-single-sync').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const habitId = btn.getAttribute('data-habit-id');
      const habit = state.getHabit(habitId);
      if (!habit) return;

      // Automatically enable G-Cal for this habit if not already enabled
      if (!habit.googleCalendarEnabled) {
        state.setHabitGoogleCalendarEnabled(habitId, true);
      }

      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span>`;

      try {
        await googleCalendar.syncHabitToGoogleCalendar(habit);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>📅</span> Add`;
      }
    });
  });

  // Enable all habits button
  const selectAllBtn = container.querySelector('#gcal-select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      state.getHabits().forEach(h => {
        h.googleCalendarEnabled = true;
      });
      state.saveToStorage();
      state.notify();
      showToast('All habits enabled for Google Calendar alerts!', '📅');
    });
  }

  // Disable all habits button
  const deselectAllBtn = container.querySelector('#gcal-deselect-all-btn');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      state.getHabits().forEach(h => {
        h.googleCalendarEnabled = false;
      });
      state.saveToStorage();
      state.notify();
      showToast('All Google Calendar alerts disabled', 'ℹ️');
    });
  }

  // Open Google Calendar Web directly
  const openWebBtn = container.querySelector('#gcal-open-web-calendar-btn');
  if (openWebBtn) {
    openWebBtn.addEventListener('click', () => {
      window.open('https://calendar.google.com', '_blank', 'noopener,noreferrer');
    });
  }

  // Save Client ID button
  const saveClientBtn = container.querySelector('#gcal-save-client-id-btn');
  const clientIdInp = container.querySelector('#gcal-client-id-input');
  if (saveClientBtn && clientIdInp) {
    saveClientBtn.addEventListener('click', () => {
      const clientId = clientIdInp.value.trim();
      googleCalendar.saveConfig({ clientId });
      showToast('Google Client ID saved!', '💾');
    });
  }

  // Default lead time selector
  const leadTimeSel = container.querySelector('#gcal-default-lead-time');
  if (leadTimeSel) {
    leadTimeSel.addEventListener('change', (e) => {
      const minutes = parseInt(e.target.value, 10) || 10;
      googleCalendar.saveConfig({ defaultMinutesBefore: minutes });
      showToast(`Default notification set to ${minutes} mins before`, '⏰');
    });
  }

  // Reminder type selector
  const typeSel = container.querySelector('#gcal-reminder-type');
  if (typeSel) {
    typeSel.addEventListener('change', (e) => {
      googleCalendar.saveConfig({ reminderType: e.target.value });
      showToast(`Notification style set to ${e.target.value}`, '🔔');
    });
  }

  // Connect Google button
  const connectBtn = container.querySelector('#gcal-connect-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        await googleCalendar.requestAccessToken(true);
        showToast('Connected to Google Calendar!', '🟢');
      } catch (err) {
        showToast('Google Auth failed: ' + err.message, '⚠️');
      }
    });
  }

  // Disconnect button
  const disconnectBtn = container.querySelector('#gcal-disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      googleCalendar.disconnect();
    });
  }
}
