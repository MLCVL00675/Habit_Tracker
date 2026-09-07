/* ==========================================================================
   CHRONOLOG // UTILITIES & AUDIO SYNTHESIZER & CALCULATIONS
   ========================================================================== */

import confetti from 'canvas-confetti';

// Format and parse duration strings (e.g. "7:30", "7 30", "7.5", "4", "45", "7 hr 30 m", "6h 15m") -> total minutes
export function parseDurationToMinutes(val) {
  if (!val || typeof val !== 'string') return 0;
  let str = val.trim().toLowerCase();
  if (!str) return 0;

  // Replace comma with dot (e.g. "7,5")
  str = str.replace(',', '.');

  // 1. Check format "X hr Y m" or "Xh Ym" or "X h Y min" or "Xh" or "Ym"
  const hrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|h|hours|hour)/);
  const minMatch = str.match(/(\d+)\s*(?:min|mins|m|minute|minutes)/);

  let totalMins = 0;
  if (hrMatch) {
    totalMins += parseFloat(hrMatch[1]) * 60;
  }
  if (minMatch) {
    totalMins += parseInt(minMatch[1], 10);
  }
  if (hrMatch || minMatch) {
    return Math.round(totalMins);
  }

  // 2. Check colon or dot or space notation: "07:30", "7:05", "7.30", "7 30", "4:15"
  const colonMatch = str.match(/^(\d{1,2})[:\s](\d{1,2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }

  // 3. Decimal numbers: "7.5" (7 hours 30 mins)
  const decMatch = str.match(/^(\d+)\.(\d+)$/);
  if (decMatch) {
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return Math.round(num * 60);
    }
  }

  // 4. Plain integer: "4" (4 hours) or "45" (45 minutes if > 24)
  const plainNum = parseFloat(str);
  if (!isNaN(plainNum)) {
    if (plainNum <= 24) {
      return Math.round(plainNum * 60);
    } else {
      return Math.round(plainNum);
    }
  }

  return 0;
}

