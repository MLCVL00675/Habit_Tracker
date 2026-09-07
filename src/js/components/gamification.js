/* ==========================================================================
   CHRONOLOG // GAMIFICATION, XP, QUESTS & BADGES COMPONENT
   ========================================================================== */

import { state, BADGE_DEFINITIONS, HABIT_DEFINITIONS, LEVEL_TIERS } from '../state.js';
import { getDaysInMonth, parseDurationToMinutes } from '../utils.js';

export function renderGamificationView() {
  const stats = state.calculateGamificationStats();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  // 1. Update Top Global Header Pill
  updateHeaderGamification(stats);

  // 2. Update Gamification Hero Card
  updateHeroCard(stats, monthData, totalDays);

  // 3. Render Quests
  renderQuests(monthData, totalDays);

  // 4. Render Badges Cabinet
  renderBadges(monthData, totalDays, stats);

  // 5. Render XP Economics Composition
  renderXPComposition(stats);

  // 6. Render 15-Tier Mastery Ladder
  renderLevelsLadder(stats);
}

function updateHeaderGamification(stats) {
  const lvlBadge = document.getElementById('header-level-badge');
  const rankTitle = document.getElementById('header-rank-title');
  const xpText = document.getElementById('header-xp-text');
  const xpFill = document.getElementById('header-xp-fill');

  if (lvlBadge) lvlBadge.textContent = `Lv. ${stats.level}`;
  if (rankTitle) rankTitle.textContent = stats.title;
  if (xpText) xpText.textContent = `${stats.xpInLevel.toLocaleString()} / ${stats.levelRange.toLocaleString()} XP`;
  if (xpFill) xpFill.style.width = `${stats.progressPct}%`;
}

function updateHeroCard(stats, monthData, totalDays) {
  const heroLvl = document.getElementById('hero-level-tag');
  const heroRank = document.getElementById('hero-rank-name');
  const heroDesc = document.getElementById('hero-rank-desc');
  const heroTotalXp = document.getElementById('hero-total-xp-display');
  const heroXpProgressText = document.getElementById('hero-xp-progress-text');
  const heroXpFill = document.getElementById('hero-xp-bar-fill');

  if (heroLvl) heroLvl.textContent = `Level ${stats.level}`;
  if (heroRank) heroRank.textContent = stats.title;
  if (heroDesc) heroDesc.textContent = stats.desc;
  if (heroTotalXp) heroTotalXp.textContent = `${stats.totalXP.toLocaleString()} Total XP`;
  if (heroXpProgressText) {
    heroXpProgressText.textContent = `${stats.xpInLevel.toLocaleString()} / ${stats.levelRange.toLocaleString()} XP (${stats.progressPct}%)`;
  }
  if (heroXpFill) heroXpFill.style.width = `${stats.progressPct}%`;

  // Compute Attribute counters
  let hydrationCount = 0;
  let disciplineCount = 0;
  let intellectMins = 0;
  let mindfulnessCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayRecord = monthData.days[d] || {};
    if (dayRecord.habits) {
      if (dayRecord.habits['water3L'] === 'done') hydrationCount++;
      if (dayRecord.habits['nomaf'] === 'done') disciplineCount++;
      if (dayRecord.habits['pray'] === 'done' || dayRecord.habits['sakhaRahasya'] === 'done') mindfulnessCount++;
    }
    const studyM = parseDurationToMinutes(dayRecord.studyTime);
    if (studyM > 0) intellectMins += studyM;
  }

  const attrHydration = document.getElementById('attr-hydration');
  const attrDiscipline = document.getElementById('attr-discipline');
  const attrIntellect = document.getElementById('attr-intellect');
  const attrMindfulness = document.getElementById('attr-mindfulness');

  if (attrHydration) attrHydration.textContent = `${hydrationCount}/${totalDays}`;
  if (attrDiscipline) attrDiscipline.textContent = `${disciplineCount}/${totalDays}`;
  if (attrIntellect) attrIntellect.textContent = `${Math.round(intellectMins / 60)} hrs`;
  if (attrMindfulness) attrMindfulness.textContent = `${mindfulnessCount}/${totalDays * 2}`;
}

