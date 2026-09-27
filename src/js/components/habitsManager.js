/* ==========================================================================
   CHRONOLOG // HABITS MANAGER COMPONENT (CRUD, FREQUENCY & RETIREMENT STUDIO)
   ========================================================================== */

import { state } from '../state.js';
import { MONTH_NAMES, getDaysInMonth, sound, showToast, escapeHtml } from '../utils.js';
import { showConfirmDialog } from './confirmModal.js';

const PRESET_ICONS = [
  '📺', '💧', '⚡', '📖', '💊', '☀️', '✊', '📜', '📝', '✨', 
  '🏋️', '🙏', '🧘', '🏃', '💻', '🎯', '🍎', '🎨', '🌿', '🍵', 
  '💡', '🔥', '🏆', '⭐', '🧠', '🎧', '🥑', '🚴', '🏊', '🫖'
];

const PRESET_CATEGORIES = [
  'Mindset', 'Health', 'Discipline', 'Growth', 'Physical', 
  'Spiritual', 'Planning', 'Hygiene', 'Deep Work', 'General'
];

const WEEKDAY_NAMES = [
  { index: 0, label: 'Sun' },
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' }
];

let selectedNewIcon = '⭐';
let selectedEditIcon = '⭐';
let editingHabitId = null;
let retiringHabitId = null;
let habitsManagerTab = 'active'; // 'active' | 'retired'

