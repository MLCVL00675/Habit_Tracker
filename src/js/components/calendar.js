/* ==========================================================================
   CHRONOLOG // INTERACTIVE CALENDAR & COLOR-CODED HEATMAP COMPONENT
   ========================================================================== */

import { state } from '../state.js';
import {
  getDaysInMonth,
  getDayOfWeek,
  MONTH_NAMES,
  WEEKDAYS_FULL,
  parseDurationToMinutes,
  formatMinutesToDuration,
  normalizeTimeString,
  normalizeCalorieString
} from '../utils.js';

export function renderCalendarView() {
  const container = document.getElementById('calendar-days-grid');
  const monthBanner = document.getElementById('cal-banner-month-name');
  if (!container) return;

  const monthName = MONTH_NAMES[state.currentMonth - 1];
  if (monthBanner) {
    monthBanner.textContent = `${monthName} ${state.currentYear}`;
  }

  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
  const firstDayOfWeek = getDayOfWeek(state.currentYear, state.currentMonth, 1); // 0 = Sun, 6 = Sat

  let gridHtml = '';

  // 1. Render empty offset slots for days preceding the 1st
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridHtml += `<div class="cal-day-cell empty-slot"></div>`;
  }

  let perfectDaysCount = 0;
  let strongDaysCount = 0;
  let totalStudyMins = 0;
  let totalHabitsDone = 0;
  let totalTargetQuota = 0;

  // 2. Render each day in month
  for (let day = 1; day <= totalDays; day++) {
    const dayRecord = monthData.days[day] || { habits: {} };

    let habitsDone = 0;
    let scheduledCount = 0;

    habits.forEach(h => {
      const isScheduled = state.isHabitScheduledForDay(h, state.currentYear, state.currentMonth, day);
      if (isScheduled) scheduledCount++;

      if (dayRecord.habits && dayRecord.habits[h.id] === 'done') {
        habitsDone++;
      }
    });

    const divisor = scheduledCount > 0 ? scheduledCount : (habits.length || 1);
    const completionRate = Math.min(100, Math.round((habitsDone / divisor) * 100));
    
    totalHabitsDone += habitsDone;
    totalTargetQuota += divisor;

    if (completionRate === 100) perfectDaysCount++;
    if (completionRate > 75) strongDaysCount++;

    const studyM = parseDurationToMinutes(dayRecord.studyTime);
    if (studyM > 0) totalStudyMins += studyM;

    // All-Green Gradient Heatmap Tiers & Progress Bar Colors
    let heatStepClass = 'heat-level-0';
    let barColor = 'rgba(255, 255, 255, 0.08)';

    if (completionRate === 100) {
      heatStepClass = 'heat-level-perfect'; // 100%: Luminous Radiant Emerald Glow
      barColor = 'linear-gradient(90deg, #34d399, #10b981, #059669)';
    } else if (completionRate > 75) {
      heatStepClass = 'heat-level-4'; // 76% - 99%: Intense Electric Emerald
      barColor = 'var(--accent-emerald)';
    } else if (completionRate > 50) {
      heatStepClass = 'heat-level-3'; // 51% - 75%: Rich Forest Jade
      barColor = 'rgba(16, 185, 129, 0.85)';
    } else if (completionRate > 25) {
      heatStepClass = 'heat-level-2'; // 26% - 50%: Medium Emerald
      barColor = 'rgba(16, 185, 129, 0.6)';
    } else if (completionRate > 0) {
      heatStepClass = 'heat-level-1'; // 1% - 25%: Subtle Sage
      barColor = 'rgba(16, 185, 129, 0.35)';
    } else {
      heatStepClass = 'heat-level-0'; // 0%: No Color (Neutral Dark Glass)
      barColor = 'rgba(255, 255, 255, 0.06)';
    }

    const now = new Date();
    const isCurrentRealMonth = (now.getFullYear() === state.currentYear && (now.getMonth() + 1) === state.currentMonth);
    const isToday = isCurrentRealMonth && day === now.getDate();
    const todayCellClass = isToday ? 'is-today' : '';

    const dayOfWeekIdx = getDayOfWeek(state.currentYear, state.currentMonth, day);
    const dayOfWeekName = WEEKDAYS_FULL[dayOfWeekIdx];

    gridHtml += `
      <div class="cal-day-cell ${heatStepClass} ${todayCellClass}" 
           data-day="${day}" 
           title="Day ${day} (${dayOfWeekName}${isToday ? ' - Today' : ''}): ${habitsDone}/${divisor} scheduled habits (${completionRate}%)">
        <div class="cal-day-top">
          <div class="cal-day-num-wrap">
            <span class="cal-day-num">${day}</span>
            ${isToday ? '<span class="cal-today-pill">TODAY</span>' : ''}
          </div>
          <span class="cal-day-rate-badge">${completionRate === 100 ? '🌟 100%' : `${completionRate}%`}</span>
        </div>

        <div class="cal-day-metrics-mini">
          <span class="cal-metric-chip chip-habits">
            <span class="chip-ico">✅</span> <span class="chip-val">${habitsDone}/${divisor}</span>
          </span>
          ${dayRecord.studyTime ? `
            <span class="cal-metric-chip chip-study">
              <span class="chip-ico">📚</span> <span class="chip-val">${dayRecord.studyTime}</span>
            </span>` : ''}
          ${dayRecord.wakeTime ? `
            <span class="cal-metric-chip chip-wake">
              <span class="chip-ico">🌅</span> <span class="chip-val">${dayRecord.wakeTime}</span>
            </span>` : ''}
          ${dayRecord.caloriesIn ? `
            <span class="cal-metric-chip chip-cal-in" title="Calories In: ${dayRecord.caloriesIn}">
              <span class="chip-ico">🍎</span> <span class="chip-val">${dayRecord.caloriesIn.replace(' kcal', '')}</span>
            </span>` : ''}
          ${dayRecord.caloriesBurned ? `
            <span class="cal-metric-chip chip-cal-burn" title="Calories Burned: ${dayRecord.caloriesBurned}">
              <span class="chip-ico">🔥</span> <span class="chip-val">${dayRecord.caloriesBurned.replace(' kcal', '')}</span>
            </span>` : ''}
        </div>

        <div class="cal-day-bar-track">
          <div class="cal-day-bar-fill" style="width: ${completionRate}%; background: ${barColor};"></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = gridHtml;

  // 3. Update Calendar Summary Cards
  const perfectCountEl = document.getElementById('cal-perfect-days-count');
  const strongCountEl = document.getElementById('cal-strong-days-count');
  const totalStudyEl = document.getElementById('cal-total-study-hours');
  const avgRateEl = document.getElementById('cal-avg-completion-rate');

  if (perfectCountEl) perfectCountEl.textContent = perfectDaysCount;
  if (strongCountEl) strongCountEl.textContent = strongDaysCount;
  if (totalStudyEl) totalStudyEl.textContent = `${Math.round(totalStudyMins / 60)}h ${totalStudyMins % 60}m`;
  if (avgRateEl) {
    const avgPct = totalTargetQuota > 0 ? Math.round((totalHabitsDone / totalTargetQuota) * 100) : 0;
    avgRateEl.textContent = `${avgPct}%`;
  }

  // 4. Attach click listener to day cells to open Day Focus Quick-Editor Modal
  container.querySelectorAll('.cal-day-cell:not(.empty-slot)').forEach(cell => {
    cell.addEventListener('click', () => {
      const day = parseInt(cell.getAttribute('data-day'), 10);
      openDayDetailModal(day);
    });
  });
}

// Day Focus Modal with complete habit toggles and metrics
export function openDayDetailModal(day) {
  const modal = document.getElementById('day-modal');
  const title = document.getElementById('day-modal-title');
  const subtitle = document.getElementById('day-modal-subtitle');
  const body = document.getElementById('day-modal-body');
  const saveBtn = document.getElementById('save-day-modal-btn');
  if (!modal || !body) return;

  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const dayRecord = monthData.days[day] || { habits: {} };
  const dayOfWeekIdx = getDayOfWeek(state.currentYear, state.currentMonth, day);
  const dayOfWeekName = WEEKDAYS_FULL[dayOfWeekIdx];
  const monthName = MONTH_NAMES[state.currentMonth - 1];

  title.textContent = `Day ${day} Focus & Habit Log`;
  subtitle.textContent = `${monthName} ${day}, ${state.currentYear} (${dayOfWeekName})`;

  // Clone local habit states for modal editing
  const localHabits = { ...(dayRecord.habits || {}) };

  const habitsModalGrid = habits.map(h => {
    const isScheduled = state.isHabitScheduledForDay(h, state.currentYear, state.currentMonth, day);
    const current = localHabits[h.id] || 'none';
    const scheduleBadge = state.getHabitScheduleLabel(h);

    const isRest = !isScheduled && h.frequencyType === 'specific_days' && (current === 'none' || current === 'rest');
    let badgeText = '· Blank';
    let badgeClass = 'state-blank';
    if (current === 'done') {
      badgeText = '✓ Done';
      badgeClass = 'state-done';
    } else if (current === 'missed') {
      badgeText = '✗ Missed';
      badgeClass = 'state-missed';
    } else if (isRest) {
      badgeText = '— Rest Day';
      badgeClass = 'state-rest';
    }

    return `
      <div class="modal-habit-toggle-item ${isRest ? 'item-rest-day' : ''}" data-habit-id="${h.id}" data-state="${current}">
        <span class="modal-habit-icon">${h.icon}</span>
        <div class="modal-habit-text">
          <span class="modal-habit-name">${escapeHtml(h.name)}</span>
          <span class="modal-habit-sub">${scheduleBadge}${!isScheduled ? ' (Off Day)' : ''}</span>
        </div>
        <span class="modal-habit-state-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <!-- Metrics Inputs -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px;">
      <div class="form-group">
        <label class="form-label">🌅 Wake Up (e.g. 7:05)</label>
        <input type="text" id="modal-wake-input" class="form-textarea" style="padding:8px;" 
               placeholder="--:--" value="${escapeHtml(dayRecord.wakeTime || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">🌙 Sleep Duration (e.g. 7:30)</label>
        <input type="text" id="modal-sleep-input" class="form-textarea" style="padding:8px;" 
               placeholder="--:--" value="${escapeHtml(dayRecord.sleepTime || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">📚 Study Duration (e.g. 4h)</label>
        <input type="text" id="modal-study-input" class="form-textarea" style="padding:8px;" 
               placeholder="--:--" value="${escapeHtml(dayRecord.studyTime || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">📱 Screen Duration (e.g. 1.5h)</label>
        <input type="text" id="modal-screen-input" class="form-textarea" style="padding:8px;" 
               placeholder="--:--" value="${escapeHtml(dayRecord.screenTime || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">🍎 Cal Ingested (e.g. 2100 or 2.1k)</label>
        <input type="text" id="modal-cal-in-input" class="form-textarea" style="padding:8px;" 
               placeholder="-- kcal" value="${escapeHtml(dayRecord.caloriesIn || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">🔥 Cal Burned (e.g. 550 or 600)</label>
        <input type="text" id="modal-cal-burn-input" class="form-textarea" style="padding:8px;" 
               placeholder="-- kcal" value="${escapeHtml(dayRecord.caloriesBurned || '')}" />
      </div>
    </div>

    <!-- Habits Checklist Matrix -->
    <div class="form-group">
      <label class="form-label">Habit Checklist for Day ${day} (Click to toggle):</label>
      <div class="modal-habits-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        ${habitsModalGrid}
      </div>
    </div>
  `;

  // Attach click handler for habit toggles inside modal
  body.querySelectorAll('.modal-habit-toggle-item').forEach(item => {
    item.addEventListener('click', () => {
      const habitId = item.getAttribute('data-habit-id');
      const habit = habits.find(h => h.id === habitId);
      const isHabitScheduled = state.isHabitScheduledForDay(habit, state.currentYear, state.currentMonth, day);
      let current = localHabits[habitId] || 'none';
      let next = 'done';
      if (!isHabitScheduled && habit.frequencyType === 'specific_days') {
        next = (current === 'done') ? 'none' : 'done';
      } else {
        if (current === 'none' || current === 'rest') next = 'done';
        else if (current === 'done') next = 'missed';
        else if (current === 'missed') next = 'none';
      }

      localHabits[habitId] = next;
      item.setAttribute('data-state', next);
      const badge = item.querySelector('.modal-habit-state-badge');
      if (badge) {
        if (next === 'done') {
          badge.textContent = '✓ Done';
          badge.className = 'modal-habit-state-badge state-done';
        } else if (next === 'missed') {
          badge.textContent = '✗ Missed';
          badge.className = 'modal-habit-state-badge state-missed';
        } else if (!isHabitScheduled && habit.frequencyType === 'specific_days') {
          badge.textContent = '— Rest Day';
          badge.className = 'modal-habit-state-badge state-rest';
        } else {
          badge.textContent = '· Blank';
          badge.className = 'modal-habit-state-badge state-blank';
        }
      }
    });
  });

  modal.classList.remove('hidden');

  saveBtn.onclick = () => {
    const wakeInput = document.getElementById('modal-wake-input');
    const sleepInput = document.getElementById('modal-sleep-input');
    const studyInput = document.getElementById('modal-study-input');
    const screenInput = document.getElementById('modal-screen-input');
    const calInInput = document.getElementById('modal-cal-in-input');
    const calBurnInput = document.getElementById('modal-cal-burn-input');

    const dayObj = monthData.days[day];
    if (wakeInput) {
      dayObj.wakeTime = normalizeTimeString(wakeInput.value);
    }
    if (sleepInput) {
      const mins = parseDurationToMinutes(sleepInput.value);
      dayObj.sleepTime = mins > 0 ? formatMinutesToDuration(mins) : '';
    }
    if (studyInput) {
      const mins = parseDurationToMinutes(studyInput.value);
      dayObj.studyTime = mins > 0 ? formatMinutesToDuration(mins) : '';
    }
    if (screenInput) {
      const mins = parseDurationToMinutes(screenInput.value);
      dayObj.screenTime = mins > 0 ? formatMinutesToDuration(mins) : '';
    }
    if (calInInput) {
      dayObj.caloriesIn = normalizeCalorieString(calInInput.value);
    }
    if (calBurnInput) {
      dayObj.caloriesBurned = normalizeCalorieString(calBurnInput.value);
    }

    dayObj.habits = localHabits;

    state.saveToStorage();
    state.notify();
    modal.classList.add('hidden');
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
