/* ==========================================================================
   CHRONOLOG // GOOGLE CALENDAR ALERTS & REMINDERS SYNCHRONIZATION ENGINE
   ========================================================================== */

import { state } from './state.js';
import { showToast, sound, escapeHtml } from './utils.js';

const STORAGE_GCAL_CONFIG_KEY = 'chronolog_gcal_config';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// Map JS day indices (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat) to iCal / RRULE days
const RRULE_DAYS_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

class GoogleCalendarManager {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.isGisLoaded = false;
    this.config = this.loadConfig();
    this.isSyncing = false;
    this.listeners = [];
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_GCAL_CONFIG_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load Google Calendar config:', e);
    }
    return {
      clientId: '',
      defaultMinutesBefore: 10,
      reminderType: 'popup', // 'popup' | 'email' | 'both'
      autoSyncOnCheck: false,
      lastSyncAllTimestamp: null
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_GCAL_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save Google Calendar config:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try {
        fn(this);
      } catch (err) {
        console.error('GCal listener error:', err);
      }
    });
  }

  // Dynamically load Google Identity Services SDK
  async loadGisScript() {
    if (this.isGisLoaded && window.google?.accounts?.oauth2) {
      return true;
    }

    if (window.google?.accounts?.oauth2) {
      this.isGisLoaded = true;
      return true;
    }

    return new Promise((resolve) => {
      // Check if already in DOM
      const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => {
          this.isGisLoaded = true;
          resolve(true);
        });
        existing.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isGisLoaded = true;
        resolve(true);
      };
      script.onerror = (err) => {
        console.warn('Failed to load Google Identity Services SDK script:', err);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  // Request OAuth 2.0 Access Token via Google Identity Services
  async requestAccessToken(forcePrompt = false) {
    // Check if current token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000 && !forcePrompt) {
      return this.accessToken;
    }

    const clientId = (this.config.clientId || '').trim();
    if (!clientId) {
      // If user has not configured a Client ID, we fall back to direct web URL or prompt configuration
      return null;
    }

    const loaded = await this.loadGisScript();
    if (!loaded || !window.google?.accounts?.oauth2) {
      console.warn('Google Identity Services library unavailable.');
      return null;
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response) => {
            if (response && response.access_token) {
              this.accessToken = response.access_token;
              const expiresIn = (parseInt(response.expires_in, 10) || 3600) * 1000;
              this.tokenExpiresAt = Date.now() + expiresIn;
              this.notify();
              resolve(this.accessToken);
            } else if (response && response.error) {
              console.error('Google OAuth token error:', response.error);
              reject(new Error(response.error_description || response.error));
            } else {
              reject(new Error('Google authorization was cancelled or failed.'));
            }
          },
          error_callback: (err) => {
            console.error('Google Token Client init error:', err);
            reject(new Error(err.message || 'Google Auth Error'));
          }
        });

        this.tokenClient = client;
        client.requestAccessToken({ prompt: forcePrompt ? 'select_account' : '' });
      } catch (err) {
        console.error('OAuth token initiation error:', err);
        reject(err);
      }
    });
  }

  isAuthenticated() {
    return Boolean(this.accessToken && Date.now() < this.tokenExpiresAt);
  }

  disconnect() {
    if (this.accessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log('Google Access Token revoked.');
        });
      } catch (e) {
        // Ignore revocation errors
      }
    }
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.notify();
    showToast('Disconnected from Google Calendar', 'ℹ️');
  }

  // --------------------------------------------------------------------------
  // EVENT BUILDERS & RRULE FORMATTING
  // --------------------------------------------------------------------------
  buildRecurrenceRule(habit) {
    if (!habit) return 'RRULE:FREQ=DAILY';
    if (habit.frequencyType === 'daily') {
      return 'RRULE:FREQ=DAILY';
    }
    if (habit.frequencyType === 'specific_days' && Array.isArray(habit.specificDays) && habit.specificDays.length > 0) {
      const days = habit.specificDays
        .filter(d => d >= 0 && d <= 6)
        .map(d => RRULE_DAYS_MAP[d])
        .join(',');
      return `RRULE:FREQ=WEEKLY;BYDAY=${days || 'MO,WE,FR'}`;
    }
    if (habit.frequencyType === 'weekly_target') {
      return 'RRULE:FREQ=DAILY';
    }
    return 'RRULE:FREQ=DAILY';
  }

  formatEventStartDateTime(timeStr = '08:00') {
    const [hStr, mStr] = (timeStr || '08:00').split(':');
    const hours = parseInt(hStr, 10) || 8;
    const minutes = parseInt(mStr, 10) || 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());

    const startIso = `${year}-${month}-${day}T${hh}:${mm}:00`;
    
    // End time: 15 minutes later
    const endDate = new Date(date.getTime() + 15 * 60 * 1000);
    const endHh = pad(endDate.getHours());
    const endMm = pad(endDate.getMinutes());
    const endIso = `${year}-${month}-${day}T${endHh}:${endMm}:00`;

    // Local time formatted for Google Calendar URL (YYYYMMDDTHHMMSS)
    const urlStart = `${year}${month}${day}T${hh}${mm}00`;
    const urlEnd = `${year}${month}${day}T${endHh}${endMm}00`;

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    return { startIso, endIso, urlStart, urlEnd, timeZone };
  }

  buildEventPayload(habit) {
    const timeStr = habit.reminderTime || '08:00';
    const { startIso, endIso, timeZone } = this.formatEventStartDateTime(timeStr);
    const rrule = this.buildRecurrenceRule(habit);
    const reminderMins = habit.reminderMinutesBefore !== undefined ? habit.reminderMinutesBefore : (this.config.defaultMinutesBefore || 10);
    const scheduleLabel = state.getHabitScheduleLabel(habit);
    const checkXP = state.getHabitCheckXP(habit);

    const description = [
      `🎯 Habit: ${habit.name}`,
      `📂 Category: ${habit.category || 'General'}`,
      `⚡ Frequency: ${scheduleLabel}`,
      `✨ Daily Discipline XP: +${checkXP} XP`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Tracked & Synchronized with ChronoLog // Bullet Journal Habit OS`,
      `Open ChronoLog to check off today's habits and maintain your streak!`
    ].join('\n');

    const overrides = [];
    if (this.config.reminderType === 'both') {
      overrides.push({ method: 'popup', minutes: reminderMins });
      overrides.push({ method: 'email', minutes: Math.max(30, reminderMins * 2) });
    } else if (this.config.reminderType === 'email') {
      overrides.push({ method: 'email', minutes: reminderMins });
    } else {
      overrides.push({ method: 'popup', minutes: reminderMins });
    }

    return {
      summary: `${habit.icon || '⭐'} ${habit.name} - Habit Alert`,
      description,
      start: {
        dateTime: `${startIso}`,
        timeZone
      },
      end: {
        dateTime: `${endIso}`,
        timeZone
      },
      recurrence: [rrule],
      reminders: {
        useDefault: false,
        overrides
      }
    };
  }

  // --------------------------------------------------------------------------
  // 1-CLICK INSTANT WEB CALENDAR URL GENERATOR
  // --------------------------------------------------------------------------
  generateGoogleCalendarWebUrl(habit) {
    const timeStr = habit.reminderTime || '08:00';
    const { urlStart, urlEnd } = this.formatEventStartDateTime(timeStr);
    const rrule = this.buildRecurrenceRule(habit);
    const scheduleLabel = state.getHabitScheduleLabel(habit);
    const checkXP = state.getHabitCheckXP(habit);

    const title = `${habit.icon || '⭐'} ${habit.name} - Habit Alert`;
    const details = [
      `🎯 Habit: ${habit.name}`,
      `📂 Category: ${habit.category || 'General'}`,
      `⚡ Frequency: ${scheduleLabel}`,
      `✨ Discipline XP: +${checkXP} XP`,
      `\nTracked in ChronoLog Bullet Journal Habit Tracker.`
    ].join('\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${urlStart}/${urlEnd}`,
      details: details,
      recur: rrule
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  openGoogleCalendarWebEvent(habit) {
    const url = this.generateGoogleCalendarWebUrl(habit);
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`Opening Google Calendar for "${habit.name}"...`, '📅');
  }

  // --------------------------------------------------------------------------
  // DIRECT GOOGLE CALENDAR REST API SYNC
  // --------------------------------------------------------------------------
  async syncHabitToGoogleCalendar(habit, token = null) {
    if (!habit) return { success: false, error: 'Habit not found' };

    let authToken = token || this.accessToken;
    if (!authToken && this.config.clientId) {
      try {
        authToken = await this.requestAccessToken();
      } catch (e) {
        return { success: false, error: e.message || 'Authorization failed' };
      }
    }

    if (!authToken) {
      // Fallback to web link if no API auth configured
      this.openGoogleCalendarWebEvent(habit);
      state.updateHabit(habit.id, {
        lastSyncedAt: new Date().toISOString()
      });
      return { success: true, mode: 'web_link', habitId: habit.id };
    }

    const payload = this.buildEventPayload(habit);
    const eventId = habit.calendarEventId;

    try {
      let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      let method = 'POST';

      if (eventId) {
        url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
        method = 'PATCH';
      }

      let response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // If patching existing event failed with 404/410, create a new event
      if (!response.ok && (response.status === 404 || response.status === 410) && eventId) {
        response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `API error ${response.status}`;
        throw new Error(errMsg);
      }

      const eventData = await response.json();
      const updatedEventId = eventData.id;
      const nowIso = new Date().toISOString();

      // Update state
      state.updateHabit(habit.id, {
        calendarEventId: updatedEventId,
        lastSyncedAt: nowIso
      });

      return {
        success: true,
        mode: 'api',
        habitId: habit.id,
        eventId: updatedEventId,
        htmlLink: eventData.htmlLink
      };
    } catch (err) {
      console.error(`Failed to sync habit ${habit.name} with Google Calendar:`, err);
      return { success: false, error: err.message, habitId: habit.id };
    }
  }

  // Sync ALL active habits
  async syncAllEnabledHabits() {
    if (this.isSyncing) return { success: false, message: 'Sync already in progress' };

    const habitsToSync = state.getActiveHabits();

    if (habitsToSync.length === 0) {
      showToast('No active habits available to sync.', '⚠️', 4000);
      return { success: false, count: 0, message: 'No habits available' };
    }

    this.isSyncing = true;
    this.notify();

    let authToken = this.accessToken;
    if (!authToken && this.config.clientId) {
      try {
        authToken = await this.requestAccessToken();
      } catch (err) {
        this.isSyncing = false;
        this.notify();
        showToast('Google Authorization cancelled or failed: ' + err.message, '⚠️');
        return { success: false, error: err.message };
      }
    }

    // If no Client ID configured, prompt web sync or download .ics package
    if (!authToken) {
      this.isSyncing = false;
      this.notify();
      return {
        success: true,
        mode: 'unauthenticated',
        count: habitsToSync.length,
        habits: habitsToSync
      };
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    showToast(`Syncing ${habitsToSync.length} habits with Google Calendar...`, '🔄', 2000);

    for (const habit of habitsToSync) {
      const res = await this.syncHabitToGoogleCalendar(habit, authToken);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        errors.push({ habit: habit.name, error: res.error });
      }
    }

    this.isSyncing = false;
    this.saveConfig({ lastSyncAllTimestamp: new Date().toISOString() });
    this.notify();

    if (successCount > 0) {
      sound.playCheck();
      showToast(`Successfully synchronized ${successCount} habit reminder(s) to Google Calendar!`, '🎉', 4000);
    } else {
      showToast(`Calendar sync encountered errors: ${errors[0]?.error || 'Unknown error'}`, '⚠️', 4000);
    }

    return {
      success: successCount > 0,
      total: habitsToSync.length,
      successCount,
      failCount,
      errors
    };
  }

  // --------------------------------------------------------------------------
  // ICALENDAR (.ICS) FILE GENERATION FOR DIRECT CALENDAR IMPORT
  // --------------------------------------------------------------------------
  exportHabitsToICS(habitsToExport = null) {
    const habits = habitsToExport || state.getActiveHabits();
    if (!habits || habits.length === 0) {
      showToast('No active habits available for Calendar Export.', '⚠️');
      return;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ChronoLog//Bullet Journal Habit Tracker//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ChronoLog Habit Reminders',
      'X-WR-TIMEZONE:' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    ];

    habits.forEach((h, index) => {
      const timeStr = h.reminderTime || '08:00';
      const [hh, mm] = timeStr.split(':').map(n => parseInt(n, 10) || 0);
      
      const eventDate = new Date();
      eventDate.setHours(hh, mm, 0, 0);
      const endDate = new Date(eventDate.getTime() + 15 * 60 * 1000);

      const dtStart = `${eventDate.getFullYear()}${pad(eventDate.getMonth() + 1)}${pad(eventDate.getDate())}T${pad(eventDate.getHours())}${pad(eventDate.getMinutes())}00`;
      const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

      const rrule = this.buildRecurrenceRule(h);
      const reminderMins = h.reminderMinutesBefore || this.config.defaultMinutesBefore || 10;
      const uid = `chronolog-habit-${h.id}-${Date.now()}-${index}@chronolog.app`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${dtStamp}`);
      icsContent.push(`DTSTART:${dtStart}`);
      icsContent.push(`DTEND:${dtEnd}`);
      icsContent.push(`${rrule}`);
      icsContent.push(`SUMMARY:${h.icon || '⭐'} ${h.name} - Habit Alert`);
      icsContent.push(`DESCRIPTION:Habit: ${h.name}\\nCategory: ${h.category || 'General'}\\nFrequency: ${state.getHabitScheduleLabel(h)}\\nDiscipline XP: +${state.getHabitCheckXP(h)} XP\\nTracked in ChronoLog Habit OS.`);
      icsContent.push('STATUS:CONFIRMED');

      // VALARM for Calendar notifications
      icsContent.push('BEGIN:VALARM');
      icsContent.push('ACTION:DISPLAY');
      icsContent.push(`DESCRIPTION:Time for habit: ${h.name}!`);
      icsContent.push(`TRIGGER:-PT${reminderMins}M`);
      icsContent.push('END:VALARM');

      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronolog_habit_alerts_${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded .ICS calendar file for ${habits.length} habit(s)! Import directly into Google Calendar.`, '📥', 4000);
  }
}

export const googleCalendar = new GoogleCalendarManager();