// Helper to format YYYY-MM to readable month label (e.g. "October 2026")
function formatRetiredMonthLabel(monthKey) {
  if (!monthKey) return 'Current Month';
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Generate next 18 months options for the retirement month selector
function generateRetirementMonthOptions(selectedKey = null) {
  const options = [];
  const startYear = state.currentYear;
  const startMonth = state.currentMonth;

  // Include current month and next 17 months
  for (let i = 0; i < 18; i++) {
    let m = startMonth + i;
    let y = startYear;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const isCurrent = (y === state.currentYear && m === state.currentMonth);
    const isNext = (i === 1);
    let note = '';
    if (isCurrent) note = ' (Effective this month)';
    else if (isNext) note = ' (Effective next month)';

    const label = `${MONTH_NAMES[m - 1]} ${y}${note}`;
    const isSelected = selectedKey ? selectedKey === key : (i === 0);

    options.push({ key, label, isSelected });
  }

  // Also include selectedKey if it's in the past or not in the range
  if (selectedKey && !options.some(o => o.key === selectedKey)) {
    options.unshift({ key: selectedKey, label: formatRetiredMonthLabel(selectedKey), isSelected: true });
  }

  return options;
}

export function renderHabitsManagerView() {
  const container = document.getElementById('habits-tab');
  if (!container) return;

  const allHabits = state.getAllHabits();
  const activeHabits = state.getActiveHabits(state.currentYear, state.currentMonth);
  const retiredHabits = state.getRetiredHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  // Statistics calculation
  const totalHabits = allHabits.length;
  const dailyHabits = allHabits.filter(h => h.frequencyType === 'daily' && !h.retiredMonth).length;
  const weeklyTargetHabits = allHabits.filter(h => h.frequencyType === 'weekly_target' && !h.retiredMonth).length;
  const specificDaysHabits = allHabits.filter(h => h.frequencyType === 'specific_days' && !h.retiredMonth).length;

  const habitsToDisplay = habitsManagerTab === 'retired' ? retiredHabits : activeHabits;

  container.innerHTML = `
    <div class="habits-manager-layout">
      <!-- Top Banner & Stats Overview -->
      <div class="habits-hero-banner">
        <div class="habits-hero-left">
          <div class="habits-hero-icon">⚙️</div>
          <div class="habits-hero-text">
            <h2 class="section-title">Habit Configuration, Frequency & Lifecycle Studio</h2>
            <p class="section-subtitle">
              Add new habits, adjust schedules, or retire completed habits starting from any specific month while safely preserving all historical logs.
            </p>
          </div>
        </div>

        <div class="habits-stat-chips-group">
          <div class="habit-stat-chip">
            <span class="chip-num">${activeHabits.length}</span>
            <span class="chip-lbl">Active Habits</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-num" style="color:var(--accent-purple);">${retiredHabits.length}</span>
            <span class="chip-lbl">Retired</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-num" style="color:var(--accent-cyan);">${dailyHabits}</span>
            <span class="chip-lbl">Daily (7x)</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-num" style="color:var(--accent-gold);">${weeklyTargetHabits}</span>
            <span class="chip-lbl">Weekly Target</span>
          </div>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="habits-content-grid">
        <!-- Left Column: Add New Habit Creator Card -->
        <div class="habit-creator-card">
          <div class="card-title-group">
            <span class="card-icon">➕</span>
            <h3 class="card-title">Add New Custom Habit</h3>
          </div>
          <p class="card-desc">Define a habit and choose its target recurrence schedule.</p>

          <form id="add-habit-form" class="add-habit-form">
            <!-- Habit Name -->
            <div class="form-group">
              <label class="form-label" for="new-habit-name">Habit Name <span class="required">*</span></label>
              <input type="text" id="new-habit-name" class="form-input" placeholder="e.g. Cold Shower, Deep Work, Gym Workout..." required autocomplete="off" />
            </div>

            <!-- Icon Picker -->
            <div class="form-group">
              <label class="form-label">Habit Icon / Emoji</label>
              <div class="emoji-picker-container">
                <div class="emoji-picker-header">
                  <div class="selected-icon-preview" id="new-habit-icon-preview">
                    <span>${selectedNewIcon}</span>
                  </div>
                  <div class="custom-emoji-input-wrap">
                    <span class="custom-emoji-label">Selected / Custom:</span>
                    <input type="text" id="new-habit-custom-emoji" class="form-input custom-emoji-field" maxlength="4" placeholder="Emoji" value="${selectedNewIcon}" />
                  </div>
                </div>
                <div class="preset-emoji-grid">
                  ${PRESET_ICONS.map(ic => `
                    <button type="button" class="preset-icon-btn ${ic === selectedNewIcon ? 'selected' : ''}" data-icon="${ic}">${ic}</button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Category -->
            <div class="form-group">
              <label class="form-label" for="new-habit-category">Category</label>
              <div class="select-wrapper">
                <select id="new-habit-category" class="form-select">
                  ${PRESET_CATEGORIES.map(cat => `
                    <option value="${cat}">${cat}</option>
                  `).join('')}
                </select>
                <div class="select-arrow">▾</div>
              </div>
            </div>

            <!-- Frequency Type Selector -->
            <div class="form-group">
              <label class="form-label">Schedule & Recurrence Mode</label>
              <div class="frequency-mode-options">
                <label class="frequency-radio-label">
                  <input type="radio" name="new-frequency-type" value="daily" checked />
                  <div class="radio-card-content">
                    <div class="radio-card-top">
                      <span class="radio-icon">⚡</span>
                      <span class="radio-card-title">Daily Routine</span>
                    </div>
                    <span class="radio-card-subtitle">Every single day (7x / week)</span>
                  </div>
                </label>

                <label class="frequency-radio-label">
                  <input type="radio" name="new-frequency-type" value="weekly_target" />
                  <div class="radio-card-content">
                    <div class="radio-card-top">
                      <span class="radio-icon">🎯</span>
                      <span class="radio-card-title">Weekly Target</span>
                    </div>
                    <span class="radio-card-subtitle">Flexible quota (e.g. 2x, 3x, 4x / week)</span>
                  </div>
                </label>

                <label class="frequency-radio-label">
                  <input type="radio" name="new-frequency-type" value="specific_days" />
                  <div class="radio-card-content">
                    <div class="radio-card-top">
                      <span class="radio-icon">📅</span>
                      <span class="radio-card-title">Specific Days</span>
                    </div>
                    <span class="radio-card-subtitle">Designated weekdays (e.g. Mon, Wed, Fri)</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Weekly Target Controls (Visible only when weekly_target is selected) -->
            <div id="new-weekly-target-wrap" class="frequency-conditional-wrap hidden">
              <label class="form-label">Target Completions Per Week</label>
              <div class="stepper-pills">
                ${[1, 2, 3, 4, 5, 6].map(num => `
                  <button type="button" class="stepper-pill ${num === 4 ? 'active' : ''}" data-target="${num}">${num}x / wk</button>
                `).join('')}
              </div>
              <input type="hidden" id="new-habit-weekly-target" value="4" />
            </div>

            <!-- Specific Days Weekday Toggles (Visible only when specific_days is selected) -->
            <div id="new-specific-days-wrap" class="frequency-conditional-wrap hidden">
              <label class="form-label">Select Scheduled Days of Week</label>
              <div class="weekday-pills-row">
                ${WEEKDAY_NAMES.map(w => `
                  <button type="button" class="weekday-toggle-pill" data-day-index="${w.index}">${w.label}</button>
                `).join('')}
              </div>
              <span class="hint-text">Click to toggle the specific days this habit is scheduled.</span>
            </div>

            <!-- Reminder Time & Google Calendar Alert -->
            <div class="form-row-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="new-habit-reminder-time">⏰ Daily Reminder Time</label>
                <input type="time" id="new-habit-reminder-time" class="form-input" value="08:00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">📅 G-Cal Alert</label>
                <div class="gcal-toggle-inline" style="display: flex; align-items: center; gap: 8px; height: 38px;">
                  <label class="gcal-switch">
                    <input type="checkbox" id="new-habit-gcal-enabled" />
                    <span class="gcal-slider"></span>
                  </label>
                  <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Enable Sync</span>
                </div>
              </div>
            </div>

            <!-- Dynamic XP Commitment Preview -->
            <div class="frequency-xp-preview" id="new-xp-preview-box">
              <div class="xp-preview-header">
                <span class="xp-preview-icon">⚡</span>
                <span class="xp-preview-title">Discipline Reward Preview</span>
              </div>
              <div class="xp-preview-body" id="new-xp-preview-text">
                <strong>+10 XP</strong> per check · <strong>+60 XP</strong> Monthly Target Mastery Bonus (30 target days)
              </div>
            </div>

            <button type="submit" class="btn-primary" style="width: 100%; margin-top: 8px; padding: 12px; font-weight: 700;">
              <span>➕</span> Add Habit to Matrix
            </button>
          </form>
        </div>

        <!-- Right Column: Configured Habits List -->
        <div class="habits-list-card">
          <div class="habits-list-header">
            <div class="card-title-group">
              <span class="card-icon">📋</span>
              <h3 class="card-title">Configured Habits</h3>
            </div>
            <!-- Lifecycle Tab Filter (Active vs Retired) -->
            <div class="habits-tab-filter-bar">
              <button class="habits-tab-chip ${habitsManagerTab === 'active' ? 'active' : ''}" data-tab="active">
                Active Habits (${activeHabits.length})
              </button>
              <button class="habits-tab-chip ${habitsManagerTab === 'retired' ? 'active' : ''}" data-tab="retired">
                📦 Retired (${retiredHabits.length})
              </button>
            </div>
          </div>

          <div class="habits-items-scroll">
            <div class="habits-cards-stack" id="habits-cards-stack">
              ${habitsToDisplay.length > 0 ? habitsToDisplay.map((habit, index) => {
                const isRetired = Boolean(habit.retiredMonth);
                const targetDays = state.getHabitTargetDays(habit, state.currentYear, state.currentMonth);
                const scheduleLabel = state.getHabitScheduleLabel(habit);
                const checkXP = state.getHabitCheckXP(habit);
                const masteryBonusXP = state.getHabitMasteryBonusXP(habit);

                // Calculate month completed count
                let completedCount = 0;
                for (let d = 1; d <= totalDays; d++) {
                  if (monthData.days[d] && monthData.days[d].habits && monthData.days[d].habits[habit.id] === 'done') {
                    completedCount++;
                  }
                }
                const progressPct = targetDays > 0 ? Math.min(100, Math.round((completedCount / targetDays) * 100)) : 0;
                const isTargetReached = completedCount >= targetDays && targetDays > 0;

                return `
                  <div class="habit-manage-card ${isRetired ? 'card-retired' : ''}" data-habit-id="${habit.id}">
                    <div class="habit-card-left">
                      <!-- Reorder Buttons (only for active list) -->
                      ${!isRetired ? `
                        <div class="habit-reorder-group">
                          <button class="reorder-btn move-up-btn" data-index="${index}" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button>
                          <button class="reorder-btn move-down-btn" data-index="${index}" title="Move Down" ${index === activeHabits.length - 1 ? 'disabled' : ''}>▼</button>
                        </div>
                      ` : ''}

                      <!-- Icon & Info -->
                      <div class="habit-card-icon">${habit.icon}</div>
                      <div class="habit-card-info">
                        <div class="habit-card-title-row">
                          <span class="habit-card-name">${escapeHtml(habit.name)}</span>
                          <span class="habit-category-badge">${escapeHtml(habit.category || 'General')}</span>
                          ${isRetired ? `
                            <span class="habit-retired-tag" title="Retired starting ${formatRetiredMonthLabel(habit.retiredMonth)}">
                              📦 Retired (${formatRetiredMonthLabel(habit.retiredMonth)})
                            </span>
                          ` : `
                            <span class="habit-xp-pill" title="Earn +${checkXP} XP per check (+${masteryBonusXP} XP monthly bonus)">⚡ +${checkXP} XP</span>
                          `}
                        </div>
                        <div class="habit-card-schedule-row">
                          <span class="habit-frequency-pill frequency-${habit.frequencyType}">
                            ${habit.frequencyType === 'daily' ? '⚡' : (habit.frequencyType === 'weekly_target' ? '🎯' : '📅')} ${scheduleLabel}
                          </span>
                          <span class="habit-reminder-pill" title="Daily reminder alert time">
                            ⏰ ${habit.reminderTime || '08:00'}
                          </span>
                          ${habit.googleCalendarEnabled ? '<span class="habit-gcal-pill" title="Google Calendar alerts enabled">📅 G-Cal</span>' : ''}
                          ${!isRetired ? `
                            <span class="habit-target-counter">
                              Month Progress: <strong>${completedCount}/${targetDays} days</strong> (${progressPct}%)
                              ${isTargetReached ? ' <span class="target-star" title="Target Achieved! +Bonus XP">🎯 100%</span>' : ''}
                            </span>
                          ` : `
                            <span class="habit-target-counter" style="color: var(--text-muted);">
                              Historical data preserved in prior months.
                            </span>
                          `}
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="habit-card-actions">
                      ${isRetired ? `
                        <button class="btn-reactivate-habit reactivate-habit-btn" data-habit-id="${habit.id}" title="Reactivate this habit to active tracking">
                          <span>✨</span> Reactivate
                        </button>
                      ` : `
                        <button class="btn-retire-habit retire-habit-btn" data-habit-id="${habit.id}" title="Retire habit starting from a specific month">
                          <span>📦</span> Retire
                        </button>
                      `}
                      <button class="btn-icon edit-habit-btn" data-habit-id="${habit.id}" title="Edit Habit Settings">
                        ✏️
                      </button>
                      <button class="btn-icon delete-habit-btn" data-habit-id="${habit.id}" title="Delete Habit Completely">
                        🗑️
                      </button>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="habits-empty-state" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                  <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">${habitsManagerTab === 'retired' ? '📦' : '🌱'}</span>
                  <h4>${habitsManagerTab === 'retired' ? 'No Retired Habits' : 'No Active Habits'}</h4>
                  <p style="font-size: 0.85rem; margin-top: 4px;">
                    ${habitsManagerTab === 'retired' 
                      ? 'When you retire a habit, it will be stored here with all historical logs safely preserved.' 
                      : 'Create a new habit on the left to start tracking.'}
                  </p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- RETIRE HABIT MODAL (SELECT RETIREMENT MONTH)   -->
    <!-- ============================================== -->
    <div id="retire-habit-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true">
      <div class="modal-card habit-retire-modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.5rem;">📦</span>
              <h3 class="modal-title" id="retire-modal-title">Retire Habit</h3>
            </div>
            <p class="modal-subtitle">Archive habit from active tracking starting from your chosen month</p>
          </div>
          <button class="modal-close-btn" id="close-retire-modal-btn">&times;</button>
        </div>

        <div class="modal-body" id="retire-modal-body">
          <!-- Dynamic Content Rendered by openRetireHabitModal -->
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" id="cancel-retire-modal-btn">Cancel</button>
          <button class="btn-primary" id="confirm-retire-btn" style="background: linear-gradient(135deg, #8b5cf6, #ec4899); border-color: #8b5cf6;">
            <span>📦</span> Confirm Retirement
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- EDIT HABIT MODAL                               -->
    <!-- ============================================== -->
    <div id="edit-habit-modal" class="modal-backdrop hidden">
      <div class="modal-window habit-edit-modal-window">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">✏️</span>
            <div>
              <h3 class="modal-title" id="edit-modal-title">Edit Habit Configuration</h3>
              <p class="modal-subtitle">Modify name, icon, category, schedule, and retirement status.</p>
            </div>
          </div>
          <button class="modal-close-btn" id="close-edit-modal-btn">✕</button>
        </div>

        <div class="modal-body" id="edit-modal-body">
          <!-- Populated dynamically when modal is opened -->
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" id="cancel-edit-modal-btn">Cancel</button>
          <button class="btn-primary" id="save-edit-modal-btn">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  attachHabitsManagerEvents(container);
}

function attachHabitsManagerEvents(container) {
  const preview = document.getElementById('new-habit-icon-preview');
  const customEmojiInput = document.getElementById('new-habit-custom-emoji');

  // Preset Icon Click
  container.querySelectorAll('.preset-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.preset-icon-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedNewIcon = btn.getAttribute('data-icon');
      if (preview) preview.textContent = selectedNewIcon;
      if (customEmojiInput) customEmojiInput.value = selectedNewIcon;
    });
  });

  // Custom Emoji Input
  if (customEmojiInput) {
    customEmojiInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        selectedNewIcon = val;
        if (preview) preview.textContent = val;
      }
    });
  }

  // Active / Retired Tabs
  container.querySelectorAll('.habits-tab-chip').forEach(tab => {
    tab.addEventListener('click', () => {
      habitsManagerTab = tab.getAttribute('data-tab') || 'active';
      renderHabitsManagerView();
    });
  });

  // Frequency Radios
  const freqRadios = container.querySelectorAll('input[name="new-frequency-type"]');
  const weeklyTargetWrap = document.getElementById('new-weekly-target-wrap');
  const specificDaysWrap = document.getElementById('new-specific-days-wrap');

  freqRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = radio.value;
      if (weeklyTargetWrap) {
        if (mode === 'weekly_target') weeklyTargetWrap.classList.remove('hidden');
        else weeklyTargetWrap.classList.add('hidden');
      }
      if (specificDaysWrap) {
        if (mode === 'specific_days') specificDaysWrap.classList.remove('hidden');
        else specificDaysWrap.classList.add('hidden');
      }
      refreshNewFormXPPreview();
    });
  });

  // Stepper Pills for Weekly Target
  container.querySelectorAll('.stepper-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.stepper-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const targetInput = document.getElementById('new-habit-weekly-target');
      if (targetInput) targetInput.value = pill.getAttribute('data-target');
      refreshNewFormXPPreview();
    });
  });

  // Weekday Toggle Pills
  container.querySelectorAll('.weekday-toggle-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
      refreshNewFormXPPreview();
    });
  });

  // Add Habit Form Submit
  const addForm = document.getElementById('add-habit-form');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-habit-name');
      const categorySelect = document.getElementById('new-habit-category');
      const freqMode = container.querySelector('input[name="new-frequency-type"]:checked')?.value || 'daily';
      const weeklyTargetInput = document.getElementById('new-habit-weekly-target');

      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) return;

      const category = categorySelect ? categorySelect.value : 'General';
      const weeklyTarget = weeklyTargetInput ? parseInt(weeklyTargetInput.value, 10) : 7;

      const specificDays = [];
      if (freqMode === 'specific_days') {
        container.querySelectorAll('#new-specific-days-wrap .weekday-toggle-pill.active').forEach(p => {
          specificDays.push(parseInt(p.getAttribute('data-day-index'), 10));
        });
        if (specificDays.length === 0) {
          showToast('Please select at least 1 day for specific days schedule', '⚠️');
          return;
        }
      }

      state.addHabit({
        name,
        icon: selectedNewIcon,
        category,
        frequencyType: freqMode,
        weeklyTarget: freqMode === 'weekly_target' ? weeklyTarget : 7,
        specificDays,
        reminderTime: document.getElementById('new-habit-reminder-time')?.value || '08:00',
        googleCalendarEnabled: Boolean(document.getElementById('new-habit-gcal-enabled')?.checked)
      });

      // Reset form
      nameInput.value = '';
      renderHabitsManagerView();
    });
  }

  // Reorder Habit Buttons
  container.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (idx > 0) {
        state.reorderHabit(idx, idx - 1);
        renderHabitsManagerView();
      }
    });
  });

  container.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (idx < state.getActiveHabits().length - 1) {
        state.reorderHabit(idx, idx + 1);
        renderHabitsManagerView();
      }
    });
  });

  // Retire Habit Button Click
  container.querySelectorAll('.retire-habit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = btn.getAttribute('data-habit-id');
      openRetireHabitModal(habitId);
    });
  });

  // Reactivate Habit Button Click
  container.querySelectorAll('.reactivate-habit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = btn.getAttribute('data-habit-id');
      state.reactivateHabit(habitId);
      habitsManagerTab = 'active';
      renderHabitsManagerView();
    });
  });

  // Edit Habit Button Click
  container.querySelectorAll('.edit-habit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = btn.getAttribute('data-habit-id');
      openEditHabitModal(habitId);
    });
  });

  // Delete Habit Button Click
  container.querySelectorAll('.delete-habit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.getAttribute('data-habit-id');
      const habit = state.getHabit(habitId);
      if (!habit) return;

      const confirmed = await showConfirmDialog({
        title: 'Delete Habit',
        badge: 'Permanent Deletion',
        message: `Are you sure you want to delete <strong>"${escapeHtml(habit.name)}"</strong>? If you only want to stop tracking it going forward, use <strong>Retire Habit</strong> instead so historical data is kept.`,
        item: {
          name: habit.name,
          icon: habit.icon,
          category: habit.category,
          frequency: habit.frequencyType === 'daily' ? 'Daily (7x/wk)' : (habit.frequencyType === 'weekly_target' ? `Weekly Target (${habit.weeklyTarget || 5}x/wk)` : 'Specific Days')
        },
        warningNote: 'Deleting will permanently erase all past checkmarks, streaks, and logs for this habit across all 12 months.',
        confirmText: 'Delete Permanently',
        cancelText: 'Keep Habit',
        confirmIcon: '🗑️',
        variant: 'danger',
        icon: '🗑️'
      });

      if (confirmed) {
        state.deleteHabit(habitId);
        renderHabitsManagerView();
      }
    });
  });

  // Close Edit Modal Handlers
  const closeEditBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-modal-btn');
  const editModal = document.getElementById('edit-habit-modal');

  if (closeEditBtn && editModal) {
    closeEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
  }
  if (cancelEditBtn && editModal) {
    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));
  }

  // Close Retire Modal Handlers
  const closeRetireBtn = document.getElementById('close-retire-modal-btn');
  const cancelRetireBtn = document.getElementById('cancel-retire-modal-btn');
  const retireModal = document.getElementById('retire-habit-modal');

  if (closeRetireBtn && retireModal) {
    closeRetireBtn.addEventListener('click', () => retireModal.classList.add('hidden'));
  }
  if (cancelRetireBtn && retireModal) {
    cancelRetireBtn.addEventListener('click', () => retireModal.classList.add('hidden'));
  }
}

// --------------------------------------------------------------------------
// RETIRE HABIT MODAL
// --------------------------------------------------------------------------
function openRetireHabitModal(habitId) {
  const habit = state.getHabit(habitId);
  const modal = document.getElementById('retire-habit-modal');
  const body = document.getElementById('retire-modal-body');
  const confirmBtn = document.getElementById('confirm-retire-btn');
  if (!habit || !modal || !body || !confirmBtn) return;

  retiringHabitId = habitId;
  const monthOptions = generateRetirementMonthOptions();

  body.innerHTML = `
    <div class="retire-habit-body-wrap">
      <div class="retire-habit-profile-card">
        <span class="retire-habit-avatar">${habit.icon || '⭐'}</span>
        <div class="retire-habit-details">
          <h4 class="retire-habit-title">${escapeHtml(habit.name)}</h4>
          <span class="retire-habit-category">${escapeHtml(habit.category || 'General')} · ${escapeHtml(state.getHabitScheduleLabel(habit))}</span>
        </div>
      </div>

      <div class="form-group" style="margin-top: 14px;">
        <label class="form-label" for="retire-month-select">
          📅 Select Month From Which This Habit Will Be Retired:
        </label>
        <div class="select-wrapper">
          <select id="retire-month-select" class="form-select" style="font-weight: 600;">
            ${monthOptions.map(opt => `
              <option value="${opt.key}" ${opt.isSelected ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
          <div class="select-arrow">▾</div>
        </div>
      </div>

      <div class="retire-info-callout">
        <div class="retire-callout-row">
          <span class="callout-icon">✅</span>
          <span><strong>Historical Data Preserved:</strong> All checkmarks, streak logs, and metrics before the selected month will remain completely safe in past months.</span>
        </div>
        <div class="retire-callout-row">
          <span class="callout-icon">📦</span>
          <span><strong>Future Clutter Removed:</strong> Starting from the selected month, this habit will not appear in the Monthly Grid or penalize streaks.</span>
        </div>
        <div class="retire-callout-row">
          <span class="callout-icon">🔄</span>
          <span><strong>Reactivatable Anytime:</strong> You can restore this habit back to active tracking whenever you like.</span>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  confirmBtn.onclick = () => {
    const monthSelect = document.getElementById('retire-month-select');
    const selectedMonth = monthSelect ? monthSelect.value : `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    
    state.retireHabit(retiringHabitId, selectedMonth);
    modal.classList.add('hidden');
    renderHabitsManagerView();
  };
}

// --------------------------------------------------------------------------
// EDIT HABIT MODAL
// --------------------------------------------------------------------------
function openEditHabitModal(habitId) {
  const habit = state.getHabit(habitId);
  const modal = document.getElementById('edit-habit-modal');
  const body = document.getElementById('edit-modal-body');
  const saveBtn = document.getElementById('save-edit-modal-btn');
  if (!habit || !modal || !body) return;

  editingHabitId = habitId;
  selectedEditIcon = habit.icon || '⭐';

  const isRetired = Boolean(habit.retiredMonth);
  const monthOptions = generateRetirementMonthOptions(habit.retiredMonth);

  body.innerHTML = `
    <div class="edit-habit-form-grid">
      <!-- Habit Name -->
      <div class="form-group">
        <label class="form-label" for="edit-habit-name">Habit Name</label>
        <input type="text" id="edit-habit-name" class="form-input" value="${escapeHtml(habit.name)}" required autocomplete="off" />
      </div>

      <!-- Icon Picker -->
      <div class="form-group">
        <label class="form-label">Habit Icon / Emoji</label>
        <div class="emoji-picker-container">
          <div class="emoji-picker-header">
            <div class="selected-icon-preview" id="edit-habit-icon-preview">
              <span>${selectedEditIcon}</span>
            </div>
            <div class="custom-emoji-input-wrap">
              <span class="custom-emoji-label">Custom Emoji:</span>
              <input type="text" id="edit-habit-custom-emoji" class="form-input custom-emoji-field" maxlength="4" placeholder="Emoji" value="${selectedEditIcon}" />
            </div>
          </div>
          <div class="preset-emoji-grid">
            ${PRESET_ICONS.map(ic => `
              <button type="button" class="preset-icon-btn edit-preset-icon ${ic === selectedEditIcon ? 'selected' : ''}" data-icon="${ic}">${ic}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Category -->
      <div class="form-group">
        <label class="form-label" for="edit-habit-category">Category</label>
        <div class="select-wrapper">
          <select id="edit-habit-category" class="form-select">
            ${PRESET_CATEGORIES.map(cat => `
              <option value="${cat}" ${habit.category === cat ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>
          <div class="select-arrow">▾</div>
        </div>
      </div>

      <!-- Frequency Mode Radio -->
      <div class="form-group">
        <label class="form-label">Recurrence Schedule</label>
        <div class="frequency-mode-options">
          <label class="frequency-radio-label">
            <input type="radio" name="edit-frequency-type" value="daily" ${habit.frequencyType === 'daily' ? 'checked' : ''} />
            <div class="radio-card-content">
              <div class="radio-card-top">
                <span class="radio-icon">⚡</span>
                <span class="radio-card-title">Daily (7x/wk)</span>
              </div>
            </div>
          </label>

          <label class="frequency-radio-label">
            <input type="radio" name="edit-frequency-type" value="weekly_target" ${habit.frequencyType === 'weekly_target' ? 'checked' : ''} />
            <div class="radio-card-content">
              <div class="radio-card-top">
                <span class="radio-icon">🎯</span>
                <span class="radio-card-title">Weekly Target</span>
              </div>
            </div>
          </label>

          <label class="frequency-radio-label">
            <input type="radio" name="edit-frequency-type" value="specific_days" ${habit.frequencyType === 'specific_days' ? 'checked' : ''} />
            <div class="radio-card-content">
              <div class="radio-card-top">
                <span class="radio-icon">📅</span>
                <span class="radio-card-title">Specific Days</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- Weekly Target Stepper -->
      <div id="edit-weekly-target-wrap" class="frequency-conditional-wrap ${habit.frequencyType === 'weekly_target' ? '' : 'hidden'}">
        <label class="form-label">Weekly Target Count</label>
        <div class="stepper-pills">
          ${[1, 2, 3, 4, 5, 6].map(num => `
            <button type="button" class="stepper-pill edit-stepper-pill ${(habit.weeklyTarget || 4) === num ? 'active' : ''}" data-target="${num}">${num}x / wk</button>
          `).join('')}
        </div>
        <input type="hidden" id="edit-habit-weekly-target" value="${habit.weeklyTarget || 4}" />
      </div>

      <!-- Specific Days Selector -->
      <div id="edit-specific-days-wrap" class="frequency-conditional-wrap ${habit.frequencyType === 'specific_days' ? '' : 'hidden'}">
        <label class="form-label">Select Scheduled Days</label>
        <div class="weekday-pills-row">
          ${WEEKDAY_NAMES.map(w => {
            const isSelected = Array.isArray(habit.specificDays) && habit.specificDays.includes(w.index);
            return `
              <button type="button" class="weekday-toggle-pill edit-weekday-pill ${isSelected ? 'active' : ''}" data-day-index="${w.index}">${w.label}</button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Reminder Time & Google Calendar Alerts in Edit Modal -->
      <div class="form-row-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="edit-habit-reminder-time">⏰ Reminder Time</label>
          <input type="time" id="edit-habit-reminder-time" class="form-input" value="${habit.reminderTime || '08:00'}" />
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label">📅 G-Cal Alert</label>
          <div class="gcal-toggle-inline" style="display: flex; align-items: center; gap: 8px; height: 38px;">
            <label class="gcal-switch">
              <input type="checkbox" id="edit-habit-gcal-enabled" ${habit.googleCalendarEnabled ? 'checked' : ''} />
              <span class="gcal-slider"></span>
            </label>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Enable Sync</span>
          </div>
        </div>
      </div>

      <!-- Retirement Status Configuration -->
      <div class="form-group" style="padding: 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
        <label class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
          <span>📦 Habit Lifecycle & Retirement Status</span>
          <span style="font-size: 0.72rem; font-weight: 700; color: ${isRetired ? '#ec4899' : '#10b981'};">
            ${isRetired ? '● Retired' : '● Active'}
          </span>
        </label>
        
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
          <label class="gcal-switch">
            <input type="checkbox" id="edit-habit-retired-toggle" ${isRetired ? 'checked' : ''} />
            <span class="gcal-slider"></span>
          </label>
          <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">
            Retire this habit starting from:
          </span>
        </div>

        <div id="edit-retired-month-select-wrap" style="margin-top: 8px; ${isRetired ? '' : 'display: none;'}">
          <select id="edit-retired-month-select" class="form-select" style="font-size: 0.82rem; padding: 6px 10px;">
            ${monthOptions.map(opt => `
              <option value="${opt.key}" ${opt.isSelected ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Dynamic XP Commitment Preview in Edit Modal -->
      <div class="frequency-xp-preview" id="edit-xp-preview-box">
        <div class="xp-preview-header">
          <span class="xp-preview-icon">⚡</span>
          <span class="xp-preview-title">Discipline Reward Preview</span>
        </div>
        <div class="xp-preview-body" id="edit-xp-preview-text">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>
  `;

  // Attach Icon selector in edit modal
  const editPreview = document.getElementById('edit-habit-icon-preview');
  const editCustomInput = document.getElementById('edit-habit-custom-emoji');

  body.querySelectorAll('.edit-preset-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.edit-preset-icon').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEditIcon = btn.getAttribute('data-icon');
      if (editPreview) editPreview.textContent = selectedEditIcon;
      if (editCustomInput) editCustomInput.value = selectedEditIcon;
    });
  });

  if (editCustomInput) {
    editCustomInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        selectedEditIcon = val;
        if (editPreview) editPreview.textContent = val;
      }
    });
  }

  // Edit Retired toggle
  const retiredToggle = document.getElementById('edit-habit-retired-toggle');
  const retiredMonthWrap = document.getElementById('edit-retired-month-select-wrap');
  if (retiredToggle && retiredMonthWrap) {
    retiredToggle.addEventListener('change', (e) => {
      retiredMonthWrap.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // Edit frequency mode switching
  const editRadios = body.querySelectorAll('input[name="edit-frequency-type"]');
  const editWeeklyWrap = document.getElementById('edit-weekly-target-wrap');
  const editSpecificWrap = document.getElementById('edit-specific-days-wrap');

  editRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = radio.value;
      if (editWeeklyWrap) {
        if (mode === 'weekly_target') editWeeklyWrap.classList.remove('hidden');
        else editWeeklyWrap.classList.add('hidden');
      }
      if (editSpecificWrap) {
        if (mode === 'specific_days') editSpecificWrap.classList.remove('hidden');
        else editSpecificWrap.classList.add('hidden');
      }
      refreshEditFormXPPreview();
    });
  });

  // Edit Stepper pills
  body.querySelectorAll('.edit-stepper-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      body.querySelectorAll('.edit-stepper-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const targetInput = document.getElementById('edit-habit-weekly-target');
      if (targetInput) targetInput.value = pill.getAttribute('data-target');
      refreshEditFormXPPreview();
    });
  });

  // Edit Weekday pills
  body.querySelectorAll('.edit-weekday-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
      refreshEditFormXPPreview();
    });
  });

  // Initialize initial preview
  refreshEditFormXPPreview();

  modal.classList.remove('hidden');

  saveBtn.onclick = () => {
    const nameInput = document.getElementById('edit-habit-name');
    const catSelect = document.getElementById('edit-habit-category');
    const freqMode = body.querySelector('input[name="edit-frequency-type"]:checked')?.value || 'daily';
    const weeklyTargetInput = document.getElementById('edit-habit-weekly-target');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;

    const specificDays = [];
    if (freqMode === 'specific_days') {
      body.querySelectorAll('.edit-weekday-pill.active').forEach(p => {
        specificDays.push(parseInt(p.getAttribute('data-day-index'), 10));
      });
      if (specificDays.length === 0) {
        showToast('Please select at least 1 day for specific days schedule', '⚠️');
        return;
      }
    }

    const reminderTimeVal = document.getElementById('edit-habit-reminder-time')?.value || '08:00';
    const gcalEnabledVal = Boolean(document.getElementById('edit-habit-gcal-enabled')?.checked);
    
    const isRetiredChecked = Boolean(document.getElementById('edit-habit-retired-toggle')?.checked);
    const retiredMonthVal = isRetiredChecked 
      ? (document.getElementById('edit-retired-month-select')?.value || `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`)
      : null;

    state.updateHabit(editingHabitId, {
      name,
      icon: selectedEditIcon,
      category: catSelect ? catSelect.value : 'General',
      frequencyType: freqMode,
      weeklyTarget: freqMode === 'weekly_target' ? parseInt(weeklyTargetInput.value, 10) : 7,
      specificDays,
      reminderTime: reminderTimeVal,
      googleCalendarEnabled: gcalEnabledVal,
      retiredMonth: retiredMonthVal
    });

    modal.classList.add('hidden');
    renderHabitsManagerView();
  };
}

