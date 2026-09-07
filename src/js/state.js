/* ==========================================================================
   CHRONOLOG // CENTRAL STATE & PERSISTENCE ENGINE
   ========================================================================== */

import { MONTH_NAMES, getDaysInMonth, getDayOfWeek, parseDurationToMinutes, sound, showToast, triggerConfetti } from './utils.js';

// Default Initial 12 Bullet Journal Habits with Frequency Configurations
export const DEFAULT_HABITS = [
  { id: 'mediaAffirm', name: 'Meditation + Affirm', icon: '🧘', category: 'Mindset', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'water3L', name: 'Water 3L', icon: '💧', category: 'Health', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'nomaf', name: 'NOMAF', icon: '⚡', category: 'Discipline', frequencyType: 'specific_days', weeklyTarget: 6, specificDays: [1, 2, 3, 4, 5, 6] },
  { id: 'readBook', name: 'Read book', icon: '📖', category: 'Growth', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'vitaminD', name: 'Vitamin D Tablet', icon: '☀️', category: 'Health', frequencyType: 'specific_days', weeklyTarget: 1, specificDays: [0] },
  { id: 'vitTabs', name: 'Vitamin tablets', icon: '💊', category: 'Health', frequencyType: 'specific_days', weeklyTarget: 3, specificDays: [2, 4, 6] },
  { id: 'gripper', name: 'Latitha Sahasra...', icon: '🙏', category: 'Spiritual', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'sakhaRahasya', name: 'Gripper', icon: '✊', category: 'Physical', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'nextDayTodo', name: 'Next day todo', icon: '📝', category: 'Planning', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'skinCare', name: 'Skin care', icon: '✨', category: 'Hygiene', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] },
  { id: 'workout10k', name: 'Workout / 10k', icon: '🏋️', category: 'Physical', frequencyType: 'weekly_target', weeklyTarget: 4, specificDays: [] },
  { id: 'pray', name: 'Pray', icon: '🙏', category: 'Spiritual', frequencyType: 'daily', weeklyTarget: 7, specificDays: [] }
];

export const HABIT_DEFINITIONS = DEFAULT_HABITS;

