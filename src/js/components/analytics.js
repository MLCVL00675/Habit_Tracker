/* ==========================================================================
   CHRONOLOG // ANALYTICS, TRENDS & CORRELATION DASHBOARD COMPONENT
   ========================================================================== */

import { Chart, registerables } from 'chart.js';
import { state } from '../state.js';
import {
  getDaysInMonth,
  parseDurationToMinutes,
  minutesToDecimalHours,
  formatMinutesToDuration,
  parseCalorieToNumber
} from '../utils.js';

// Register Chart.js components
Chart.register(...registerables);

let timeMetricsChartInstance = null;
let habitConsistencyChartInstance = null;
let weeklyTrendsChartInstance = null;
let caloriesEnergyChartInstance = null;

export function renderAnalyticsView() {
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  // 1. Calculate KPIs & Metrics
  calculateAndRenderKPIs(monthData, totalDays);

  // 2. Render Charts
  renderTimeMetricsChart(monthData, totalDays);
  renderHabitConsistencyChart(monthData, totalDays);
  renderWeeklyTrendsChart(monthData, totalDays);
  renderCaloriesEnergyChart(monthData, totalDays);
}

function calculateAndRenderKPIs(monthData, totalDays) {
  const habits = state.getHabits();
  let totalStudyMins = 0;
  let totalScreenMins = 0;
  let totalSleepMins = 0;
  let validSleepDays = 0;
  let totalHabitsDone = 0;
  let totalHabitTarget = 0;
  let totalCalIn = 0;
  let validCalInDays = 0;
  let totalCalBurn = 0;
  let validCalBurnDays = 0;

  const habitCounts = {};
  habits.forEach(h => { habitCounts[h.id] = 0; });

  for (let d = 1; d <= totalDays; d++) {
    const dayRecord = monthData.days[d] || {};
    const studyM = parseDurationToMinutes(dayRecord.studyTime);
    const screenM = parseDurationToMinutes(dayRecord.screenTime);
    const sleepM = parseDurationToMinutes(dayRecord.sleepTime);
    const calIn = parseCalorieToNumber(dayRecord.caloriesIn);
    const calBurn = parseCalorieToNumber(dayRecord.caloriesBurned);

    if (studyM > 0) totalStudyMins += studyM;
    if (screenM > 0) totalScreenMins += screenM;
    if (sleepM > 0) {
      totalSleepMins += sleepM;
      validSleepDays++;
    }
    if (calIn > 0) {
      totalCalIn += calIn;
      validCalInDays++;
    }
    if (calBurn > 0) {
      totalCalBurn += calBurn;
      validCalBurnDays++;
    }

    if (dayRecord.habits) {
      Object.entries(dayRecord.habits).forEach(([hid, s]) => {
        if (s === 'done') {
          totalHabitsDone++;
          if (habitCounts[hid] !== undefined) habitCounts[hid]++;
        }
      });
    }
  }

  habits.forEach(h => {
    totalHabitTarget += state.getHabitTargetDays(h, state.currentYear, state.currentMonth);
  });

  // Monthly Routine Composite Score (0-100 scale)
  const habitRate = totalHabitTarget > 0 ? (totalHabitsDone / totalHabitTarget) : 0;
  const studyHours = totalStudyMins / 60;
  const screenHours = totalScreenMins / 60;

  // Composite formula: 70% habits target adherence + 20% study bonus - 10% screen penalty
  let score = Math.round((habitRate * 70) + Math.min(20, (studyHours / (totalDays * 3)) * 20) - Math.min(10, (screenHours / (totalDays * 4)) * 10));
  score = Math.max(0, Math.min(100, score));

  const scoreEl = document.getElementById('kpi-monthly-score');
  const avgSleepEl = document.getElementById('kpi-avg-sleep');
  const sleepQualityEl = document.getElementById('kpi-sleep-quality');
  const ratioEl = document.getElementById('kpi-study-screen-ratio');
  const ratioSubEl = document.getElementById('kpi-ratio-subtext');
  const topHabitEl = document.getElementById('kpi-top-habit');
  const topHabitPctEl = document.getElementById('kpi-top-habit-pct');
  const avgCaloriesEl = document.getElementById('kpi-avg-calories');
  const calorieBalanceStatusEl = document.getElementById('kpi-calorie-balance-status');

  if (scoreEl) scoreEl.textContent = `${score}/100`;

  const avgSleepMins = validSleepDays > 0 ? Math.round(totalSleepMins / validSleepDays) : 0;
  if (avgSleepEl) avgSleepEl.textContent = formatMinutesToDuration(avgSleepMins) || '0h 0m';
  if (sleepQualityEl) {
    if (avgSleepMins >= 420 && avgSleepMins <= 510) {
      sleepQualityEl.textContent = '🌟 Optimal 7-8.5 hrs recovery';
      sleepQualityEl.style.color = 'var(--accent-emerald)';
    } else if (avgSleepMins < 360 && avgSleepMins > 0) {
      sleepQualityEl.textContent = '⚠️ Below 6 hrs (Sleep Deficit)';
      sleepQualityEl.style.color = 'var(--accent-rose)';
    } else {
      sleepQualityEl.textContent = 'Good sleep balance';
      sleepQualityEl.style.color = 'var(--text-secondary)';
    }
  }

  // Study vs Screen Ratio
  const ratio = totalScreenMins > 0 ? (totalStudyMins / totalScreenMins).toFixed(1) : (totalStudyMins > 0 ? '5.0' : '1.0');
  if (ratioEl) ratioEl.textContent = `${ratio}x`;
  if (ratioSubEl) {
    if (parseFloat(ratio) >= 2.0) {
      ratioSubEl.textContent = '🔥 High deep work superiority';
      ratioSubEl.style.color = 'var(--accent-emerald)';
    } else if (parseFloat(ratio) < 1.0) {
      ratioSubEl.textContent = '⚠️ Screen exceeds study time';
      ratioSubEl.style.color = 'var(--accent-rose)';
    } else {
      ratioSubEl.textContent = 'Balanced focus ratio';
      ratioSubEl.style.color = 'var(--text-secondary)';
    }
  }

  // Top Consistent Habit (Relative to its own target)
  let bestHabitId = null;
  let maxAdherence = -1;
  let bestHabitDone = 0;
  let bestHabitTarget = 0;

  habits.forEach(h => {
    const done = habitCounts[h.id] || 0;
    const target = state.getHabitTargetDays(h, state.currentYear, state.currentMonth);
    const adherence = target > 0 ? (done / target) : 0;
    if (adherence > maxAdherence) {
      maxAdherence = adherence;
      bestHabitId = h.id;
      bestHabitDone = done;
      bestHabitTarget = target;
    }
  });

  const bestHabitDef = habits.find(h => h.id === bestHabitId);
  if (topHabitEl && bestHabitDef) {
    topHabitEl.textContent = `${bestHabitDef.icon} ${bestHabitDef.name}`;
  }
  if (topHabitPctEl && bestHabitTarget > 0) {
    const pct = Math.round((bestHabitDone / bestHabitTarget) * 100);
    topHabitPctEl.textContent = `${bestHabitDone}/${bestHabitTarget} target days (${pct}% adherence)`;
  }

  // Calorie KPIs
  const avgCalIn = validCalInDays > 0 ? Math.round(totalCalIn / validCalInDays) : 0;
  const avgCalBurn = validCalBurnDays > 0 ? Math.round(totalCalBurn / validCalBurnDays) : 0;
  if (avgCaloriesEl) {
    const inStr = avgCalIn > 0 ? `${avgCalIn.toLocaleString()} in` : '--';
    const burnStr = avgCalBurn > 0 ? `${avgCalBurn.toLocaleString()} out` : '--';
    avgCaloriesEl.textContent = `${inStr} / ${burnStr}`;
  }
  if (calorieBalanceStatusEl) {
    if (avgCalIn > 0 || avgCalBurn > 0) {
      const net = avgCalIn - avgCalBurn;
      if (net > 0) {
        calorieBalanceStatusEl.textContent = `+${net.toLocaleString()} kcal net intake`;
        calorieBalanceStatusEl.style.color = '#f59e0b';
      } else if (net < 0) {
        calorieBalanceStatusEl.textContent = `${net.toLocaleString()} kcal net deficit`;
        calorieBalanceStatusEl.style.color = 'var(--accent-emerald)';
      } else {
        calorieBalanceStatusEl.textContent = 'Balanced daily energy';
        calorieBalanceStatusEl.style.color = 'var(--accent-cyan)';
      }
    } else {
      calorieBalanceStatusEl.textContent = 'Log calories in matrix to track';
      calorieBalanceStatusEl.style.color = 'var(--text-secondary)';
    }
  }
}

