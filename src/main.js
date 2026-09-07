/* ==========================================================================
   CHRONOLOG // APPLICATION ENTRY POINT & ROUTER
   ========================================================================== */

import { state } from './js/state.js';
import { MONTH_NAMES, getDaysInMonth, getDayOfWeek, WEEKDAYS_SHORT, showToast, triggerConfetti } from './js/utils.js';
import { renderMatrixTable } from './js/components/grid.js';
import { renderStreaksView } from './js/components/streaks.js';
import { renderGoalsView } from './js/components/goals.js';
import { renderCalendarView } from './js/components/calendar.js';
import { renderAnalyticsView } from './js/components/analytics.js';
import { renderGamificationView } from './js/components/gamification.js';
import { renderHabitsManagerView } from './js/components/habitsManager.js';
import { showConfirmDialog } from './js/components/confirmModal.js';

// Active Tab tracker
let activeTab = 'grid-tab';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  state.init();

  // Subscribe UI renders to state changes
  state.subscribe(() => {
    updateHeaderMonthInfo();
    renderActiveView();
  });

  // Setup Event Listeners
  initNavigationControls();
  initTabSwitching();
  initHeaderControls();
  initModalHandlers();
  initDataExportImport();
  initFilterControls();

  // Initial Full Render
  updateHeaderMonthInfo();
  renderAllViews();

  // Lifecycle Auto-Save Hooks (ensures data is flushed to localStorage on tab close, reload, or backgrounding)
  window.addEventListener('beforeunload', () => state.saveToStorage());
  window.addEventListener('pagehide', () => state.saveToStorage());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') state.saveToStorage();
  });
});

// Update Top Month Header Display
function updateHeaderMonthInfo() {
  const label = document.getElementById('current-month-label');
  const daysBadge = document.getElementById('month-days-count');
  if (label) {
    label.textContent = `${MONTH_NAMES[state.currentMonth - 1]} ${state.currentYear}`;
  }
  if (daysBadge) {
    const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
    const now = new Date();
    const isThisMonth = (now.getFullYear() === state.currentYear && (now.getMonth() + 1) === state.currentMonth);
    if (isThisMonth) {
      daysBadge.innerHTML = `<span class="live-today-pulse"></span> ${totalDays} Days · Today: ${MONTH_NAMES[now.getMonth()].slice(0, 3)} ${now.getDate()}`;
    } else {
      daysBadge.textContent = `${totalDays} Days`;
    }
  }
}

// Render Active View
function renderActiveView() {
  if (activeTab === 'grid-tab') {
    renderMatrixTable();
  } else if (activeTab === 'streaks-tab') {
    renderStreaksView();
  } else if (activeTab === 'goals-tab') {
    renderGoalsView();
  } else if (activeTab === 'calendar-tab') {
    renderCalendarView();
  } else if (activeTab === 'analytics-tab') {
    renderAnalyticsView();
  } else if (activeTab === 'gamification-tab') {
    renderGamificationView();
  } else if (activeTab === 'habits-tab') {
    renderHabitsManagerView();
  }

  // Always update global header stats and badges
  renderGamificationView();
  renderGoalsView();
}

function renderAllViews() {
  renderMatrixTable();
  renderStreaksView();
  renderGoalsView();
  renderCalendarView();
  renderAnalyticsView();
  renderGamificationView();
  renderHabitsManagerView();
}

// --------------------------------------------------------------------------
// MONTH NAVIGATION CONTROLS
// --------------------------------------------------------------------------
function initNavigationControls() {
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  const resetBtn = document.getElementById('reset-month-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => state.prevMonth());
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => state.nextMonth());
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.resetToSeptember2026();
      showToast('Jumped to September 2026', '📅');
    });
  }
}