// Gamification Level Tiers (50 Levels across 10 Mastery Realms with calibrated XP progression)
export const LEVEL_TIERS = [
  // Realm 1: Foundation of Will (Levels 1–5)
  { level: 1, minXp: 0, maxXp: 300, title: 'Novice Aspirant', desc: 'Begin your journey of unbreakable daily rituals.' },
  { level: 2, minXp: 300, maxXp: 700, title: 'Initiate of Habit', desc: 'First roots of conscious discipline taking hold.' },
  { level: 3, minXp: 700, maxXp: 1200, title: 'Apprentice of Will', desc: 'Consistency begins to manifest in daily actions.' },
  { level: 4, minXp: 1200, maxXp: 1800, title: 'Routine Seeker', desc: 'Daily patterns becoming second nature.' },
  { level: 5, minXp: 1800, maxXp: 2500, title: 'Steadfast Practitioner', desc: 'Overcoming resistance with steady daily practice.' },

  // Realm 2: Awakening of Focus (Levels 6–10)
  { level: 6, minXp: 2500, maxXp: 3400, title: 'Discipline Adept', desc: 'Distractions fade as unbreakable focus emerges.' },
  { level: 7, minXp: 3400, maxXp: 4400, title: 'Dawn Victor', desc: 'Early mornings and structured routines aligned.' },
  { level: 8, minXp: 4400, maxXp: 5600, title: 'Iron Resolve', desc: 'Mental resilience defying excuses and fatigue.' },
  { level: 9, minXp: 5600, maxXp: 7000, title: 'Mindful Guardian', desc: 'Deep awareness anchored into every logged action.' },
  { level: 10, minXp: 7000, maxXp: 8600, title: 'Sentinel of Order', desc: 'Order and purpose commanding every hour.' },

  // Realm 3: Temple of Consistency (Levels 11–15)
  { level: 11, minXp: 8600, maxXp: 10400, title: 'Cognitive Scholar', desc: 'Deep work and intellectual mastery expanding.' },
  { level: 12, minXp: 10400, maxXp: 12500, title: 'Ritual Craftsman', desc: 'Shaping life through precise, intentional habits.' },
  { level: 13, minXp: 12500, maxXp: 15000, title: 'Ascendant Disciple', desc: 'Momentum building across physical and mental realms.' },
  { level: 14, minXp: 15000, maxXp: 18000, title: 'Deep Work Specialist', desc: 'High-leverage focus sustaining profound outputs.' },
  { level: 15, minXp: 18000, maxXp: 21500, title: 'Master of Daily Flow', desc: 'Seamless transition between grueling tasks and recovery.' },

  // Realm 4: Fortress of Discipline (Levels 16–20)
  { level: 16, minXp: 21500, maxXp: 25500, title: 'Vanguard of Will', desc: 'Leading through uncompromising personal standards.' },
  { level: 17, minXp: 25500, maxXp: 30000, title: 'Ironclad Strategist', desc: 'Long-term vision executing with daily perfection.' },
  { level: 18, minXp: 30000, maxXp: 35000, title: 'Resilience Knight', desc: 'Unflinching fortitude in the face of chaos.' },
  { level: 19, minXp: 35000, maxXp: 41000, title: 'Stoic Vanguard', desc: 'Emotional equilibrium empowering relentless action.' },
  { level: 20, minXp: 41000, maxXp: 48000, title: 'Discipline Commander', desc: 'Dominating routines with military precision.' },

  // Realm 5: Zenith of Mastery (Levels 21–25)
  { level: 21, minXp: 48000, maxXp: 56000, title: 'Architect of Habit', desc: 'Systematizing greatness into automated reflex.' },
  { level: 22, minXp: 56000, maxXp: 65000, title: 'Kinetic Master', desc: 'Physical strength and cognitive rigor operating in unison.' },
  { level: 23, minXp: 65000, maxXp: 75000, title: 'Zenith Scholar', desc: 'Peak cognitive endurance during marathon deep sessions.' },
  { level: 24, minXp: 75000, maxXp: 86000, title: 'Pillar of Constancy', desc: 'An unshakable rock of unwavering daily habit execution.' },
  { level: 25, minXp: 86000, maxXp: 98000, title: 'Grandmaster of Routine', desc: 'A living embodiment of daily discipline and momentum.' },

  // Realm 6: Transcendent Mind (Levels 26–30)
  { level: 26, minXp: 98000, maxXp: 112000, title: 'Sovereign Disciple', desc: 'Absolute clarity of purpose guiding each checkbox.' },
  { level: 27, minXp: 112000, maxXp: 128000, title: 'Unshakable Ascendant', desc: 'Transcending low motivation through sheer system strength.' },
  { level: 28, minXp: 128000, maxXp: 146000, title: 'Temporal Master', desc: 'Unbending mastery over time, energy, and priority.' },
  { level: 29, minXp: 146000, maxXp: 166000, title: 'Sanctum Keeper', desc: 'Guarding sacred daily focus against all distraction.' },
  { level: 30, minXp: 166000, maxXp: 188000, title: 'Lord of Discipline', desc: 'A towering pillar of elite execution and self-rule.' },

  // Realm 7: Eternal Crucible (Levels 31–35)
  { level: 31, minXp: 188000, maxXp: 212000, title: 'Titan of Willpower', desc: 'Relentless drive pushing past all normal human limits.' },
  { level: 32, minXp: 212000, maxXp: 238000, title: 'Adamantine Vanguard', desc: 'Indomitable willpower forged in months of consistency.' },
  { level: 33, minXp: 238000, maxXp: 266000, title: 'Supreme Mind', desc: 'Cognitive stamina operating at peak flow state.' },
  { level: 34, minXp: 266000, maxXp: 296000, title: 'Eternal Strategist', desc: 'Compound habits generating exponential life growth.' },
  { level: 35, minXp: 296000, maxXp: 328000, title: 'High Archon of Habit', desc: 'Flawless governance over body, mind, and energy.' },

  // Realm 8: Astral Dominion (Levels 36–40)
  { level: 36, minXp: 328000, maxXp: 362000, title: 'Astral Paragon', desc: 'Radiating unstoppable discipline and radiant focus.' },
  { level: 37, minXp: 362000, maxXp: 398000, title: 'Apex Sovereign', desc: 'Dominion over every waking hour and nightly recovery.' },
  { level: 38, minXp: 398000, maxXp: 436000, title: 'Celestial Architect', desc: 'Engineering reality through unwavering daily actions.' },
  { level: 39, minXp: 436000, maxXp: 476000, title: 'Demiurge of Will', desc: 'Forging destiny through compounding daily mastery.' },
  { level: 40, minXp: 476000, maxXp: 518000, title: 'Ascended Sovereign', desc: 'A rare human standard of uncompromising excellence.' },

  // Realm 9: Cosmic Primordial (Levels 41–45)
  { level: 41, minXp: 518000, maxXp: 562000, title: 'Cosmic Vanguard', desc: 'Harmonizing physical peak and deep intellectual output.' },
  { level: 42, minXp: 562000, maxXp: 608000, title: 'Infinite Luminary', desc: 'An inspiring beacon of compound consistency.' },
  { level: 43, minXp: 608000, maxXp: 656000, title: 'Primordial Architect', desc: 'Years of compound execution shaping elite reality.' },
  { level: 44, minXp: 656000, maxXp: 706000, title: 'Omni-Discipline Lord', desc: 'Complete transcendence over procrastination and doubt.' },
  { level: 45, minXp: 706000, maxXp: 758000, title: 'Immortal Chronarch', desc: 'Master of time itself through sacred daily routines.' },

  // Realm 10: Absolute Transcendence (Levels 46–50)
  { level: 46, minXp: 758000, maxXp: 812000, title: 'Mythic Overlord', desc: 'Mythological levels of human discipline and willpower.' },
  { level: 47, minXp: 812000, maxXp: 868000, title: 'Transcendent Pillar', desc: 'An eternal monument to unbreakable daily rituals.' },
  { level: 48, minXp: 868000, maxXp: 926000, title: 'Avatar of Consistency', desc: 'Pure willpower manifested into physical reality.' },
  { level: 49, minXp: 926000, maxXp: 1000000, title: 'Eternal Paragon', desc: 'On the precipice of absolute ultimate human mastery.' },
  { level: 50, minXp: 1000000, maxXp: 1200000, title: 'Transcendent Titan', desc: 'The absolute pinnacle of human willpower and unyielding discipline.' }
];

