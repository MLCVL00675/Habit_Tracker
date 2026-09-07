/* ==========================================================================
   CHRONOLOG // DEDICATED STREAKS & HABIT CONSISTENCY HUB
   ========================================================================== */

import { state } from '../state.js';
import { 
  MONTH_NAMES,
  getDaysInMonth, 
  getDayOfWeek, 
  WEEKDAYS_FULL, 
  WEEKDAYS_SHORT, 
  calculateHabitStreaks, 
  calculateGlobalConsistencyStreak, 
  sound, 
  showToast, 
  triggerConfetti, 
  escapeHtml 
} from '../utils.js';

let streaksFilter = 'all';
let streaksSort = 'streak-desc';

export function renderStreaksView() {
  const container = document.getElementById('streaks-tab');
  if (!container) return;

  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
  const today = new Date().getDate();

  // Compute stats for all habits
  const streakData = habits.map(h => {
    const { currentStreak, bestStreak } = calculateHabitStreaks(
      monthData, 
      h, 
      totalDays,
      (hab, y, m, d) => state.isHabitScheduledForDay(hab, y, m, d),
      state.currentYear,
      state.currentMonth
    );
    const targetDays = state.getHabitTargetDays(h, state.currentYear, state.currentMonth);
    
    // Count completed days in current month
    let doneDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (monthData.days[d]?.habits?.[h.id] === 'done') doneDays++;
    }
    const pct = targetDays > 0 ? Math.min(100, Math.round((doneDays / targetDays) * 100)) : 0;

    return {
      habit: h,
      currentStreak,
      bestStreak,
      doneDays,
      targetDays,
      pct
    };
  });

  // Calculate Global Consistency
  const globalStreak = calculateGlobalConsistencyStreak(
    monthData, 
    habits, 
    totalDays, 
    (h, y, m, d) => state.isHabitScheduledForDay(h, y, m, d),
    state.currentYear,
    state.currentMonth
  );

  const activeStreaksCount = streakData.filter(s => s.currentStreak > 0).length;
  const bestOverallStreak = Math.max(...streakData.map(s => Math.max(s.currentStreak, s.bestStreak)), 0);
  const totalLoggedChecks = streakData.reduce((acc, s) => acc + s.doneDays, 0);

  // Apply Filter
  let filtered = [...streakData];
  if (streaksFilter === 'active') {
    filtered = filtered.filter(s => s.currentStreak > 0);
  } else if (streaksFilter === 'flame') {
    filtered = filtered.filter(s => s.currentStreak >= 7);
  } else if (streaksFilter === 'needs-focus') {
    filtered = filtered.filter(s => s.currentStreak === 0);
  } else if (['Health', 'Discipline', 'Mindset', 'Growth', 'Physical', 'Spiritual', 'Planning', 'Hygiene'].includes(streaksFilter)) {
    filtered = filtered.filter(s => (s.habit.category || 'General').toLowerCase() === streaksFilter.toLowerCase());
  }

  // Apply Sort
  if (streaksSort === 'streak-desc') {
    filtered.sort((a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak);
  } else if (streaksSort === 'best-desc') {
    filtered.sort((a, b) => b.bestStreak - a.bestStreak || b.currentStreak - a.currentStreak);
  } else if (streaksSort === 'target-desc') {
    filtered.sort((a, b) => b.pct - a.pct);
  } else if (streaksSort === 'name-asc') {
    filtered.sort((a, b) => a.habit.name.localeCompare(b.habit.name));
  }

  // Build Streak Cards HTML
  const cardsHtml = filtered.map(item => {
    const { habit, currentStreak, bestStreak, doneDays, targetDays, pct } = item;
    const isHot = currentStreak >= 7;
    const isWarm = currentStreak >= 3 && currentStreak < 7;
    const isStarted = currentStreak >= 1 && currentStreak < 3;
    const isZero = currentStreak === 0;

    let statusTag = `<span class="streak-status-tag tag-zero">❄️ Frozen (0d)</span>`;
    if (isHot) statusTag = `<span class="streak-status-tag tag-hot">🔥 On Fire (${currentStreak}d)</span>`;
    else if (isWarm) statusTag = `<span class="streak-status-tag tag-warm">⚡ Building (${currentStreak}d)</span>`;
    else if (isStarted) statusTag = `<span class="streak-status-tag tag-started">🌱 Active (${currentStreak}d)</span>`;

    // Generate 31-Day Visual Streak Trail Dots
    let dotsHtml = '';
    for (let d = 1; d <= totalDays; d++) {
      const isScheduled = state.isHabitScheduledForDay(habit, state.currentYear, state.currentMonth, d);
      const stateVal = monthData.days[d]?.habits?.[habit.id] || 'none';
      const isPastOrToday = d <= today;

      let dotClass = 'dot-blank';
      let dotChar = '·';
      let dotTooltip = `Day ${d}: Blank`;

      if (stateVal === 'done') {
        dotClass = 'dot-done';
        dotChar = '✓';
        dotTooltip = `Day ${d}: Completed`;
      } else if (stateVal === 'missed') {
        dotClass = 'dot-missed';
        dotChar = '✗';
        dotTooltip = `Day ${d}: Missed`;
      } else if (!isScheduled && habit.frequencyType === 'specific_days') {
        dotClass = 'dot-rest';
        dotChar = '—';
        dotTooltip = `Day ${d}: Rest Day (Off Rule)`;
      }

      dotsHtml += `
        <div class="streak-trail-dot ${dotClass} ${d === today ? 'is-today' : ''}" 
             title="${escapeHtml(habit.name)} - ${dotTooltip}"
             data-day="${d}"
             data-habit-id="${habit.id}">
          <span>${dotChar}</span>
        </div>
      `;
    }

    const scheduleLabel = state.getHabitScheduleLabel(habit);
    const checkXP = state.getHabitCheckXP(habit);
    const masteryBonusXP = state.getHabitMasteryBonusXP(habit);
    const todayState = monthData.days[today]?.habits?.[habit.id] || 'none';
    const isTodayScheduled = state.isHabitScheduledForDay(habit, state.currentYear, state.currentMonth, today);

    return `
      <div class="streak-hub-card ${isHot ? 'card-on-fire' : ''}" data-habit-id="${habit.id}">
        <div class="streak-card-top">
          <div class="streak-habit-profile">
            <div class="streak-avatar-badge ${isHot ? 'avatar-fire-glow' : ''}">
              <span class="streak-avatar-icon">${habit.icon}</span>
            </div>
            <div class="streak-meta-info">
              <h3 class="streak-habit-title">${escapeHtml(habit.name)}</h3>
              <div class="streak-tags-line">
                <span class="streak-category-badge">${escapeHtml(habit.category || 'General')}</span>
                <span class="streak-frequency-badge">⚡ ${escapeHtml(scheduleLabel)}</span>
                <span class="streak-xp-tag" title="Earn +${checkXP} XP per completed check based on scheduled target commitment">✨ +${checkXP} XP</span>
                <span class="streak-mastery-tag" title="Achieve 100% of target days for +${masteryBonusXP} XP bonus">🎯 +${masteryBonusXP} XP Goal</span>
              </div>
            </div>
          </div>
          ${statusTag}
        </div>

        <!-- Metric Counter Badges Row -->
        <div class="streak-stats-row">
          <div class="streak-metric-box ${isHot ? 'box-hot' : ''}">
            <span class="metric-label">CURRENT STREAK</span>
            <div class="metric-val-wrap">
              <span class="fire-anim">${isHot ? '🔥' : (isWarm ? '⚡' : '🌱')}</span>
              <span class="metric-val">${currentStreak} <small>Days</small></span>
            </div>
          </div>
          <div class="streak-metric-box">
            <span class="metric-label">BEST RECORD</span>
            <div class="metric-val-wrap">
              <span>🏆</span>
              <span class="metric-val">${bestStreak} <small>Days</small></span>
            </div>
          </div>
          <div class="streak-metric-box">
            <span class="metric-label">MONTH PROGRESS</span>
            <div class="metric-val-wrap">
              <span>🎯</span>
              <span class="metric-val">${doneDays}/${targetDays} <small>(${pct}%)</small></span>
            </div>
          </div>
        </div>

        <!-- Monthly Mini Progress Bar -->
        <div class="streak-progress-track">
          <div class="streak-progress-fill" style="width: ${pct}%;"></div>
        </div>

        <!-- 31-Day Visual Streak Trail -->
        <div class="streak-trail-section">
          <div class="streak-trail-header">
            <span>31-Day Consistency Chain (${MONTH_NAMES[state.currentMonth - 1]})</span>
            <span class="trail-legend">
              <span class="legend-dot dot-done">✓</span> Done
              <span class="legend-dot dot-rest">—</span> Rest
              <span class="legend-dot dot-missed">✗</span> Miss
            </span>
          </div>
          <div class="streak-trail-grid">
            ${dotsHtml}
          </div>
        </div>

        <!-- Card Action Footer -->
        <div class="streak-card-footer">
          <span class="streak-foot-note">
            ${!isTodayScheduled ? '🛌 Today is a scheduled Rest Day' : (todayState === 'done' ? '✨ Completed for today!' : '⚡ Log today to maintain streak')}
          </span>
          <button class="btn-streak-quick-toggle ${todayState === 'done' ? 'btn-checked' : ''}" 
                  data-habit-id="${habit.id}" 
                  data-day="${today}">
            ${todayState === 'done' ? '✓ Done Today' : (todayState === 'missed' ? '✗ Missed' : '○ Log Today')}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="streaks-page-layout">
      <!-- Streaks Hero Banner -->
      <div class="streaks-hero-banner">
        <div class="streaks-hero-left">
          <div class="streaks-hero-flame-icon">
            <span class="flame-pulse-ring"></span>
            <span class="flame-emoji">🔥</span>
          </div>
          <div class="streaks-hero-text">
            <span class="streaks-hero-tag">ROUTINE MOMENTUM & CHAIN OF WILL</span>
            <h2 class="streaks-hero-title">Streaks & Habit Consistency Studio</h2>
            <p class="streaks-hero-desc">
              Unbroken discipline builds unshakeable habits. Track your active chains, milestone records, and monthly momentum.
            </p>
          </div>
        </div>

        <!-- KPI Pill Counters -->
        <div class="streaks-kpi-row">
          <div class="streak-kpi-chip">
            <span class="kpi-chip-icon">🔥</span>
            <div class="kpi-chip-info">
              <span class="kpi-chip-val">${globalStreak} Days</span>
              <span class="kpi-chip-lbl">Global Consistency</span>
            </div>
          </div>
          <div class="streak-kpi-chip">
            <span class="kpi-chip-icon">⚡</span>
            <div class="kpi-chip-info">
              <span class="kpi-chip-val">${activeStreaksCount} / ${habits.length}</span>
              <span class="kpi-chip-lbl">Active Chains</span>
            </div>
          </div>
          <div class="streak-kpi-chip">
            <span class="kpi-chip-icon">🏆</span>
            <div class="kpi-chip-info">
              <span class="kpi-chip-val">${bestOverallStreak} Days</span>
              <span class="kpi-chip-lbl">Month Record</span>
            </div>
          </div>
          <div class="streak-kpi-chip">
            <span class="kpi-chip-icon">✨</span>
            <div class="kpi-chip-info">
              <span class="kpi-chip-val">${totalLoggedChecks}</span>
              <span class="kpi-chip-lbl">Total Checks</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="streaks-controls-bar">
        <div class="streaks-filter-group">
          <button class="streaks-filter-btn ${streaksFilter === 'all' ? 'active' : ''}" data-filter="all">All Habits (${habits.length})</button>
          <button class="streaks-filter-btn ${streaksFilter === 'active' ? 'active' : ''}" data-filter="active">Active Streaks (${activeStreaksCount})</button>
          <button class="streaks-filter-btn ${streaksFilter === 'flame' ? 'active' : ''}" data-filter="flame">🔥 7+ Days Flame</button>
          <button class="streaks-filter-btn ${streaksFilter === 'needs-focus' ? 'active' : ''}" data-filter="needs-focus">❄️ Cold (0d)</button>
        </div>

        <div class="streaks-sort-wrap">
          <label class="sort-label" for="streaks-sort-select">Sort by:</label>
          <select id="streaks-sort-select" class="streaks-sort-select">
            <option value="streak-desc" ${streaksSort === 'streak-desc' ? 'selected' : ''}>🔥 Longest Current Streak</option>
            <option value="best-desc" ${streaksSort === 'best-desc' ? 'selected' : ''}>🏆 Best All-Time Streak</option>
            <option value="target-desc" ${streaksSort === 'target-desc' ? 'selected' : ''}>🎯 Highest Month Target %</option>
            <option value="name-asc" ${streaksSort === 'name-asc' ? 'selected' : ''}>🔤 Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Streaks Cards Grid -->
      <div class="streaks-cards-grid">
        ${cardsHtml.length > 0 ? cardsHtml : `
          <div class="streaks-empty-state">
            <span>🔍</span>
            <h4>No habits match the selected filter</h4>
            <p>Try switching to 'All Habits' or log your daily habits in the Monthly Grid.</p>
          </div>
        `}
      </div>
    </div>
  `;

  // Attach event handlers
  attachStreaksListeners(container, today);
}

function attachStreaksListeners(container, today) {
  // Filter buttons
  container.querySelectorAll('.streaks-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      streaksFilter = btn.getAttribute('data-filter') || 'all';
      renderStreaksView();
    });
  });

  // Sort dropdown
  const sortSelect = container.querySelector('#streaks-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      streaksSort = e.target.value;
      renderStreaksView();
    });
  }

  // Quick Log Today buttons
  container.querySelectorAll('.btn-streak-quick-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const habitId = btn.getAttribute('data-habit-id');
      const day = parseInt(btn.getAttribute('data-day'), 10) || today;
      state.toggleHabit(day, habitId);
      renderStreaksView();
    });
  });

  // Trail dot clicks
  container.querySelectorAll('.streak-trail-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const day = parseInt(dot.getAttribute('data-day'), 10);
      const habitId = dot.getAttribute('data-habit-id');
      if (day && habitId) {
        state.toggleHabit(day, habitId);
        renderStreaksView();
      }
    });
  });
}
