import { state } from '../state.js';
import {
  getDaysInMonth,
  getDayOfWeek,
  WEEKDAYS_SHORT,
  WEEKDAYS_FULL,
  parseDurationToMinutes,
  formatMinutesToDuration,
  normalizeTimeString,
  calculateHabitStreaks
} from '../utils.js';

export function renderMatrixTable() {
  const thead = document.getElementById('habit-matrix-head');
  const tbody = document.getElementById('habit-matrix-body');
  const tfoot = document.getElementById('habit-matrix-foot');
  if (!tbody || !tfoot) return;

  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
  const today = new Date();
  const isCurrentRealMonth = (today.getFullYear() === state.currentYear && today.getMonth() + 1 === state.currentMonth);
  const realTodayDate = today.getDate();

  // --------------------------------------------------------------------------
  // 1. DYNAMIC TABLE HEADER
  // --------------------------------------------------------------------------
  if (thead) {
    const habitHeaderColumns = habits.map(h => {
      const { currentStreak, bestStreak } = calculateHabitStreaks(
        monthData, 
        h, 
        totalDays, 
        (hab, y, m, d) => state.isHabitScheduledForDay(hab, y, m, d),
        state.currentYear,
        state.currentMonth
      );
      const isHot = currentStreak >= 3;
      const freqLabel = getShortFrequencyBadge(h);
      const checkXP = state.getHabitCheckXP(h);
      const targetDays = state.getHabitTargetDays(h, state.currentYear, state.currentMonth);

      return `
        <th class="col-habit" data-habit-id="${h.id}" title="${escapeHtml(h.name)} (${state.getHabitScheduleLabel(h)}) • +${checkXP} XP/check (${targetDays} target days/mo) • Streak: ${currentStreak}d | Best: ${bestStreak}d">
          <div class="th-habit-rotate">
            <span class="habit-icon">${h.icon}</span>
            <span class="habit-col-name">${escapeHtml(h.name)}</span>
            <span class="habit-col-freq-tag">${freqLabel}</span>
            <span class="habit-header-streak-badge ${isHot ? 'hot' : ''}">
              <span class="header-streak-fire">${currentStreak > 0 ? '🔥' : '·'}</span><span class="header-streak-val">${currentStreak}d</span>
            </span>
          </div>
        </th>
      `;
    }).join('');

    thead.innerHTML = `
      <!-- Group Headers Row -->
      <tr class="header-group-row">
        <th colspan="2" class="th-group-date">DATE & DAY</th>
        <th colspan="4" class="th-group-metrics">DAILY METRICS (TIME / DURATION)</th>
        <th colspan="${habits.length || 1}" class="th-group-habits">HABITS & TASKS ROUTINE (${habits.length} CHECKBOXES)</th>
        <th class="th-group-progress">PROGRESS</th>
      </tr>
      <!-- Individual Column Headers Row -->
      <tr class="header-columns-row">
        <th class="col-date sticky-col-1" title="Date of Month">Day</th>
        <th class="col-weekday sticky-col-2" title="Day of Week">WkDay</th>
        <th class="col-metric" title="Wake up at? (hh:mm AM/PM)">
          <div class="th-content"><span class="th-icon">🌅</span> Wake Up</div>
        </th>
        <th class="col-metric" title="Sleep Duration (X hr Y m)">
          <div class="th-content"><span class="th-icon">🌙</span> Sleep Time</div>
        </th>
        <th class="col-metric" title="Study Duration (X hr Y m)">
          <div class="th-content"><span class="th-icon">📚</span> Study Time</div>
        </th>
        <th class="col-metric" title="Phone Screen Time (X hr Y m)">
          <div class="th-content"><span class="th-icon">📱</span> Screen Time</div>
        </th>
        ${habitHeaderColumns}
        <th class="col-progress" title="Daily Completion Percentage">Daily %</th>
      </tr>
    `;
  }

  // --------------------------------------------------------------------------
  // 2. DYNAMIC TABLE ROWS (DAYS 1 TO N)
  // --------------------------------------------------------------------------
  let rowsHtml = '';

  let validSleepDays = 0, totalSleepMins = 0;
  let validStudyDays = 0, totalStudyMins = 0;
  let validScreenDays = 0, totalScreenMins = 0;
  let wakeTimeMinsTotal = 0, validWakeDays = 0;

  const habitDoneCounts = {};
  habits.forEach(h => { habitDoneCounts[h.id] = 0; });

  let grandTotalHabitsDone = 0;
  let grandTotalHabitTarget = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeekIdx = getDayOfWeek(state.currentYear, state.currentMonth, day);
    const dayOfWeekStr = WEEKDAYS_SHORT[dayOfWeekIdx];
    const isWeekend = (dayOfWeekIdx === 0 || dayOfWeekIdx === 6); // Sun or Sat
    const isToday = isCurrentRealMonth && day === realTodayDate;

    // Apply quick filters
    if (state.filterMode === 'weekends' && !isWeekend) continue;
    if (state.filterMode === 'weekdays' && isWeekend) continue;

    const dayRecord = monthData.days[day] || {
      wakeTime: '', sleepTime: '', studyTime: '', screenTime: '', habits: {}
    };

    // Count scheduled habits & completed habits for today
    let habitsDoneCount = 0;
    let scheduledHabitsCount = 0;

    habits.forEach(h => {
      const isScheduled = state.isHabitScheduledForDay(h, state.currentYear, state.currentMonth, day);
      if (isScheduled) scheduledHabitsCount++;

      const s = dayRecord.habits ? dayRecord.habits[h.id] : 'none';
      if (s === 'done') {
        habitsDoneCount++;
        habitDoneCounts[h.id]++;
      }
    });

    const divisor = scheduledHabitsCount > 0 ? scheduledHabitsCount : (habits.length || 1);
    const completionRate = Math.min(100, Math.round((habitsDoneCount / divisor) * 100));

    if (state.filterMode === 'incomplete' && completionRate === 100) continue;

    grandTotalHabitsDone += habitsDoneCount;

    // Accumulate durations
    const sleepM = parseDurationToMinutes(dayRecord.sleepTime);
    if (sleepM > 0) { totalSleepMins += sleepM; validSleepDays++; }

    const studyM = parseDurationToMinutes(dayRecord.studyTime);
    if (studyM > 0) { totalStudyMins += studyM; validStudyDays++; }

    const screenM = parseDurationToMinutes(dayRecord.screenTime);
    if (screenM > 0) { totalScreenMins += screenM; validScreenDays++; }

    if (dayRecord.wakeTime) {
      const wakeMins = parseWakeTimeToMins(dayRecord.wakeTime);
      if (wakeMins !== null) {
        wakeTimeMinsTotal += wakeMins;
        validWakeDays++;
      }
    }

    // Progress bar color gradient
    let progressBg = 'var(--status-missed-border)';
    if (completionRate === 100) progressBg = 'linear-gradient(90deg, var(--accent-gold), #ec4899)';
    else if (completionRate > 75) progressBg = 'var(--accent-gold)';
    else if (completionRate > 50) progressBg = 'var(--accent-emerald)';
    else if (completionRate > 25) progressBg = 'var(--accent-cyan)';
    else if (completionRate > 0) progressBg = 'var(--accent-purple)';

    const rowClasses = [
      isWeekend ? 'row-weekend' : '',
      isToday ? 'row-today' : ''
    ].filter(Boolean).join(' ');

    // Generate Habits Cells
    const habitCellsHtml = habits.map(h => {
      const isScheduled = state.isHabitScheduledForDay(h, state.currentYear, state.currentMonth, day);
      const rawState = (dayRecord.habits && dayRecord.habits[h.id]) || 'none';
      
      let stateVal = rawState;
      let symbol = '·';
      let isRestDay = false;

      if (!isScheduled && h.frequencyType === 'specific_days') {
        if (rawState === 'none' || rawState === 'rest') {
          isRestDay = true;
          stateVal = 'rest';
          symbol = '—';
        } else if (rawState === 'done') {
          symbol = '✓';
        } else if (rawState === 'missed') {
          symbol = '✗';
        }
      } else {
        if (rawState === 'done') symbol = '✓';
        else if (rawState === 'missed') symbol = '✗';
        else symbol = '·';
      }

      const restClass = isRestDay ? 'habit-rest-day' : '';
      const badgeRestClass = isRestDay ? 'badge-rest-dash' : '';

      const tooltipText = isRestDay
        ? `${h.name} (Day ${day} - ${WEEKDAYS_FULL[dayOfWeekIdx]}): Rest Day (Not scheduled on ${dayOfWeekStr})`
        : `${h.name} (Day ${day} - ${WEEKDAYS_FULL[dayOfWeekIdx]}): ${stateVal === 'done' ? 'Completed' : (stateVal === 'missed' ? 'Missed' : 'Blank')}`;

      return `
        <td class="habit-toggle-cell ${restClass}" 
            data-day="${day}" 
            data-habit-id="${h.id}" 
            data-state="${stateVal}"
            title="${tooltipText}">
          <span class="habit-check-badge ${badgeRestClass}">${symbol}</span>
        </td>
      `;
    }).join('');

    rowsHtml += `
      <tr class="${rowClasses}" data-day="${day}">
        <td class="sticky-col-1 col-date">${String(day).padStart(2, '0')}</td>
        <td class="sticky-col-2 col-weekday" title="${WEEKDAYS_FULL[dayOfWeekIdx]}${isToday ? ' (Today)' : ''}">
          ${isToday ? '<span class="today-tag-pill">TODAY</span>' : ''}${dayOfWeekStr}
        </td>
        
        <!-- Daily Metrics -->
        <td class="col-metric-cell">
          <input type="text" class="metric-input" data-day="${day}" data-metric="wakeTime" 
                 placeholder="--:--" title="Wake Up Time: e.g. 7:05, 0705, 6:30 am" value="${escapeHtml(dayRecord.wakeTime || '')}" />
        </td>
        <td class="col-metric-cell">
          <input type="text" class="metric-input" data-day="${day}" data-metric="sleepTime" 
                 placeholder="--:--" title="Sleep Duration: e.g. 7:30, 7.5, 7h 30m" value="${escapeHtml(dayRecord.sleepTime || '')}" />
        </td>
        <td class="col-metric-cell">
          <input type="text" class="metric-input" data-day="${day}" data-metric="studyTime" 
                 placeholder="--:--" title="Study Duration: e.g. 4:00, 4.5, 4h 30m" value="${escapeHtml(dayRecord.studyTime || '')}" />
        </td>
        <td class="col-metric-cell">
          <input type="text" class="metric-input" data-day="${day}" data-metric="screenTime" 
                 placeholder="--:--" title="Screen Duration: e.g. 1:30, 1.5, 1h 30m" value="${escapeHtml(dayRecord.screenTime || '')}" />
        </td>

        <!-- Habits -->
        ${habitCellsHtml}

        <!-- Daily Progress Bar -->
        <td class="col-progress-cell">
          <div class="progress-cell-wrap" title="${habitsDoneCount}/${divisor} Habits Completed (${completionRate}%)">
            <div class="progress-info">
              <span>${habitsDoneCount}/${divisor}</span>
              <span class="progress-pct-val">${completionRate}%</span>
            </div>
            <div class="progress-track-mini">
              <div class="progress-fill-mini" style="width: ${completionRate}%; background: ${progressBg};"></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = rowsHtml;

  // --------------------------------------------------------------------------
  // 3. FOOTER SUMMARY & TARGET-RELATIVE CALCULATIONS
  // --------------------------------------------------------------------------
  const avgSleepMins = validSleepDays > 0 ? Math.round(totalSleepMins / validSleepDays) : 0;
  const avgStudyMins = validStudyDays > 0 ? Math.round(totalStudyMins / validStudyDays) : 0;
  const avgScreenMins = validScreenDays > 0 ? Math.round(totalScreenMins / validScreenDays) : 0;
  const avgWakeStr = validWakeDays > 0 ? minsToWakeTimeStr(Math.round(wakeTimeMinsTotal / validWakeDays)) : '--:--';

  let totalTargetQuota = 0;

  const habitFooterCells = habits.map(h => {
    const done = habitDoneCounts[h.id] || 0;
    const targetDays = state.getHabitTargetDays(h, state.currentYear, state.currentMonth);
    totalTargetQuota += targetDays;

    const pct = targetDays > 0 ? Math.min(100, Math.round((done / targetDays) * 100)) : 0;
    const isAchieved = done >= targetDays && targetDays > 0;

    return `
      <td class="col-habit footer-habit-cell" title="${h.name} Target: ${targetDays} days | Done: ${done} days (${pct}%)">
        <div class="habit-summary-count">
          <strong>${done}/${targetDays}</strong>
          <span class="footer-pct-badge ${isAchieved ? 'target-met' : ''}">${isAchieved ? '🎯' : ''}${pct}%</span>
        </div>
      </td>
    `;
  }).join('');

  const monthCompletionPct = totalTargetQuota > 0 ? Math.min(100, Math.round((grandTotalHabitsDone / totalTargetQuota) * 100)) : 0;

  tfoot.innerHTML = `
    <tr>
      <td colspan="2" class="tfoot-label-cell">MONTHLY TARGETS & STATS</td>
      <td class="metric-summary-val" title="Average Wake Time">${avgWakeStr}</td>
      <td class="metric-summary-val" title="Average Sleep Duration (Total: ${formatMinutesToDuration(totalSleepMins)})">
        ${formatMinutesToDuration(avgSleepMins) || '--'}
      </td>
      <td class="metric-summary-val" title="Average Study Duration (Total: ${formatMinutesToDuration(totalStudyMins)})">
        ${formatMinutesToDuration(avgStudyMins) || '--'}
      </td>
      <td class="metric-summary-val" title="Average Screen Time (Total: ${formatMinutesToDuration(totalScreenMins)})">
        ${formatMinutesToDuration(avgScreenMins) || '--'}
      </td>
      ${habitFooterCells}
      <td class="metric-summary-val" style="color:var(--accent-gold); font-size:0.85rem;" title="Overall Month Habit Target Adherence">
        ${monthCompletionPct}%
      </td>
    </tr>
  `;

  // Attach matrix table interactive event listeners
  attachGridListeners(tbody);
}

// Helpers for Frequency Badges
function getShortFrequencyBadge(habit) {
  if (habit.frequencyType === 'daily') return 'Daily';
  if (habit.frequencyType === 'weekly_target') return `${habit.weeklyTarget || 4}x/wk`;
  if (habit.frequencyType === 'specific_days') {
    const DAY_CHARS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const days = (habit.specificDays || []).sort().map(d => DAY_CHARS[d]);
    return days.length > 0 ? days.join('·') : 'Flex';
  }
  return 'Daily';
}

// Helpers for time math
function parseWakeTimeToMins(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let [_, hStr, mStr, meridiem] = match;
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (meridiem) {
    if (meridiem.toLowerCase() === 'pm' && h < 12) h += 12;
    if (meridiem.toLowerCase() === 'am' && h === 12) h = 0;
  }
  return h * 60 + m;
}

function minsToWakeTimeStr(totalMins) {
  let h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridiem}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attachGridListeners(tbody) {
  // Habit toggle click
  tbody.querySelectorAll('.habit-toggle-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const day = parseInt(cell.getAttribute('data-day'), 10);
      const habitId = cell.getAttribute('data-habit-id');
      state.toggleHabit(day, habitId);
    });
  });

  // Metric inputs change, blur, and Enter key
  tbody.querySelectorAll('.metric-input').forEach(input => {
    const commitMetric = () => {
      const day = parseInt(input.getAttribute('data-day'), 10);
      const metric = input.getAttribute('data-metric');
      const rawVal = input.value.trim();

      let val = '';
      if (rawVal) {
        if (metric === 'wakeTime') {
          val = normalizeTimeString(rawVal);
          input.value = val;
        } else {
          const mins = parseDurationToMinutes(rawVal);
          if (mins > 0) {
            val = formatMinutesToDuration(mins);
            input.value = val;
          } else {
            val = '';
            input.value = '';
          }
        }
      } else {
        val = '';
        input.value = '';
      }

      state.setMetric(day, metric, val);
    };

    input.addEventListener('change', commitMetric);
    input.addEventListener('blur', commitMetric);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitMetric();
        input.blur();
      }
    });
  });
}