function refreshNewFormXPPreview() {
  const container = document.getElementById('habits-tab');
  if (!container) return;

  const freqMode = container.querySelector('input[name="new-frequency-type"]:checked')?.value || 'daily';
  const weeklyTarget = parseInt(document.getElementById('new-habit-weekly-target')?.value, 10) || 4;
  const specificDaysCount = container.querySelectorAll('#new-specific-days-wrap .weekday-toggle-pill.active').length;
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  let targetDays = totalDays;
  if (freqMode === 'weekly_target') {
    targetDays = Math.round((weeklyTarget / 7) * totalDays);
  } else if (freqMode === 'specific_days') {
    targetDays = Math.round((specificDaysCount / 7) * totalDays);
  }

  const checkXP = Math.max(3, 3 + Math.round((targetDays / totalDays) * 7));
  const masteryXP = targetDays * 2;

  const previewText = document.getElementById('new-xp-preview-text');
  if (previewText) {
    previewText.innerHTML = `<strong>+${checkXP} XP</strong> per check · <strong>+${masteryXP} XP</strong> Monthly Target Mastery Bonus (${targetDays} target days)`;
  }
}

function refreshEditFormXPPreview() {
  const body = document.getElementById('edit-modal-body');
  if (!body) return;

  const freqMode = body.querySelector('input[name="edit-frequency-type"]:checked')?.value || 'daily';
  const weeklyTarget = parseInt(document.getElementById('edit-habit-weekly-target')?.value, 10) || 4;
  const specificDaysCount = body.querySelectorAll('.edit-weekday-pill.active').length;
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  let targetDays = totalDays;
  if (freqMode === 'weekly_target') {
    targetDays = Math.round((weeklyTarget / 7) * totalDays);
  } else if (freqMode === 'specific_days') {
    targetDays = Math.round((specificDaysCount / 7) * totalDays);
  }

  const checkXP = Math.max(3, 3 + Math.round((targetDays / totalDays) * 7));
  const masteryXP = targetDays * 2;

  const previewText = document.getElementById('edit-xp-preview-text');
  if (previewText) {
    previewText.innerHTML = `<strong>+${checkXP} XP</strong> per check · <strong>+${masteryXP} XP</strong> Monthly Target Mastery Bonus (${targetDays} target days)`;
  }
}