// Achievement Badges (Calibrated tighter XP values)
export const BADGE_DEFINITIONS = [
  { id: 'hydrated', name: 'Hydration Master', icon: '💧', desc: 'Maintain 7-day streak of Water 3L', xp: 40 },
  { id: 'nomaf_hero', name: 'Iron Will', icon: '⚡', desc: 'Maintain 7-day streak of NOMAF', xp: 50 },
  { id: 'early_bird', name: 'Dawn Victor', icon: '🌅', desc: 'Wake up at or before 6:30 AM for 5 days', xp: 45 },
  { id: 'bookworm', name: 'Scholar of Truth', icon: '📖', desc: 'Complete Read Book 15 times in a month', xp: 50 },
  { id: 'iron_body', name: 'Physical Peak', icon: '🏋️', desc: 'Complete Workout/10k & Gripper 10 times', xp: 60 },
  { id: 'inner_peace', name: 'Inner Sanctum', icon: '🙏', desc: 'Complete Pray & Sakha Rahasya 10 times', xp: 50 },
  { id: 'study_beast', name: 'Deep Work Titan', icon: '📚', desc: 'Log over 30 hours of Study time in the month', xp: 75 },
  { id: 'perfect_day', name: 'Flawless Execution', icon: '🌟', desc: 'Complete 100% of habits in a single day', xp: 40 },
  { id: 'habit_legend', name: 'Habit Luminary', icon: '👑', desc: 'Complete 75+ total habit checks across the month', xp: 60 },
  { id: 'streak_titan', name: 'Discipline Titan', icon: '🔥', desc: 'Reach a 7-day overall routine consistency streak', xp: 80 },
  { id: 'centurion', name: 'Centurion', icon: '💎', desc: 'Log 100 total completed habit checkboxes', xp: 100 },
  { id: 'screen_detox', name: 'Digital Monk', icon: '📵', desc: 'Keep phone screen time under 2 hrs for 5 days', xp: 50 }
];

// Initial State Creator
export function createDefaultMonthData(year, month, habitsList = DEFAULT_HABITS) {
  const totalDays = getDaysInMonth(year, month);
  const days = {};

  for (let d = 1; d <= totalDays; d++) {
    const habits = {};
    habitsList.forEach(h => {
      habits[h.id] = 'none'; // 'none' | 'done' | 'missed'
    });

    days[d] = {
      wakeTime: '',
      sleepTime: '',
      studyTime: '',
      screenTime: '',
      caloriesIn: '',
      caloriesBurned: '',
      habits: habits
    };
  }

  return {
    year,
    month,
    days,
    monthlyTheme: 'Unshakable Focus & Physical Mastery',
    monthlyReflection: '',
    monthlyTodos: [
      { id: 'todo-1', text: 'Master Distributed Systems & Cloud Architecture fundamentals', priority: 'high', completed: false },
      { id: 'todo-2', text: 'Read 2 deep technical / philosophy books this month', priority: 'med', completed: false },
      { id: 'todo-3', text: 'Complete 25 days of 10k steps / intense workouts', priority: 'high', completed: false },
      { id: 'todo-4', text: 'Maintain flawless 3L water hydration discipline', priority: 'med', completed: true },
      { id: 'todo-5', text: 'Sakha Rahasya and daily spiritual reflection sessions', priority: 'low', completed: false }
    ]
  };
}

// Pre-populated Sample Data for August 2026 showcasing all 6 gradient tiers
export function createSampleAugust2026Data(habitsList = DEFAULT_HABITS) {
  const monthData = createDefaultMonthData(2026, 8, habitsList);

  const sampleWakeTimes = ['06:00 AM', '06:15 AM', '05:45 AM', '06:30 AM', '06:00 AM', '06:10 AM', '07:00 AM'];
  const sampleSleep = ['7h 30m', '8h 00m', '7h 15m', '6h 45m', '7h 45m', '8h 15m'];
  const sampleStudy = ['4h 30m', '5h 00m', '3h 45m', '6h 15m', '4h 00m', '5h 30m', '2h 30m'];
  const sampleScreen = ['1h 45m', '1h 15m', '2h 10m', '1h 30m', '0h 55m', '2h 30m', '1h 20m'];
  const sampleCaloriesIn = ['2,100 kcal', '2,250 kcal', '1,950 kcal', '2,300 kcal', '2,050 kcal', '2,150 kcal'];
  const sampleCaloriesBurned = ['550 kcal', '620 kcal', '480 kcal', '700 kcal', '500 kcal', '580 kcal'];

  // Distribution across 6 gradient levels:
  // 100% (12/12): Days 10, 16, 20 (Celestial Holographic)
  // 76%-99% (10-11/12): Days 4, 9, 11, 14, 19 (Amber Gold)
  // 51%-75% (7-9/12): Days 1, 3, 7, 12, 17, 18, 21 (Emerald Jade)
  // 26%-50% (4-6/12): Days 5, 8, 15, 22 (Neon Cyan)
  // 1%-25% (1-3/12): Days 2, 6, 13, 23 (Electric Violet)
  // 0% (0/12): Days 24-31 (Dark Slate)
  const targetDoneCounts = {
    1: 8, 2: 2, 3: 7, 4: 11, 5: 5, 6: 3, 7: 9, 8: 6,
    9: 10, 10: 12, 11: 10, 12: 8, 13: 2, 14: 11, 15: 4,
    16: 12, 17: 9, 18: 8, 19: 11, 20: 12, 21: 7, 22: 5, 23: 3
  };

  for (let d = 1; d <= 23; d++) {
    const dayObj = monthData.days[d];
    dayObj.wakeTime = sampleWakeTimes[d % sampleWakeTimes.length];
    dayObj.sleepTime = sampleSleep[d % sampleSleep.length];
    dayObj.studyTime = sampleStudy[d % sampleStudy.length];
    dayObj.screenTime = sampleScreen[d % sampleScreen.length];
    dayObj.caloriesIn = sampleCaloriesIn[d % sampleCaloriesIn.length];
    dayObj.caloriesBurned = sampleCaloriesBurned[d % sampleCaloriesBurned.length];

    const dow = getDayOfWeek(2026, 8, d);
    const targetDone = targetDoneCounts[d] || 0;
    habitsList.forEach((h, idx) => {
      const isScheduled = h.frequencyType === 'specific_days'
        ? (Array.isArray(h.specificDays) && h.specificDays.includes(dow))
        : true;

      if (!isScheduled && h.frequencyType === 'specific_days') {
        dayObj.habits[h.id] = 'none'; // Violet Dash Rest Day
      } else {
        dayObj.habits[h.id] = idx < targetDone ? 'done' : 'missed';
      }
    });
  }

  return monthData;
}