// --------------------------------------------------------------------------
// TAB SWITCHING
// --------------------------------------------------------------------------
function initTabSwitching() {
  const tabButtons = document.querySelectorAll('.main-tabs-nav .tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      if (!targetTabId) return;

      activeTab = targetTabId;

      // Update button active states
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update pane active states
      tabPanes.forEach(pane => {
        if (pane.id === targetTabId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      // Render the newly activated tab
      renderActiveView();
    });
  });

  // Gamification header pill jumps directly to Gamification Tab
  const pill = document.getElementById('gamification-summary-pill');
  if (pill) {
    pill.addEventListener('click', () => {
      const gameTabBtn = document.querySelector('.tab-btn[data-tab="gamification-tab"]');
      if (gameTabBtn) gameTabBtn.click();
    });
  }

  // Global streak badge jumps directly to Streaks Tab
  const streakBadge = document.querySelector('.global-streak-badge');
  if (streakBadge) {
    streakBadge.style.cursor = 'pointer';
    streakBadge.title = 'View Streaks & Habits Hub';
    streakBadge.addEventListener('click', () => {
      const streaksTabBtn = document.querySelector('.tab-btn[data-tab="streaks-tab"]');
      if (streaksTabBtn) streaksTabBtn.click();
    });
  }
}

// --------------------------------------------------------------------------
// HEADER CONTROLS (Sound, Theme, Quick Log)
// --------------------------------------------------------------------------
function initHeaderControls() {
  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const quickFillBtn = document.getElementById('quick-fill-today-btn');

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const isEnabled = state.toggleSound();
      if (soundIcon) soundIcon.textContent = isEnabled ? '🔊' : '🔇';
      showToast(isEnabled ? 'Sound Effects Enabled' : 'Sound Effects Muted', isEnabled ? '🔊' : '🔇');
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const newTheme = state.toggleTheme();
      if (themeIcon) themeIcon.textContent = newTheme === 'dark' ? '🌙' : '📜';
      showToast(newTheme === 'dark' ? 'Switched to Obsidian Dark' : 'Switched to Dot-Grid Paper Theme', '🎨');
    });
  }

  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', () => {
      const today = new Date();
      const targetYear = today.getFullYear();
      const targetMonth = today.getMonth() + 1;
      const targetDay = today.getDate();

      // If viewing another month, jump to today's month first
      if (state.currentYear !== targetYear || state.currentMonth !== targetMonth) {
        state.setMonth(targetYear, targetMonth);
      }

      // Switch to grid tab first if not already active
      const gridTabBtn = document.querySelector('.tab-btn[data-tab="grid-tab"]');
      if (gridTabBtn) gridTabBtn.click();

      setTimeout(() => {
        const row = document.querySelector(`tr[data-day="${targetDay}"]`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('row-today-focus-pulse');
          setTimeout(() => { row.classList.remove('row-today-focus-pulse'); }, 2500);
          showToast(`Focused on Today (${MONTH_NAMES[targetMonth - 1]} ${targetDay})!`, '⚡');
        }
      }, 120);
    });
  }
}

// --------------------------------------------------------------------------
// MODAL HANDLERS
// --------------------------------------------------------------------------
function initModalHandlers() {
  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('hidden');
    });
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add('hidden');
      }
    });
  });

  // Data Modal Trigger
  const exportImportBtn = document.getElementById('export-import-btn');
  const dataModal = document.getElementById('data-modal');
  if (exportImportBtn && dataModal) {
    exportImportBtn.addEventListener('click', () => {
      dataModal.classList.remove('hidden');
    });
  }
}