// --------------------------------------------------------------------------
// ACTIVE QUESTS & BOUNTIES
// --------------------------------------------------------------------------
function renderQuests(monthData, totalDays) {
  const container = document.getElementById('quests-list');
  if (!container) return;

  // Evaluate dynamic quest completions
  let waterCount = 0;
  let studyTotalHours = 0;
  let workoutsCount = 0;
  let readBookCount = 0;
  let perfectDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayRecord = monthData.days[d] || {};
    let dayHabitsDone = 0;
    if (dayRecord.habits) {
      if (dayRecord.habits['water3L'] === 'done') waterCount++;
      if (dayRecord.habits['workout10k'] === 'done') workoutsCount++;
      if (dayRecord.habits['readBook'] === 'done') readBookCount++;
      Object.values(dayRecord.habits).forEach(s => {
        if (s === 'done') dayHabitsDone++;
      });
    }
    if (dayHabitsDone === HABIT_DEFINITIONS.length) perfectDays++;
    const studyM = parseDurationToMinutes(dayRecord.studyTime);
    if (studyM > 0) studyTotalHours += (studyM / 60);
  }

  const quests = [
    {
      id: 'quest_water',
      name: 'Hydration Flow',
      desc: 'Drink 3L water for at least 15 days this month',
      icon: '💧',
      progress: `${waterCount}/15`,
      completed: waterCount >= 15,
      reward: '+300 XP'
    },
    {
      id: 'quest_study',
      name: 'Deep Work Sprint',
      desc: 'Accumulate 25+ hours of focused study time',
      icon: '📚',
      progress: `${Math.round(studyTotalHours)}/25 hrs`,
      completed: studyTotalHours >= 25,
      reward: '+500 XP'
    },
    {
      id: 'quest_reading',
      name: 'Scholar of Wisdom',
      desc: 'Complete Read Book habit for at least 15 days',
      icon: '📖',
      progress: `${readBookCount}/15 days`,
      completed: readBookCount >= 15,
      reward: '+400 XP'
    },
    {
      id: 'quest_workout',
      name: 'Physical Dominance',
      desc: 'Complete 10k steps or workout 12 times',
      icon: '🏋️',
      progress: `${workoutsCount}/12`,
      completed: workoutsCount >= 12,
      reward: '+350 XP'
    },
    {
      id: 'quest_perfect',
      name: 'Flawless Synchrony',
      desc: 'Achieve at least 3 perfect days (100% habits done)',
      icon: '🌟',
      progress: `${perfectDays}/3 days`,
      completed: perfectDays >= 3,
      reward: '+600 XP'
    }
  ];

  container.innerHTML = quests.map(q => `
    <div class="quest-card ${q.completed ? 'completed' : ''}">
      <div class="quest-left">
        <span class="quest-icon">${q.icon}</span>
        <div class="quest-info">
          <div class="quest-name">${q.name} ${q.completed ? '✅ (Completed)' : ''}</div>
          <div class="quest-desc">${q.desc}</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
        <span class="quest-reward">${q.reward}</span>
        <span style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted);">${q.progress}</span>
      </div>
    </div>
  `).join('');
}

// --------------------------------------------------------------------------
// MASTERY BADGES & TROPHIES
// --------------------------------------------------------------------------
function renderBadges(monthData, totalDays, stats) {
  const container = document.getElementById('badges-grid');
  const summaryEl = document.getElementById('badge-completion-summary');
  const badgeCounterEl = document.getElementById('unlocked-badge-count');
  if (!container) return;

  const unlockedBadges = state.evaluateBadges(monthData);
  const unlockedIds = new Set(unlockedBadges.map(b => b.id));
  const unlockedCount = unlockedBadges.length;

  container.innerHTML = BADGE_DEFINITIONS.map(b => {
    const isUnlocked = unlockedIds.has(b.id);
    return `
      <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" title="${b.name}: ${b.desc} (+${b.xp} XP)">
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-name">${b.name}</span>
        <span class="badge-status-tag">${isUnlocked ? `UNLOCKED (+${b.xp} XP)` : 'LOCKED'}</span>
      </div>
    `;
  }).join('');

  if (summaryEl) summaryEl.textContent = `${unlockedCount} / ${BADGE_DEFINITIONS.length} Unlocked (+${stats.unlockedBadgesXP.toLocaleString()} XP)`;
  if (badgeCounterEl) badgeCounterEl.textContent = unlockedCount;
}

