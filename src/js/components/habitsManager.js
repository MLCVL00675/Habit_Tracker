/* ==========================================================================
   CHRONOLOG // HABITS MANAGER COMPONENT (CRUD & FLEXIBLE FREQUENCY SCHEDULES)
   ========================================================================== */

import { state } from '../state.js';
import { getDaysInMonth, sound, showToast, escapeHtml } from '../utils.js';
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

export function renderHabitsManagerView() {
  const container = document.getElementById('habits-tab');
  if (!container) return;

  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  // Statistics calculation
  const totalHabits = habits.length;
  const dailyHabits = habits.filter(h => h.frequencyType === 'daily').length;
  const weeklyTargetHabits = habits.filter(h => h.frequencyType === 'weekly_target').length;
  const specificDaysHabits = habits.filter(h => h.frequencyType === 'specific_days').length;

  container.innerHTML = `
    <div class="habits-manager-layout">
      <!-- Top Banner & Stats Overview -->
      <div class="habits-hero-banner">
        <div class="habits-hero-left">
          <div class="habits-hero-icon">⚙️</div>
          <div class="habits-hero-text">
            <h2 class="section-title">Habit Configuration & Frequency Studio</h2>
            <p class="section-subtitle">
              Add, modify, and customize your habits. Configure habits for daily execution, flexible weekly quotas (e.g. 3x/week), or designated weekdays.
            </p>
          </div>
        </div>

        <div class="habits-stat-chips-group">
          <div class="habit-stat-chip">
            <span class="chip-num">${totalHabits}</span>
            <span class="chip-lbl">Total Habits</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-num" style="color:var(--accent-cyan);">${dailyHabits}</span>
            <span class="chip-lbl">Daily (7x)</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-num" style="color:var(--accent-gold);">${weeklyTargetHabits}</span>
            <span class="chip-lbl">Weekly Target</span>
          </div>
          <div class="habit-stat-chip">
            <span class="chip-num" style="color:var(--accent-purple);">${specificDaysHabits}</span>
            <span class="chip-lbl">Specific Days</span>
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
                  ${PRESET_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
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

            <!-- Dynamic XP Commitment Preview -->
            <div class="frequency-xp-preview" id="new-xp-preview-box">
              <div class="xp-preview-header">
                <span class="xp-preview-icon">⚡</span>
                <span class="xp-preview-title">Discipline Reward Preview</span>
              </div>
              <div class="xp-preview-body" id="new-xp-preview-text">
                <strong>+35 XP</strong> per check · <strong>+310 XP</strong> Monthly Target Mastery Bonus (31 target days)
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
              <h3 class="card-title">Configured Habits (${habits.length})</h3>
            </div>
            <span class="hint-text">Use ⬆️ ⬇️ to reorder columns in the Monthly Grid.</span>
          </div>

          <div class="habits-items-scroll">
            <div class="habits-cards-stack" id="habits-cards-stack">
              ${habits.map((habit, index) => {
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
                  <div class="habit-manage-card" data-habit-id="${habit.id}">
                    <div class="habit-card-left">
                      <!-- Reorder Buttons -->
                      <div class="habit-reorder-group">
                        <button class="reorder-btn move-up-btn" data-index="${index}" title="Move Up" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button class="reorder-btn move-down-btn" data-index="${index}" title="Move Down" ${index === habits.length - 1 ? 'disabled' : ''}>▼</button>
                      </div>

                      <!-- Icon & Info -->
                      <div class="habit-card-icon">${habit.icon}</div>
                      <div class="habit-card-info">
                        <div class="habit-card-title-row">
                          <span class="habit-card-name">${escapeHtml(habit.name)}</span>
                          <span class="habit-category-badge">${escapeHtml(habit.category || 'General')}</span>
                          <span class="habit-xp-pill" title="Earn +${checkXP} XP per check based on ${targetDays} target days commitment (+${masteryBonusXP} XP 100% target mastery bonus)">⚡ +${checkXP} XP / check</span>
                        </div>
                        <div class="habit-card-schedule-row">
                          <span class="habit-frequency-pill frequency-${habit.frequencyType}">
                            ${habit.frequencyType === 'daily' ? '⚡' : (habit.frequencyType === 'weekly_target' ? '🎯' : '📅')} ${scheduleLabel}
                          </span>
                          <span class="habit-target-counter">
                            Month Progress: <strong>${completedCount}/${targetDays} days</strong> (${progressPct}%)
                            ${isTargetReached ? ' <span class="target-star" title="Target Achieved! +Bonus XP">🎯 100% Mastered</span>' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="habit-card-actions">
                      <button class="btn-icon edit-habit-btn" data-habit-id="${habit.id}" title="Edit Habit Settings">
                        ✏️
                      </button>
                      <button class="btn-icon delete-habit-btn" data-habit-id="${habit.id}" title="Delete Habit">
                        🗑️
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Habit Modal -->
    <div id="edit-habit-modal" class="modal-backdrop hidden">
      <div class="modal-window habit-edit-modal-window">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">✏️</span>
            <div>
              <h3 class="modal-title" id="edit-modal-title">Edit Habit Configuration</h3>
              <p class="modal-subtitle">Modify name, icon, category, and recurrence schedule.</p>
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
        if (preview) preview.textContent = selectedNewIcon;
      }
    });
  }

// Helper to calculate XP preview based on frequency options
function computeScheduleXPPreview(freqType, weeklyTarget = 4, specificDays = []) {
  const dummyHabit = {
    frequencyType: freqType,
    weeklyTarget: weeklyTarget,
    specificDays: specificDays
  };
  const targetDays = state.getHabitTargetDays(dummyHabit, state.currentYear, state.currentMonth);
  const checkXP = state.getHabitCheckXP(dummyHabit, state.currentYear, state.currentMonth);
  const masteryXP = state.getHabitMasteryBonusXP(dummyHabit, state.currentYear, state.currentMonth);
  return { targetDays, checkXP, masteryXP };
}

  function refreshNewFormXPPreview() {
    const freqMode = container.querySelector('input[name="new-frequency-type"]:checked')?.value || 'daily';
    const weeklyTarget = parseInt(document.getElementById('new-habit-weekly-target')?.value || '4', 10);
    const specificDays = [];
    container.querySelectorAll('#new-specific-days-wrap .weekday-toggle-pill.active').forEach(p => {
      specificDays.push(parseInt(p.getAttribute('data-day-index'), 10));
    });
    const { targetDays, checkXP, masteryXP } = computeScheduleXPPreview(freqMode, weeklyTarget, specificDays);
    const previewEl = document.getElementById('new-xp-preview-text');
    if (previewEl) {
      previewEl.innerHTML = `<strong>+${checkXP} XP</strong> per check · <strong>+${masteryXP} XP</strong> Monthly Target Mastery Bonus (${targetDays} target days)`;
    }
  }

  // Frequency Type Radio Toggle
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
        specificDays
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
      if (idx < state.getHabits().length - 1) {
        state.reorderHabit(idx, idx + 1);
        renderHabitsManagerView();
      }
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
        message: `Are you sure you want to delete <strong>"${escapeHtml(habit.name)}"</strong> from your habit tracking? This will remove it from all months and metrics.`,
        item: {
          name: habit.name,
          icon: habit.icon,
          category: habit.category,
          frequency: habit.frequencyType === 'daily' ? 'Daily (7x/wk)' : (habit.frequencyType === 'weekly_target' ? `Weekly Target (${habit.weeklyTarget || 5}x/wk)` : 'Specific Days')
        },
        warningNote: 'This action is irreversible. All tracking streaks, logs, and historical data for this habit across all 12 months will be permanently erased.',
        confirmText: 'Delete Habit',
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
        if (editPreview) editPreview.textContent = selectedEditIcon;
      }
    });
  }

  function refreshEditFormXPPreview() {
    const freqMode = body.querySelector('input[name="edit-frequency-type"]:checked')?.value || 'daily';
    const weeklyTarget = parseInt(document.getElementById('edit-habit-weekly-target')?.value || '4', 10);
    const specificDays = [];
    body.querySelectorAll('#edit-specific-days-wrap .edit-weekday-pill.active').forEach(p => {
      specificDays.push(parseInt(p.getAttribute('data-day-index'), 10));
    });
    const { targetDays, checkXP, masteryXP } = computeScheduleXPPreview(freqMode, weeklyTarget, specificDays);
    const previewEl = document.getElementById('edit-xp-preview-text');
    if (previewEl) {
      previewEl.innerHTML = `<strong>+${checkXP} XP</strong> per check · <strong>+${masteryXP} XP</strong> Monthly Target Mastery Bonus (${targetDays} target days)`;
    }
  }

  // Attach frequency radio toggle in edit modal
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

    state.updateHabit(editingHabitId, {
      name,
      icon: selectedEditIcon,
      category: catSelect ? catSelect.value : 'General',
      frequencyType: freqMode,
      weeklyTarget: freqMode === 'weekly_target' ? parseInt(weeklyTargetInput.value, 10) : 7,
      specificDays
    });

    modal.classList.add('hidden');
    renderHabitsManagerView();
  };
}