export function formatMinutesToDuration(mins) {
  if (!mins || isNaN(mins) || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Convert minutes to decimal hours (e.g. 7.5 hrs)
export function minutesToDecimalHours(mins) {
  if (!mins || isNaN(mins) || mins <= 0) return 0;
  return Number((mins / 60).toFixed(1));
}

// Format Time string (e.g. "7:05", "705", "07:05", "6:30 am", "11:15 pm", "7")
export function normalizeTimeString(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  // 1. 3 or 4 continuous digits without separator (e.g. "705", "0705", "1130", "2200")
  const digitsMatch = trimmed.match(/^(\d{1,2})(\d{2})\s*(am|pm)?$/i);
  if (digitsMatch) {
    let [_, hStr, mStr, meridiem] = digitsMatch;
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (h <= 24 && m < 60) {
      if (!meridiem) {
        if (h >= 12 && h < 24) {
          meridiem = 'PM';
          if (h > 12) h -= 12;
        } else {
          meridiem = 'AM';
          if (h === 0 || h === 24) h = 12;
        }
      } else {
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
      }
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${meridiem.toUpperCase()}`;
    }
  }

  // 2. Separated with colon, dot, or space (e.g. "7:5", "07:05", "7.05", "7 05", "7:05 am", "11:30 pm")
  const sepMatch = trimmed.match(/^(\d{1,2})[:.\s](\d{1,2})\s*(am|pm)?$/i);
  if (sepMatch) {
    let [_, hStr, mStr, meridiem] = sepMatch;
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (h <= 24 && m < 60) {
      if (!meridiem) {
        if (h >= 12 && h < 24) {
          meridiem = 'PM';
          if (h > 12) h -= 12;
        } else {
          meridiem = 'AM';
          if (h === 0 || h === 24) h = 12;
        }
      } else {
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
      }
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${meridiem.toUpperCase()}`;
    }
  }

  // 3. Single integer hour (e.g. "7", "06", "7am", "8 pm")
  const singleMatch = trimmed.match(/^(\d{1,2})\s*(am|pm)?$/i);
  if (singleMatch) {
    let [_, hStr, meridiem] = singleMatch;
    let h = parseInt(hStr, 10);
    if (h <= 24) {
      if (!meridiem) {
        if (h >= 12 && h < 24) {
          meridiem = 'PM';
          if (h > 12) h -= 12;
        } else {
          meridiem = 'AM';
          if (h === 0 || h === 24) h = 12;
        }
      } else {
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
      }
      return `${h.toString().padStart(2, '0')}:00 ${meridiem.toUpperCase()}`;
    }
  }

  return trimmed;
}

// Days of week short names
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Get total days in month
export function getDaysInMonth(year, month) {
  // month is 1-indexed (1 = Jan, 8 = Aug, 12 = Dec)
  return new Date(year, month, 0).getDate();
}

// Get weekday index of a specific day (0 = Sun, 6 = Sat)
export function getDayOfWeek(year, month, day) {
  return new Date(year, month - 1, day).getDay();
}

// Calculate streaks for habits across all days (supporting Daily, Specific Days, and Weekly Targets)
export function calculateHabitStreaks(monthData, habitOrId, totalDays, isHabitScheduledFn = null, year = 2026, month = 9) {
  const habitId = typeof habitOrId === 'object' && habitOrId !== null ? habitOrId.id : habitOrId;
  const habitObj = typeof habitOrId === 'object' && habitOrId !== null ? habitOrId : null;
  const freqType = habitObj?.frequencyType || 'daily';
  const weeklyTarget = habitObj?.weeklyTarget || 7;

  let currentStreak = 0;
  let bestStreak = 0;

  // --------------------------------------------------------------------------
  // 1. WEEKLY TARGET HABIT STREAKS (e.g. Workout 4x/wk)
  // --------------------------------------------------------------------------
  if (freqType === 'weekly_target') {
    let totalCompletedSessions = 0;
    const totalWeeks = Math.ceil(totalDays / 7);
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === (now.getMonth() + 1));
    const currentDay = isCurrentMonth ? now.getDate() : totalDays;
    const currentWeekIdx = Math.floor((currentDay - 1) / 7);

    let consecutiveWeeks = 0;
    let maxConsecutiveWeeks = 0;
    let currentWeekDone = 0;

    for (let w = 0; w < totalWeeks; w++) {
      const startD = w * 7 + 1;
      const endD = Math.min(totalDays, (w + 1) * 7);
      const daysInThisWeek = (endD - startD + 1);
      const targetForThisWeek = Math.min(daysInThisWeek, Math.round(weeklyTarget * (daysInThisWeek / 7)));

      let doneInWeek = 0;
      for (let d = startD; d <= endD; d++) {
        if (monthData.days[d]?.habits?.[habitId] === 'done') {
          doneInWeek++;
          totalCompletedSessions++;
        }
      }

      if (w === currentWeekIdx) {
        currentWeekDone = doneInWeek;
      }

      if (w < currentWeekIdx) {
        if (doneInWeek >= targetForThisWeek && targetForThisWeek > 0) {
          consecutiveWeeks++;
          if (consecutiveWeeks > maxConsecutiveWeeks) maxConsecutiveWeeks = consecutiveWeeks;
        } else {
          consecutiveWeeks = 0;
        }
      } else if (w === currentWeekIdx) {
        if (doneInWeek >= targetForThisWeek && targetForThisWeek > 0) {
          consecutiveWeeks++;
          if (consecutiveWeeks > maxConsecutiveWeeks) maxConsecutiveWeeks = consecutiveWeeks;
        }
      }
    }

    currentStreak = totalCompletedSessions;
    bestStreak = Math.max(totalCompletedSessions, maxConsecutiveWeeks * weeklyTarget);

    return { 
      currentStreak, 
      bestStreak,
      weeklyStats: {
        consecutiveWeeks,
        currentWeekDone,
        weeklyTarget
      }
    };
  }

  // --------------------------------------------------------------------------
  // 2. DAILY & SPECIFIC DAYS HABIT STREAKS (e.g. Daily or Tue/Thu/Sat)
  // --------------------------------------------------------------------------
  let runningStreak = 0;
  for (let day = 1; day <= totalDays; day++) {
    const dayRecord = monthData.days[day];
    const isScheduled = isHabitScheduledFn && habitObj ? isHabitScheduledFn(habitObj, year, month, day) : true;
    const isDone = dayRecord && dayRecord.habits && dayRecord.habits[habitId] === 'done';

    if (isDone) {
      runningStreak++;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else if (isScheduled) {
      // Only scheduled days break the continuous chain when not done
      runningStreak = 0;
    }
    // Rest days that are not completed preserve the streak
  }

  // Calculate current streak backwards from today or end of month
  const now = new Date();
  const isCurrentMonth = (year === now.getFullYear() && month === (now.getMonth() + 1));
  const maxDay = isCurrentMonth ? Math.min(totalDays, now.getDate()) : totalDays;

  let backwardStreak = 0;
  for (let day = maxDay; day >= 1; day--) {
    const dayRecord = monthData.days[day];
    const isScheduled = isHabitScheduledFn && habitObj ? isHabitScheduledFn(habitObj, year, month, day) : true;
    const state = dayRecord ? dayRecord.habits?.[habitId] : 'none';

    if (state === 'done') {
      backwardStreak++;
    } else if (isScheduled) {
      if (state === 'missed') {
        break;
      } else if (day === maxDay) {
        // Today is pending (not yet logged), check backwards to previous scheduled day
        continue;
      } else {
        break;
      }
    } else {
      // Unscheduled rest day and not done -> preserve active chain, continue backwards
      continue;
    }
  }
  currentStreak = backwardStreak;

  return { currentStreak, bestStreak };
}

// Calculate overall daily consistency streak (consecutive days with > 90% habits completed)
export function calculateGlobalConsistencyStreak(monthData, habits, totalDays, isHabitScheduledFn = null, year = 2026, month = 9) {
  if (!monthData || !monthData.days) return 0;

  const habitsList = Array.isArray(habits) ? habits : [];
  const totalCount = habitsList.length || (typeof habits === 'number' ? habits : 1);

  let streak = 0;
  let started = false;

  for (let day = totalDays; day >= 1; day--) {
    const dayRecord = monthData.days[day];
    if (!dayRecord || !dayRecord.habits) {
      if (!started) continue;
      else break;
    }

    const habitEntries = Object.entries(dayRecord.habits);
    const hasLoggedData = habitEntries.some(([_, state]) => state === 'done' || state === 'missed');

    if (!hasLoggedData) {
      if (!started) continue;
      else break;
    }

    started = true;

    let doneCount = 0;
    let scheduledCount = 0;

    if (habitsList.length > 0) {
      habitsList.forEach(h => {
        const isScheduled = isHabitScheduledFn ? isHabitScheduledFn(h, year, month, day) : true;
        if (isScheduled) {
          scheduledCount++;
          if (dayRecord.habits[h.id] === 'done') {
            doneCount++;
          }
        }
      });
    } else {
      habitEntries.forEach(([_, s]) => {
        scheduledCount++;
        if (s === 'done') doneCount++;
      });
    }

    const divisor = scheduledCount > 0 ? scheduledCount : totalCount;
    const completionRate = divisor > 0 ? (doneCount / divisor) : 0;

    // Qualify only when >90% of habits are completed
    if (completionRate > 0.90) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Confetti Celebration
export function triggerConfetti(level = 'normal') {
  if (level === 'epic') {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 70,
        origin: { x: 0.1, y: 0.7 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 70,
        origin: { x: 0.9, y: 0.7 }
      });
    }, 250);
  } else {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#06b6d4', '#10b981', '#f59e0b']
    });
  }
}

// Web Audio API Synthesizer for futuristic micro-chimes
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCheck() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // Audio context silently handled
    }
  }

  playUncheck() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Ignore
    }
  }

  playLevelUp() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (e) {
      // Ignore
    }
  }

  playBadgeUnlock() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch (e) {
      // Ignore
    }
  }

  playAlert() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1); // A4

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // Ignore
    }
  }
}

export const sound = new SoundSynth();

// HTML Escape helper
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast helper
export function showToast(message, icon = '✨', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

