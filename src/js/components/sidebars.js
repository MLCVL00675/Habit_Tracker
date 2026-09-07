/* ==========================================================================
   CHRONOLOG // SIDEBARS COMPONENT (MONTHLY FOCUS, TO-DO & HABIT STREAKS)
   ========================================================================== */

import { state } from '../state.js';
import {
  getDaysInMonth,
  calculateHabitStreaks,
  calculateGlobalConsistencyStreak
} from '../utils.js';

export function renderSidebars() {
  renderMonthlyTodos();
  renderHabitStreaks();
}

// --------------------------------------------------------------------------
// 1. MONTHLY TO-DO OBJECTIVES
// --------------------------------------------------------------------------
function renderMonthlyTodos() {
  const todoList = document.getElementById('monthly-todo-list');
  const statsBadge = document.getElementById('todo-stats-badge');
  const manageBtn = document.getElementById('sidebar-manage-goals-btn');
  if (!todoList) return;

  const monthData = state.getCurrentMonthData();
  const todos = monthData.monthlyTodos || [];

  const completedCount = todos.filter(t => t.completed).length;
  if (statsBadge) {
    statsBadge.textContent = `${completedCount}/${todos.length}`;
  }

  if (todos.length === 0) {
    todoList.innerHTML = `
      <li style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.78rem;">
        No objectives added yet.<br>
        <button id="sidebar-add-goal-link" class="btn-ghost-sm" style="margin-top: 8px;">+ Add Goals in Goals Tab</button>
      </li>
    `;
    const addLink = document.getElementById('sidebar-add-goal-link');
    if (addLink) {
      addLink.addEventListener('click', () => {
        const goalsTabBtn = document.querySelector('.tab-btn[data-tab="goals-tab"]');
        if (goalsTabBtn) goalsTabBtn.click();
      });
    }
  } else {
    todoList.innerHTML = todos.map(todo => {
      const priorityClass = `priority-${todo.priority || 'med'}`;
      const priorityLabel = todo.priority === 'high' ? 'High' : (todo.priority === 'low' ? 'Low' : 'Med');

      return `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
          <div class="todo-item-left">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} />
            <span class="todo-item-text">${escapeHtml(todo.text)}</span>
          </div>
          <span class="todo-priority-tag ${priorityClass}">${priorityLabel}</span>
        </li>
      `;
    }).join('');
  }

  // Attach check toggle listeners to todo items
  todoList.querySelectorAll('.todo-item').forEach(item => {
    const todoId = item.getAttribute('data-todo-id');
    const checkbox = item.querySelector('.todo-checkbox');

    if (checkbox) {
      checkbox.addEventListener('change', () => state.toggleTodo(todoId));
    }
  });

  // Attach manage button listener once
  if (manageBtn && !manageBtn._hasListener) {
    manageBtn.addEventListener('click', () => {
      const goalsTabBtn = document.querySelector('.tab-btn[data-tab="goals-tab"]');
      if (goalsTabBtn) goalsTabBtn.click();
    });
    manageBtn._hasListener = true;
  }
}

// --------------------------------------------------------------------------
// 2. HABIT STREAKS WIDGET
// --------------------------------------------------------------------------
function renderHabitStreaks() {
  const streaksList = document.getElementById('habit-streaks-list');
  const streakHeaderCount = document.getElementById('header-streak-count');
  const sortBtn = document.getElementById('streak-view-mode-btn');
  if (!streaksList) return;

  const habits = state.getHabits();
  const monthData = state.getCurrentMonthData();
  const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

  // Compute streaks for each habit
  const habitStreaks = habits.map(h => {
    const { currentStreak, bestStreak } = calculateHabitStreaks(monthData, h.id, totalDays);
    const targetDays = state.getHabitTargetDays(h, state.currentYear, state.currentMonth);
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      scheduleLabel: state.getHabitScheduleLabel(h),
      currentStreak,
      bestStreak,
      targetDays
    };
  });

  // Sort if enabled
  if (state.streakSortMode === 'longest') {
    habitStreaks.sort((a, b) => b.currentStreak - a.currentStreak);
  }

  streaksList.innerHTML = habitStreaks.map(item => {
    const isHot = item.currentStreak >= 3;
    return `
      <div class="streak-row-item" title="${item.name} (${item.scheduleLabel}): Current streak ${item.currentStreak}d | Best ${item.bestStreak}d">
        <div class="streak-habit-info">
          <span class="streak-habit-icon">${item.icon}</span>
          <span class="streak-habit-name">${escapeHtml(item.name)}</span>
        </div>
        <div class="streak-badge-counters">
          <span class="current-streak-pill" style="${isHot ? 'box-shadow: 0 0 10px rgba(249,115,22,0.3);' : ''}">
            <span class="streak-icon-fire">${item.currentStreak > 0 ? '🔥' : '·'}</span><span class="streak-num">${item.currentStreak}d</span>
          </span>
          <span class="best-streak-pill" title="Best Streak achieved this month">
            <span class="streak-icon-trophy">🏆</span><span class="streak-best-num">${item.bestStreak}d</span>
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Global consistency streak (>90% of scheduled habits completed)
  const globalStreak = calculateGlobalConsistencyStreak(
    monthData,
    habits,
    totalDays,
    (h, y, m, d) => state.isHabitScheduledForDay(h, y, m, d),
    state.currentYear,
    state.currentMonth
  );
  if (streakHeaderCount) {
    streakHeaderCount.textContent = globalStreak;
  }

  // Sort toggle button listener
  if (sortBtn && !sortBtn._hasListener) {
    sortBtn.addEventListener('click', () => {
      state.streakSortMode = state.streakSortMode === 'longest' ? 'default' : 'longest';
      sortBtn.textContent = state.streakSortMode === 'longest' ? 'Reset ↺' : 'Sort 🔥';
      renderHabitStreaks();
    });
    sortBtn._hasListener = true;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