// Global App State Class
class AppState {
  constructor() {
    this.currentYear = 2026;
    this.currentMonth = 9; // Default to September 2026
    this.habits = DEFAULT_HABITS.map(h => ({ ...h }));
    this.allMonthsData = {}; // key: "YYYY-MM"
    this.theme = 'dark';
    this.soundEnabled = true;
    this.filterMode = 'all';
    this.streakSortMode = 'default';

    this.listeners = [];
  }

  init() {
    this.loadFromStorage();

    // Ensure the current active month has data initialized
    const currentKey = this.getMonthKey();
    if (!this.allMonthsData[currentKey]) {
      this.allMonthsData[currentKey] = createDefaultMonthData(this.currentYear, this.currentMonth, this.habits);
    }

    this.sanitizeUnscheduledDays();
    this.autoMarkPastUnloggedHabits();
    this.saveToStorage();
    this.initCrossTabSync();
  }

  getTodayDate() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    };
  }

  isToday(year, month, day) {
    const now = new Date();
    return now.getFullYear() === year && (now.getMonth() + 1) === month && now.getDate() === day;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // --------------------------------------------------------------------------
  // HABITS MANAGEMENT (CRUD & FREQUENCY)
  // --------------------------------------------------------------------------
  getHabits() {
    return this.habits;
  }

  getHabit(id) {
    return this.habits.find(h => h.id === id);
  }

  addHabit(habitData) {
    const id = habitData.id || `habit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newHabit = {
      id,
      name: habitData.name.trim(),
      icon: habitData.icon || '⭐',
      category: habitData.category || 'General',
      frequencyType: habitData.frequencyType || 'daily', // 'daily' | 'weekly_target' | 'specific_days'
      weeklyTarget: parseInt(habitData.weeklyTarget, 10) || 7,
      specificDays: Array.isArray(habitData.specificDays) ? habitData.specificDays : []
    };

    this.habits.push(newHabit);

    // Initialize state slot in all loaded months
    Object.values(this.allMonthsData).forEach(m => {
      if (m.days) {
        Object.values(m.days).forEach(d => {
          if (d.habits && d.habits[id] === undefined) {
            d.habits[id] = 'none';
          }
        });
      }
    });

    this.sanitizeUnscheduledDays();
    this.autoMarkPastUnloggedHabits();
    this.saveToStorage();
    this.notify();
    sound.playLevelUp();
    showToast(`Added habit "${newHabit.name}"`, '✨');
    return newHabit;
  }

  updateHabit(id, updatedFields) {
    const idx = this.habits.findIndex(h => h.id === id);
    if (idx === -1) return false;

    this.habits[idx] = {
      ...this.habits[idx],
      ...updatedFields,
      name: (updatedFields.name !== undefined ? updatedFields.name : this.habits[idx].name).trim(),
      weeklyTarget: updatedFields.weeklyTarget !== undefined ? parseInt(updatedFields.weeklyTarget, 10) : this.habits[idx].weeklyTarget,
      specificDays: Array.isArray(updatedFields.specificDays) ? updatedFields.specificDays : this.habits[idx].specificDays
    };

    this.sanitizeUnscheduledDays();
    this.autoMarkPastUnloggedHabits();
    this.saveToStorage();
    this.notify();
    showToast(`Updated "${this.habits[idx].name}"`, '✏️');
    return true;
  }

  // Auto-mark scheduled unlogged habits from yesterday and earlier past days as 'missed'
  // Unscheduled rest days are preserved as 'none' (violet dash —) and can never be 'missed'
  autoMarkPastUnloggedHabits() {
    const now = new Date();
    const realYear = now.getFullYear();
    const realMonth = now.getMonth() + 1;
    const realDay = now.getDate();

    Object.entries(this.allMonthsData).forEach(([key, monthData]) => {
      if (!monthData || !monthData.days) return;
      const [yStr, mStr] = key.split('-').map(Number);
      const year = yStr || monthData.year || this.currentYear;
      const month = mStr || monthData.month || this.currentMonth;
      const totalDays = getDaysInMonth(year, month);

      let maxPastDay = 0;
      if (year < realYear || (year === realYear && month < realMonth)) {
        // Entire month is in the past
        maxPastDay = totalDays;
      } else if (year === realYear && month === realMonth) {
        // Current real month: yesterday and earlier
        maxPastDay = realDay - 1;
      } else {
        // Future months have no past days
        maxPastDay = 0;
      }

      if (maxPastDay <= 0) return;

      for (let d = 1; d <= Math.min(totalDays, maxPastDay); d++) {
        const dayRecord = monthData.days[d];
        if (!dayRecord) continue;
        if (!dayRecord.habits) dayRecord.habits = {};

        this.habits.forEach(h => {
          const isScheduled = this.isHabitScheduledForDay(h, year, month, d);
          const currentStatus = dayRecord.habits[h.id];

          if (h.frequencyType === 'daily') {
            // Strict daily habit on past day: unlogged is missed ('missed')
            if (!currentStatus || currentStatus === 'none') {
              dayRecord.habits[h.id] = 'missed';
            }
          } else if (h.frequencyType === 'specific_days') {
            if (isScheduled) {
              // Scheduled day on past day: unlogged is missed ('missed')
              if (!currentStatus || currentStatus === 'none') {
                dayRecord.habits[h.id] = 'missed';
              }
            } else {
              // Unscheduled rest day: strictly 'none' (violet dash —) unless checked as 'done'
              if (currentStatus !== 'done') {
                dayRecord.habits[h.id] = 'none';
              }
            }
          } else if (h.frequencyType === 'weekly_target') {
            // Flexible weekly target (e.g. 4x/wk): unlogged past days remain flexible blanks ('none')
            if (!currentStatus) {
              dayRecord.habits[h.id] = 'none';
            }
          }
        });
      }
    });
  }

  sanitizeUnscheduledDays() {
    this.habits.forEach(h => {
      if (h.frequencyType === 'specific_days') {
        Object.entries(this.allMonthsData).forEach(([key, m]) => {
          if (m && m.days) {
            const [yStr, mStr] = key.split('-').map(Number);
            const y = yStr || this.currentYear;
            const mNum = mStr || this.currentMonth;
            Object.entries(m.days).forEach(([dayStr, dayObj]) => {
              const d = parseInt(dayStr, 10);
              const isScheduled = this.isHabitScheduledForDay(h, y, mNum, d);
              if (!isScheduled && dayObj.habits) {
                // If it's an unscheduled rest day, it can only be 'done' (if user explicitly checked it) or 'none'
                if (dayObj.habits[h.id] !== 'done') {
                  dayObj.habits[h.id] = 'none';
                }
              }
            });
          }
        });
      }
    });
  }

  deleteHabit(id) {
    const habit = this.getHabit(id);
    const name = habit ? habit.name : 'Habit';
    this.habits = this.habits.filter(h => h.id !== id);

    // Remove habit from all month records
    Object.values(this.allMonthsData).forEach(m => {
      if (m.days) {
        Object.values(m.days).forEach(d => {
          if (d.habits && d.habits[id]) {
            delete d.habits[id];
          }
        });
      }
    });

    this.saveToStorage();
    this.notify();
    showToast(`Deleted habit "${name}"`, '🗑️');
  }

  reorderHabit(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.habits.length || toIndex < 0 || toIndex >= this.habits.length) return;
    const [moved] = this.habits.splice(fromIndex, 1);
    this.habits.splice(toIndex, 0, moved);
    this.saveToStorage();
    this.notify();
  }

  // Check if habit is scheduled for a specific day
  isHabitScheduledForDay(habit, year, month, day) {
    if (!habit) return false;
    if (habit.frequencyType === 'daily') return true;
    if (habit.frequencyType === 'weekly_target') return true; // Flexible daily completion toward target
    if (habit.frequencyType === 'specific_days') {
      const dayOfWeek = getDayOfWeek(year, month, day); // 0=Sun, 6=Sat
      return Array.isArray(habit.specificDays) && habit.specificDays.includes(dayOfWeek);
    }
    return true;
  }

  // Calculate monthly target day count for a habit
  getHabitTargetDays(habit, year, month) {
    const totalDays = getDaysInMonth(year, month);
    if (!habit) return totalDays;

    if (habit.frequencyType === 'daily') {
      return totalDays;
    }

    if (habit.frequencyType === 'weekly_target') {
      const target = habit.weeklyTarget || 7;
      return Math.min(totalDays, Math.round(target * (totalDays / 7)));
    }

    if (habit.frequencyType === 'specific_days') {
      const daysArray = habit.specificDays || [];
      if (daysArray.length === 0) return 0;
      let count = 0;
      for (let d = 1; d <= totalDays; d++) {
        const dow = getDayOfWeek(year, month, d);
        if (daysArray.includes(dow)) count++;
      }
      return count;
    }

    return totalDays;
  }

  // Readable schedule summary for badges & chips
  getHabitScheduleLabel(habit) {
    if (!habit) return 'Daily';
    if (habit.frequencyType === 'daily') return 'Daily (7x/wk)';
    if (habit.frequencyType === 'weekly_target') return `${habit.weeklyTarget || 4}x / week`;
    if (habit.frequencyType === 'specific_days') {
      const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = (habit.specificDays || []).sort().map(d => DAY_LABELS[d]);
      return days.length > 0 ? days.join('·') : 'No days';
    }
    return 'Daily';
  }

  // Dynamic XP per completion based directly on number of scheduled target days (Reduced discipline values: 3 to 10 XP)
  getHabitCheckXP(habit, year = this.currentYear, month = this.currentMonth) {
    if (!habit) return 3;
    const totalDays = getDaysInMonth(year, month);
    const targetDays = this.getHabitTargetDays(habit, year, month);
    // Scaled dynamically: Daily (30-31d) = +10 XP, 6x/wk = +9 XP, 4x/wk = +7 XP, 3x/wk = +6 XP, 1x/wk = +4 XP
    const commitmentBonus = totalDays > 0 ? Math.round((targetDays / totalDays) * 7) : 0;
    return Math.max(3, 3 + commitmentBonus);
  }

  // Monthly 100% Target Mastery Bonus XP (scaled by scheduled commitment: +2 XP / target day)
  getHabitMasteryBonusXP(habit, year = this.currentYear, month = this.currentMonth) {
    const targetDays = this.getHabitTargetDays(habit, year, month);
    return targetDays * 2; // e.g. 30 days = +60 XP bonus; 4 days = +8 XP bonus
  }

  // --------------------------------------------------------------------------
  // MONTH & DATE NAVIGATION
  // --------------------------------------------------------------------------
  getMonthKey(year = this.currentYear, month = this.currentMonth) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  getCurrentMonthData() {
    const key = this.getMonthKey();
    if (!this.allMonthsData[key]) {
      this.allMonthsData[key] = createDefaultMonthData(this.currentYear, this.currentMonth, this.habits);
      this.saveToStorage();
    }
    this.autoMarkPastUnloggedHabits();
    return this.allMonthsData[key];
  }

  setMonth(year, month) {
    this.currentYear = year;
    this.currentMonth = month;
    this.autoMarkPastUnloggedHabits();
    this.saveToStorage();
    this.notify();
  }

  nextMonth() {
    if (this.currentMonth === 12) {
      this.currentYear++;
      this.currentMonth = 1;
    } else {
      this.currentMonth++;
    }
    this.setMonth(this.currentYear, this.currentMonth);
  }

  prevMonth() {
    if (this.currentMonth === 1) {
      this.currentYear--;
      this.currentMonth = 12;
    } else {
      this.currentMonth--;
    }
    this.setMonth(this.currentYear, this.currentMonth);
  }

  resetToToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.setMonth(this.currentYear, this.currentMonth);
  }

  resetToSeptember2026() {
    this.currentYear = 2026;
    this.currentMonth = 9;
    this.setMonth(2026, 9);
  }

  resetToAugust2026() {
    this.currentYear = 2026;
    this.currentMonth = 8;
    this.setMonth(2026, 8);
  }

  // Toggle habit state:
  // For Scheduled habits:
  //   - Past days: missed (not done) -> done (completed) -> missed (not done)
  //   - Today / future days: none (blank) -> done (completed) -> missed (not done) -> none (blank)
  // For Unscheduled rest days (frequencyType === 'specific_days' and off-rule day):
  //   - Rest days can NEVER be 'missed'! They toggle: none (rest dash —) -> done (extra credit ✓) -> none (rest dash —)
  toggleHabit(day, habitId) {
    const monthData = this.getCurrentMonthData();
    if (!monthData.days[day]) return;

    if (!monthData.days[day].habits) {
      monthData.days[day].habits = {};
    }

    const habit = this.getHabit(habitId);
    const isScheduled = this.isHabitScheduledForDay(habit, this.currentYear, this.currentMonth, day);

    const current = monthData.days[day].habits[habitId] || 'none';
    const now = new Date();
    const isPastDay = (
      this.currentYear < now.getFullYear() ||
      (this.currentYear === now.getFullYear() && this.currentMonth < (now.getMonth() + 1)) ||
      (this.currentYear === now.getFullYear() && this.currentMonth === (now.getMonth() + 1) && day < now.getDate())
    );

    let next = 'done';

    if (!isScheduled && habit?.frequencyType === 'specific_days') {
      // Unscheduled rest day: toggle between 'done' and 'none' (never 'missed')
      if (current === 'done') {
        next = 'none';
        sound.playUncheck();
      } else {
        next = 'done';
        sound.playCheck();
      }
    } else {
      // Scheduled habit
      if (current === 'none' || current === 'rest') {
        next = 'done';
        sound.playCheck();
      } else if (current === 'done') {
        next = 'missed';
        sound.playUncheck();
      } else if (current === 'missed') {
        if (isPastDay) {
          next = 'done';
          sound.playCheck();
        } else {
          next = 'none';
        }
      }
    }

    monthData.days[day].habits[habitId] = next;
    this.saveToStorage();
    this.checkMilestonesAndNotify(day);
  }

  setMetric(day, metricKey, value) {
    const monthData = this.getCurrentMonthData();
    if (!monthData.days[day]) return;
    monthData.days[day][metricKey] = value;
    this.saveToStorage();
    this.notify();
  }

  updateMonthlyTheme(theme) {
    const monthData = this.getCurrentMonthData();
    monthData.monthlyTheme = theme;
    this.saveToStorage();
  }

  updateMonthlyReflection(reflection) {
    const monthData = this.getCurrentMonthData();
    monthData.monthlyReflection = reflection;
    this.saveToStorage();
  }

  addTodo(text, priority = 'med') {
    if (!text.trim()) return;
    const monthData = this.getCurrentMonthData();
    if (!monthData.monthlyTodos) monthData.monthlyTodos = [];
    const newTodo = {
      id: 'todo-' + Date.now(),
      text: text.trim(),
      priority,
      completed: false
    };
    monthData.monthlyTodos.push(newTodo);
    this.saveToStorage();
    this.notify();
  }

  toggleTodo(todoId) {
    const monthData = this.getCurrentMonthData();
    if (!monthData.monthlyTodos) return;
    const item = monthData.monthlyTodos.find(t => t.id === todoId);
    if (item) {
      item.completed = !item.completed;
      if (item.completed) sound.playCheck();
      this.saveToStorage();
      this.notify();
    }
  }

  deleteTodo(todoId) {
    const monthData = this.getCurrentMonthData();
    if (!monthData.monthlyTodos) return;
    monthData.monthlyTodos = monthData.monthlyTodos.filter(t => t.id !== todoId);
    this.saveToStorage();
    this.notify();
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    sound.enabled = this.soundEnabled;
    this.saveToStorage();
    this.notify();
    return this.soundEnabled;
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'paper' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    this.saveToStorage();
    this.notify();
    return this.theme;
  }

  setFilterMode(filter) {
    this.filterMode = filter;
    this.notify();
  }

  // Evaluate achievement badges unlocked in a month
  evaluateBadges(monthData = this.getCurrentMonthData()) {
    if (!monthData || !monthData.days) return [];
    const year = monthData.year || this.currentYear;
    const month = monthData.month || this.currentMonth;
    const totalDays = getDaysInMonth(year, month);
    const habits = this.habits;

    let waterStreak = 0, maxWaterStreak = 0;
    let nomafStreak = 0, maxNomafStreak = 0;
    let earlyWakeCount = 0;
    let readBookCount = 0;
    let physicalCount = 0;
    let spiritualCount = 0;
    let studyTotalMins = 0;
    let lowScreenCount = 0;
    let perfectDays = 0;
    let totalDone = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dayRecord = monthData.days[d] || {};
      const hMap = dayRecord.habits || {};

      if (hMap['water3L'] === 'done') {
        waterStreak++;
        if (waterStreak > maxWaterStreak) maxWaterStreak = waterStreak;
      } else {
        waterStreak = 0;
      }

      if (hMap['nomaf'] === 'done') {
        nomafStreak++;
        if (nomafStreak > maxNomafStreak) maxNomafStreak = nomafStreak;
      } else {
        nomafStreak = 0;
      }

      if (hMap['readBook'] === 'done') readBookCount++;
      if (hMap['workout10k'] === 'done' && (hMap['gripper'] === 'done' || hMap['sakhaRahasya'] === 'done')) physicalCount++;
      if (hMap['pray'] === 'done' || hMap['mediaAffirm'] === 'done') spiritualCount++;

      studyTotalMins += parseDurationToMinutes(dayRecord.studyTime || '');

      const screenM = parseDurationToMinutes(dayRecord.screenTime || '');
      if (screenM > 0 && screenM <= 120) lowScreenCount++;

      if (dayRecord.wakeTime && dayRecord.wakeTime.toLowerCase().includes('am')) {
        const match = dayRecord.wakeTime.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          const h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          if (h <= 6 || (h === 6 && m <= 30)) earlyWakeCount++;
        }
      }

      let done = 0;
      let scheduled = 0;
      habits.forEach(h => {
        if (this.isHabitScheduledForDay(h, year, month, d)) {
          scheduled++;
          if (hMap[h.id] === 'done') done++;
        }
      });
      if (scheduled > 0 && done >= scheduled) perfectDays++;
      Object.values(hMap).forEach(s => { if (s === 'done') totalDone++; });
    }

    const badgeEvaluators = {
      hydrated: maxWaterStreak >= 7,
      nomaf_hero: maxNomafStreak >= 7,
      early_bird: earlyWakeCount >= 5,
      bookworm: readBookCount >= 15,
      iron_body: physicalCount >= 10,
      inner_peace: spiritualCount >= 10,
      study_beast: studyTotalMins >= (30 * 60),
      perfect_day: perfectDays >= 1,
      habit_legend: totalDone >= 75,
      streak_titan: totalDone >= 50,
      centurion: totalDone >= 100,
      screen_detox: lowScreenCount >= 5
    };

    return BADGE_DEFINITIONS.filter(b => Boolean(badgeEvaluators[b.id]));
  }

  // Calculate XP & Level (Scaled by scheduled days commitment & hard progression tiers)
  calculateGamificationStats() {
    let totalHabitsDone = 0;
    let perfectDays = 0;
    let monthlyMasteries = 0;
    let habitCheckXP = 0;
    let masteryBonusXP = 0;
    let perfectDaysXP = 0;
    let unlockedBadgesXP = 0;
    const habitsList = this.habits;

    // Aggregate across all months data
    Object.values(this.allMonthsData).forEach(m => {
      if (!m.days) return;
      const year = m.year || this.currentYear;
      const month = m.month || this.currentMonth;

      const habitDoneCounts = {};
      habitsList.forEach(h => { habitDoneCounts[h.id] = 0; });

      Object.entries(m.days).forEach(([dayNum, d]) => {
        const day = parseInt(dayNum, 10);
        let scheduledCount = 0;
        let dayDone = 0;

        if (d.habits) {
          habitsList.forEach(h => {
            const isScheduled = this.isHabitScheduledForDay(h, year, month, day);
            if (isScheduled) scheduledCount++;

            const s = d.habits[h.id];
            if (s === 'done') {
              totalHabitsDone++;
              if (isScheduled) dayDone++;
              habitDoneCounts[h.id] = (habitDoneCounts[h.id] || 0) + 1;

              // XP per check directly scaled to number of target days committed
              const checkXP = this.getHabitCheckXP(h, year, month);
              habitCheckXP += checkXP;
            }
          });
        }

        // Perfect Day bonus: all scheduled habits completed (and at least 1 habit scheduled)
        if (scheduledCount > 0 && dayDone >= scheduledCount) {
          perfectDays++;
          perfectDaysXP += 15; // +15 XP per disciplined perfect day
        }
      });

      // Monthly Target Mastery Bonus:
      // Completing 100% of target days for a habit awards targetDays * 2 XP
      habitsList.forEach(h => {
        const targetDays = this.getHabitTargetDays(h, year, month);
        const done = habitDoneCounts[h.id] || 0;
        if (targetDays > 0 && done >= targetDays) {
          monthlyMasteries++;
          masteryBonusXP += (targetDays * 2);
        }
      });

      // Add Unlocked Badges XP for this month
      const unlocked = this.evaluateBadges(m);
      unlocked.forEach(b => {
        unlockedBadgesXP += b.xp;
      });
    });

    const totalXP = habitCheckXP + perfectDaysXP + masteryBonusXP + unlockedBadgesXP;

    // Determine current level tier (Level 1 to Level 50)
    let currentTier = LEVEL_TIERS[0];
    for (let i = 0; i < LEVEL_TIERS.length; i++) {
      if (totalXP >= LEVEL_TIERS[i].minXp) {
        currentTier = LEVEL_TIERS[i];
      }
    }

    const xpInLevel = totalXP - currentTier.minXp;
    const levelRange = currentTier.maxXp - currentTier.minXp;
    const progressPct = Math.min(100, Math.round((xpInLevel / levelRange) * 100));

    return {
      totalXP,
      level: currentTier.level,
      title: currentTier.title,
      desc: currentTier.desc,
      minXp: currentTier.minXp,
      maxXp: currentTier.maxXp,
      xpInLevel,
      levelRange,
      progressPct,
      totalHabitsDone,
      perfectDays,
      monthlyMasteries,
      habitCheckXP,
      masteryBonusXP,
      perfectDaysXP,
      unlockedBadgesXP
    };
  }

  checkMilestonesAndNotify(day) {
    const monthData = this.getCurrentMonthData();
    const dayRecord = monthData.days[day];
    if (!dayRecord || !dayRecord.habits) return;

    let scheduledCount = 0;
    let doneCount = 0;
    this.habits.forEach(h => {
      if (this.isHabitScheduledForDay(h, this.currentYear, this.currentMonth, day)) {
        scheduledCount++;
        if (dayRecord.habits[h.id] === 'done') doneCount++;
      }
    });

    if (scheduledCount > 0 && doneCount >= scheduledCount) {
      triggerConfetti('normal');
      showToast(`🔥 Perfect Day Achieved on Day ${day}! +15 XP`, '🌟');
      sound.playLevelUp();
    }

    this.notify();
  }

  // Cross-Tab Real-time Synchronization Engine
  initCrossTabSync() {
    if (this._syncInitialized) return;
    this._syncInitialized = true;

    // 1. BroadcastChannel for instant cross-tab messaging
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('chronolog_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE') {
            this.loadFromStorage();
            this.notify();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 2. Storage event listener (fires on all other open tabs of the same domain/URL)
    window.addEventListener('storage', (e) => {
      if (e.key === 'chronolog_bullet_journal_db' || !e.key) {
        this.loadFromStorage();
        this.notify();
      }
    });

    // 3. Re-sync when switching focus back to this tab
    window.addEventListener('focus', () => {
      this.loadFromStorage();
      this.notify();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.loadFromStorage();
        this.notify();
      }
    });
  }

  // Storage Persistence
  saveToStorage() {
    try {
      const payload = {
        currentYear: this.currentYear,
        currentMonth: this.currentMonth,
        theme: this.theme,
        soundEnabled: this.soundEnabled,
        habits: this.habits,
        allMonthsData: this.allMonthsData,
        timestamp: Date.now()
      };
      localStorage.setItem('chronolog_bullet_journal_db', JSON.stringify(payload));

      // Broadcast update to all other open tabs immediately
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'SYNC_STATE', timestamp: Date.now() });
        } catch (err) {
          // Ignore broadcast failures
        }
      }
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('chronolog_bullet_journal_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.habits) && parsed.habits.length > 0) {
          this.habits = parsed.habits;
        }
        if (parsed.allMonthsData && typeof parsed.allMonthsData === 'object') {
          this.allMonthsData = parsed.allMonthsData;
        }
        if (parsed.currentYear) this.currentYear = parseInt(parsed.currentYear, 10);
        if (parsed.currentMonth) this.currentMonth = parseInt(parsed.currentMonth, 10);
        if (parsed.theme) {
          this.theme = parsed.theme;
          document.documentElement.setAttribute('data-theme', this.theme);
        }
        if (typeof parsed.soundEnabled === 'boolean') {
          this.soundEnabled = parsed.soundEnabled;
          sound.enabled = this.soundEnabled;
        }
        this.sanitizeUnscheduledDays();
        this.autoMarkPastUnloggedHabits();
      }
    } catch (e) {
      console.warn('Storage load error:', e);
    }
  }

  loadSampleAugust2026() {
    this.habits = DEFAULT_HABITS.map(h => ({ ...h }));
    this.allMonthsData['2026-08'] = createSampleAugust2026Data(this.habits);
    this.currentYear = 2026;
    this.currentMonth = 8;
    this.saveToStorage();
    this.notify();
    triggerConfetti('epic');
    showToast('Loaded August 2026 Bullet Journal Sample Data!', '🎉');
  }

  clearCurrentMonth() {
    const key = this.getMonthKey();
    this.allMonthsData[key] = createDefaultMonthData(this.currentYear, this.currentMonth, this.habits);
    this.sanitizeUnscheduledDays();
    this.autoMarkPastUnloggedHabits();
    this.saveToStorage();
    this.notify();
    showToast(`Cleared data for ${MONTH_NAMES[this.currentMonth - 1]} ${this.currentYear}`, '🗑️');
  }

  clearEntireDatabase(startYear = 2026, startMonth = 9) {
    this.habits = DEFAULT_HABITS.map(h => ({ ...h }));
    const monthKey = `${startYear}-${String(startMonth).padStart(2, '0')}`;
    this.allMonthsData = {
      [monthKey]: createDefaultMonthData(startYear, startMonth, this.habits)
    };
    this.currentYear = startYear;
    this.currentMonth = startMonth;
    this.sanitizeUnscheduledDays();
    this.autoMarkPastUnloggedHabits();
    this.saveToStorage();
    this.notify();
    triggerConfetti('epic');
    showToast(`Database Reset! Starting clean from ${MONTH_NAMES[startMonth - 1]} ${startYear}`, '🧹');
  }
}

export const state = new AppState();