// --------------------------------------------------------------------------
// CHART 1: Study vs Screen vs Sleep Time Metrics
// --------------------------------------------------------------------------
function renderTimeMetricsChart(monthData, totalDays) {
  const canvas = document.getElementById('time-metrics-chart');
  if (!canvas) return;

  const labels = [];
  const studyData = [];
  const screenData = [];
  const sleepData = [];

  for (let d = 1; d <= totalDays; d++) {
    labels.push(`Day ${d}`);
    const dayRecord = monthData.days[d] || {};
    studyData.push(minutesToDecimalHours(parseDurationToMinutes(dayRecord.studyTime)));
    screenData.push(minutesToDecimalHours(parseDurationToMinutes(dayRecord.screenTime)));
    sleepData.push(minutesToDecimalHours(parseDurationToMinutes(dayRecord.sleepTime)));
  }

  if (timeMetricsChartInstance) {
    timeMetricsChartInstance.destroy();
  }

  timeMetricsChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Study Time (hrs)',
          data: studyData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Sleep Time (hrs)',
          data: sleepData,
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Screen Time (hrs)',
          data: screenData,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { family: 'Outfit', size: 12, weight: '600' },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'JetBrains Mono' },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 11 },
            callback: val => `${val}h`
          }
        }
      }
    }
  });
}