// --------------------------------------------------------------------------
// DATA EXPORT, IMPORT & SAMPLE DATA
// --------------------------------------------------------------------------
function initDataExportImport() {
  // 1. Export JSON
  const exportJsonBtn = document.getElementById('export-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const dataStr = JSON.stringify({
        habits: state.getHabits(),
        allMonthsData: state.allMonthsData
      }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Chronolog_HabitTracker_Backup_${state.currentYear}_${state.currentMonth}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded JSON Backup File', '📥');
    });
  }

  // 2. Export CSV
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportCurrentMonthToCsv();
    });
  }

  // 3. Import JSON
  const triggerImportBtn = document.getElementById('trigger-import-btn');
  const fileInput = document.getElementById('import-json-input');
  if (triggerImportBtn && fileInput) {
    triggerImportBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (typeof parsed === 'object') {
            if (Array.isArray(parsed.habits)) {
              state.habits = parsed.habits;
            }
            if (parsed.allMonthsData) {
              state.allMonthsData = parsed.allMonthsData;
            } else {
              state.allMonthsData = parsed;
            }
            state.saveToStorage();
            state.notify();
            triggerConfetti('normal');
            showToast('Backup Restored Successfully!', '🎉');
            const dataModal = document.getElementById('data-modal');
            if (dataModal) dataModal.classList.add('hidden');
          }
        } catch (err) {
          showToast('Invalid JSON Backup File', '❌');
        }
      };
      reader.readAsText(file);
    });
  }

  // 4. Load Sample August 2026 Data
  const loadSampleBtn = document.getElementById('load-sample-data-btn');
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      state.loadSampleAugust2026();
      const dataModal = document.getElementById('data-modal');
      if (dataModal) dataModal.classList.add('hidden');
    });
  }

  // 5. Clear Month Data
  const resetMonthBtn = document.getElementById('reset-month-data-btn');
  if (resetMonthBtn) {
    resetMonthBtn.addEventListener('click', async () => {
      const monthName = MONTH_NAMES[state.currentMonth - 1];
      const confirmed = await showConfirmDialog({
        title: 'Reset Month Data',
        badge: 'Danger Zone',
        message: `Are you sure you want to reset all habit logs, daily times, and checkmarks for <strong>${monthName} ${state.currentYear}</strong>?`,
        warningNote: 'This will reset all daily records for the current month to blank. Your habit configurations and other months remain completely safe.',
        confirmText: 'Reset Month Data',
        cancelText: 'Cancel',
        confirmIcon: '⚠️',
        variant: 'danger',
        icon: '⚠️'
      });

      if (confirmed) {
        state.clearCurrentMonth();
        const dataModal = document.getElementById('data-modal');
        if (dataModal) dataModal.classList.add('hidden');
      }
    });
  }

  // 6. Wipe Entire Database (Start September 2026)
  const clearAllDbBtn = document.getElementById('clear-all-db-btn');
  if (clearAllDbBtn) {
    clearAllDbBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: 'Wipe Database & Start Fresh',
        badge: 'Critical Action',
        message: 'Are you sure you want to <strong>clear all database records</strong> and start completely fresh from <strong>September 2026</strong>?',
        warningNote: 'This will reset all months, logs, streaks, and XP to zero. You will start with a brand new, clean September 2026 journal.',
        confirmText: 'Wipe & Start September',
        cancelText: 'Cancel',
        confirmIcon: '🧹',
        variant: 'danger',
        icon: '⚠️'
      });

      if (confirmed) {
        state.clearEntireDatabase(2026, 9);
        const dataModal = document.getElementById('data-modal');
        if (dataModal) dataModal.classList.add('hidden');
      }
    });
  }
}

// CSV Export Generator
function exportCurrentMonthToCsv() {
  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
  const monthName = MONTH_NAMES[state.currentMonth - 1];

  const habitHeaders = habits.map(h => `"${h.name}"`).join(',');
  let csv = `Date,Day,Wake Up,Sleep Time,Study Time,Screen Time,Calories In,Calories Burned,${habitHeaders},Progress %\n`;

  for (let d = 1; d <= totalDays; d++) {
    const dayOfWeekIdx = getDayOfWeek(state.currentYear, state.currentMonth, d);
    const dayRecord = monthData.days[d] || { habits: {} };

    let done = 0;
    const habitCols = habits.map(h => {
      const s = dayRecord.habits ? dayRecord.habits[h.id] : 'none';
      if (s === 'done') { done++; return 'Done'; }
      if (s === 'missed') return 'Missed';
      return 'Blank';
    }).join(',');

    const divisor = habits.length || 1;
    const pct = Math.round((done / divisor) * 100);

    csv += `${d},${WEEKDAYS_SHORT[dayOfWeekIdx]},"${dayRecord.wakeTime || ''}","${dayRecord.sleepTime || ''}","${dayRecord.studyTime || ''}","${dayRecord.screenTime || ''}","${dayRecord.caloriesIn || ''}","${dayRecord.caloriesBurned || ''}",${habitCols},${pct}%\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Chronolog_${monthName}_${state.currentYear}_Habit_Matrix.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported Month to CSV', '📊');
}

// --------------------------------------------------------------------------
// QUICK FILTER CONTROLS
// --------------------------------------------------------------------------
function initFilterControls() {
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.getAttribute('data-filter');
      state.setFilterMode(filter);
    });
  });
}