// --------------------------------------------------------------------------
// XP LIVE COMPOSITION
// --------------------------------------------------------------------------
function renderXPComposition(stats) {
  const container = document.getElementById('xp-breakdown-chips');
  if (!container) return;

  container.innerHTML = `
    <div class="xp-source-chip">
      <span class="chip-source-icon">⚡</span>
      <div class="chip-source-meta">
        <span class="chip-source-name">Habit Checks (Days-Scaled)</span>
        <span class="chip-source-val">+${stats.habitCheckXP.toLocaleString()} XP</span>
      </div>
    </div>
    <div class="xp-source-chip">
      <span class="chip-source-icon">🎯</span>
      <div class="chip-source-meta">
        <span class="chip-source-name">Target Masteries (100% Goal)</span>
        <span class="chip-source-val">+${stats.masteryBonusXP.toLocaleString()} XP</span>
      </div>
    </div>
    <div class="xp-source-chip">
      <span class="chip-source-icon">🌟</span>
      <div class="chip-source-meta">
        <span class="chip-source-name">Perfect Days (+15 XP ea)</span>
        <span class="chip-source-val">+${stats.perfectDaysXP.toLocaleString()} XP</span>
      </div>
    </div>
    <div class="xp-source-chip">
      <span class="chip-source-icon">🏅</span>
      <div class="chip-source-meta">
        <span class="chip-source-name">Unlocked Mastery Badges</span>
        <span class="chip-source-val">+${stats.unlockedBadgesXP.toLocaleString()} XP</span>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 50-TIER LEVEL MASTERY LADDER (10 MASTERY REALMS)
// --------------------------------------------------------------------------
const REALM_TITLES = [
  'Realm I: Foundation of Will',
  'Realm II: Awakening of Focus',
  'Realm III: Temple of Consistency',
  'Realm IV: Fortress of Discipline',
  'Realm V: Zenith of Mastery',
  'Realm VI: Transcendent Mind',
  'Realm VII: Eternal Crucible',
  'Realm VIII: Astral Dominion',
  'Realm IX: Cosmic Primordial',
  'Realm X: Absolute Transcendence'
];

const REALM_ICONS = ['🌱', '⚡', '🏛️', '🛡️', '👑', '🌌', '🔥', '✨', '🪐', '💎'];

function renderLevelsLadder(stats) {
  const container = document.getElementById('levels-ladder-list');
  const pill = document.getElementById('current-tier-indicator-pill');
  if (!container) return;

  if (pill) {
    pill.textContent = `Level ${stats.level} · ${stats.title}`;
  }

  let html = '';

  LEVEL_TIERS.forEach((tier, index) => {
    // Add Realm Header every 5 levels
    if (index % 5 === 0) {
      const realmIdx = Math.floor(index / 5);
      const realmName = REALM_TITLES[realmIdx] || `Realm ${realmIdx + 1}`;
      const realmIcon = REALM_ICONS[realmIdx] || '👑';
      html += `
        <div class="ladder-realm-header">
          <span class="realm-icon">${realmIcon}</span>
          <span class="realm-title">${realmName}</span>
          <span class="realm-span">Levels ${index + 1}–${index + 5}</span>
        </div>
      `;
    }

    const isCurrent = tier.level === stats.level;
    const isUnlocked = stats.totalXP >= tier.minXp;

    html += `
      <div class="ladder-tier-row ${isCurrent ? 'tier-current' : (isUnlocked ? 'tier-achieved' : 'tier-locked')}" data-level="${tier.level}">
        <div class="ladder-tier-badge">
          <span class="ladder-lvl-num">Lv.${tier.level}</span>
          ${isCurrent ? '<span class="ladder-current-pulse">YOU ARE HERE</span>' : ''}
        </div>
        <div class="ladder-tier-info">
          <div class="ladder-tier-name-row">
            <span class="ladder-tier-title">${tier.title}</span>
            <span class="ladder-tier-range">${tier.minXp.toLocaleString()} – ${tier.maxXp.toLocaleString()} XP</span>
          </div>
          <div class="ladder-tier-desc">${tier.desc}</div>
        </div>
        <div class="ladder-tier-status">
          ${isCurrent ? '<span class="status-current-tag">⚡ Current Rank</span>' : (isUnlocked ? '<span class="status-unlocked-tag">✓ Achieved</span>' : '<span class="status-locked-tag">🔒 Locked</span>')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