// --------------------------------------------------------------------------
// CHART 2: Habit Consistency Ranking (Relative to Target Quota)
// --------------------------------------------------------------------------
function renderHabitConsistencyChart(monthData, totalDays) {
  const canvas = document.getElementById('habit-consistency-chart');
  if (!canvas) return;

  const habits = state.getHabits();
  const habitStats = habits.map(h => {
    let done = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (monthData.days[d] && monthData.days[d].habits && monthData.days[d].habits[h.id] === 'done') {
        done++;
      }
    }
    const target = state.getHabitTargetDays(h, state.currentYear, state.currentMonth);
    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    return { name: `${h.icon} ${h.name}`, pct, done, target };
  });

  // Sort descending
  habitStats.sort((a, b) => b.pct - a.pct);

  if (habitConsistencyChartInstance) {
    habitConsistencyChartInstance.destroy();
  }

  habitConsistencyChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: habitStats.map(s => s.name),
      datasets: [{
        label: 'Target Adherence (%)',
        data: habitStats.map(s => s.pct),
        backgroundColor: habitStats.map(s => {
          if (s.pct >= 80) return 'rgba(16, 185, 129, 0.85)';
          if (s.pct >= 60) return 'rgba(6, 182, 212, 0.85)';
          if (s.pct >= 40) return 'rgba(139, 92, 246, 0.85)';
          return 'rgba(244, 63, 94, 0.75)';
        }),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw}% Target Adherence (${habitStats[ctx.dataIndex].done}/${habitStats[ctx.dataIndex].target} target days)`
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 10 },
            callback: v => `${v}%`
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11, weight: '500' } }
        }
      }
    }
  });
}

// --------------------------------------------------------------------------
// CHART 3: Weekly Performance Trends
// --------------------------------------------------------------------------
function renderWeeklyTrendsChart(monthData, totalDays) {
  const canvas = document.getElementById('weekly-trends-chart');
  if (!canvas) return;

  const habits = state.getHabits();
  const weeks = ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22-28)', 'Week 5 (29-31)'];
  const weekHabitPcts = [];
  const weekStudyHours = [];

  const weekRanges = [
    [1, 7], [8, 14], [15, 21], [22, 28], [29, totalDays]
  ];

  weekRanges.forEach(([start, end]) => {
    let habitsDone = 0;
    let habitSlots = (end - start + 1) * (habits.length || 1);
    let studyMins = 0;

    for (let d = start; d <= end; d++) {
      const dayRecord = monthData.days[d];
      if (dayRecord) {
        if (dayRecord.habits) {
          Object.values(dayRecord.habits).forEach(s => {
            if (s === 'done') habitsDone++;
          });
        }
        studyMins += parseDurationToMinutes(dayRecord.studyTime);
      }
    }

    const pct = habitSlots > 0 ? Math.round((habitsDone / habitSlots) * 100) : 0;
    weekHabitPcts.push(pct);
    weekStudyHours.push(Number((studyMins / 60).toFixed(1)));
  });

  if (weeklyTrendsChartInstance) {
    weeklyTrendsChartInstance.destroy();
  }

  weeklyTrendsChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weeks,
      datasets: [
        {
          label: 'Habit Consistency (%)',
          data: weekHabitPcts,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Total Study (Hours)',
          data: weekStudyHours,
          backgroundColor: 'rgba(6, 182, 212, 0.85)',
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11, weight: '600' } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#f59e0b', callback: v => `${v}%` }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: '#06b6d4', callback: v => `${v}h` }
        }
      }
    }
  });
}

// --------------------------------------------------------------------------
// CHART 4: Daily Calorie Intake vs Burn Energy Balance
// --------------------------------------------------------------------------
function renderCaloriesEnergyChart(monthData, totalDays) {
  const canvas = document.getElementById('calories-energy-chart');
  if (!canvas) return;

  const labels = [];
  const calInData = [];
  const calBurnData = [];
  const netBalanceData = [];

  for (let d = 1; d <= totalDays; d++) {
    labels.push(`Day ${d}`);
    const dayRecord = monthData.days[d] || {};
    const cIn = parseCalorieToNumber(dayRecord.caloriesIn);
    const cBurn = parseCalorieToNumber(dayRecord.caloriesBurned);

    calInData.push(cIn > 0 ? cIn : null);
    calBurnData.push(cBurn > 0 ? cBurn : null);
    netBalanceData.push((cIn > 0 || cBurn > 0) ? (cIn - cBurn) : null);
  }

  if (caloriesEnergyChartInstance) {
    caloriesEnergyChartInstance.destroy();
  }

  caloriesEnergyChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories Ingested (🍎 kcal)',
          data: calInData,
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 4,
          order: 2
        },
        {
          label: 'Calories Burned (🔥 kcal)',
          data: calBurnData,
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: '#ef4444',
          borderWidth: 1.5,
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line',
          label: 'Net Balance (kcal)',
          data: netBalanceData,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          fill: false,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.3,
          spanGaps: true,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { family: 'Outfit', size: 12, weight: '600' },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'JetBrains Mono' },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              if (val === null || val === undefined) return ` ${ctx.dataset.label}: --`;
              if (ctx.dataset.label.includes('Net')) {
                const sign = val > 0 ? '+' : '';
                return ` ${ctx.dataset.label}: ${sign}${val.toLocaleString()} kcal (${val > 0 ? 'Surplus' : (val < 0 ? 'Deficit' : 'Zero')})`;
              }
              return ` ${ctx.dataset.label}: ${val.toLocaleString()} kcal`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 11 },
            callback: val => `${val} kcal`
          }
        }
      }
    }
  });
}

