/* ==========================================================================
   CHRONOLOG // MONTHLY GOALS, FOCUS & STRATEGY COMPONENT
   ========================================================================== */

import { state } from '../state.js';
import { sound, showToast, triggerConfetti, escapeHtml } from '../utils.js';
import { showConfirmDialog } from './confirmModal.js';

let goalsFilter = 'all';

export function renderGoalsView() {
  const monthData = state.getCurrentMonthData();
  const todos = monthData.monthlyTodos || [];

  // 1. Update Theme & Reflection Inputs
  updateTheme(monthData);

  // 2. Update Goals Progress Meter & Tab Badge
  updateGoalsProgress(todos);

  // 3. Render Objectives List
  renderObjectivesList(todos);

  // 4. Bind Forms and Filter Controls
  bindGoalsControls();
}

function updateTheme(monthData) {
  const themeInput = document.getElementById('goals-tab-theme-input');

  if (themeInput && document.activeElement !== themeInput) {
    themeInput.value = monthData.monthlyTheme || '';
  }
}

function updateGoalsProgress(todos) {
  const badge = document.getElementById('goals-tab-badge');
  const pctVal = document.getElementById('goals-progress-pct-val');
  const barFill = document.getElementById('goals-progress-bar-fill');
  const countText = document.getElementById('goals-progress-count-text');

  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (badge) badge.textContent = `${completed}/${total}`;
  if (pctVal) pctVal.textContent = `${pct}%`;
  if (barFill) barFill.style.width = `${pct}%`;
  if (countText) countText.textContent = `${completed} of ${total} Objectives Completed`;
}

function renderObjectivesList(todos) {
  const listContainer = document.getElementById('goals-tab-items-list');
  if (!listContainer) return;

  let filtered = todos;
  if (goalsFilter === 'pending') {
    filtered = todos.filter(t => !t.completed);
  } else if (goalsFilter === 'completed') {
    filtered = todos.filter(t => t.completed);
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <li style="text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.88rem;">
        No monthly goals found for this filter. Add a new objective above!
      </li>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(item => {
    const priorityClass = `priority-${item.priority || 'med'}`;
    const priorityLabel = item.priority === 'high' ? 'High' : (item.priority === 'low' ? 'Low' : 'Med');
    const categoryIcon = getCategoryIcon(item.category);

    return `
      <li class="goal-item-card ${item.completed ? 'completed' : ''}" data-goal-id="${item.id}">
        <div class="goal-item-left">
          <input type="checkbox" class="goal-checkbox" ${item.completed ? 'checked' : ''} />
          <div class="goal-item-body">
            <span class="goal-item-text">${escapeHtml(item.text)}</span>
            <div class="goal-tags-row">
              ${item.category ? `<span class="goal-category-tag">${categoryIcon} ${item.category}</span>` : ''}
              <span class="todo-priority-tag ${priorityClass}">${priorityLabel}</span>
            </div>
          </div>
        </div>
        <div class="goal-item-actions">
          <button class="goal-delete-btn" title="Delete objective">&times;</button>
        </div>
      </li>
    `;
  }).join('');

  // Attach event handlers
  listContainer.querySelectorAll('.goal-item-card').forEach(card => {
    const goalId = card.getAttribute('data-goal-id');
    const checkbox = card.querySelector('.goal-checkbox');
    const deleteBtn = card.querySelector('.goal-delete-btn');

    if (checkbox) {
      checkbox.addEventListener('change', () => {
        state.toggleTodo(goalId);
        const updatedMonth = state.getCurrentMonthData();
        const item = updatedMonth.monthlyTodos.find(t => t.id === goalId);
        if (item && item.completed) {
          triggerConfetti('normal');
          showToast(`Objective Completed: ${item.text.slice(0, 30)}...`, '🎯');
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const monthData = state.getCurrentMonthData();
        const item = monthData.monthlyTodos?.find(t => t.id === goalId);
        if (!item) {
          state.deleteTodo(goalId);
          return;
        }

        const confirmed = await showConfirmDialog({
          title: 'Delete Objective',
          badge: 'Monthly Objective',
          message: `Are you sure you want to delete this objective from your monthly roadmap?`,
          item: {
            name: item.text,
            icon: getCategoryIcon(item.category),
            category: item.category,
            badge: item.priority ? `${item.priority.toUpperCase()} PRIORITY` : null
          },
          warningNote: 'This objective will be permanently removed from this month\'s objectives list.',
          confirmText: 'Delete Objective',
          cancelText: 'Cancel',
          confirmIcon: '🗑️',
          variant: 'danger',
          icon: '🗑️'
        });

        if (confirmed) {
          state.deleteTodo(goalId);
        }
      });
    }
  });
}

function getCategoryIcon(category) {
  if (!category) return '🎯';
  const map = {
    tech: '🚀',
    discipline: '⚡',
    physical: '🏋️',
    learning: '📖',
    spiritual: '🧘'
  };
  return map[category] || '🎯';
}

function bindGoalsControls() {
  const themeInput = document.getElementById('goals-tab-theme-input');
  const addForm = document.getElementById('goals-tab-add-form');
  const filterBtns = document.querySelectorAll('.goal-filter-btn');

  if (themeInput && !themeInput._hasGoalsListener) {
    themeInput.addEventListener('input', (e) => {
      state.updateMonthlyTheme(e.target.value);
    });
    themeInput._hasGoalsListener = true;
  }

  if (addForm && !addForm._hasGoalsListener) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const textField = document.getElementById('goals-tab-input-text');
      const catSelect = document.getElementById('goals-tab-category-select');
      const prioritySelect = document.getElementById('goals-tab-priority-select');

      if (textField && textField.value.trim()) {
        const text = textField.value.trim();
        const category = catSelect ? catSelect.value : 'tech';
        const priority = prioritySelect ? prioritySelect.value : 'med';

        // Add to monthly todos
        const monthData = state.getCurrentMonthData();
        if (!monthData.monthlyTodos) monthData.monthlyTodos = [];
        monthData.monthlyTodos.push({
          id: 'todo-' + Date.now(),
          text,
          category,
          priority,
          completed: false
        });
        state.saveToStorage();
        state.notify();
        textField.value = '';
        sound.playCheck();
        showToast('Added Monthly Goal!', '🎯');
      }
    });
    addForm._hasGoalsListener = true;
  }

  filterBtns.forEach(btn => {
    if (!btn._hasListener) {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        goalsFilter = btn.getAttribute('data-goal-filter') || 'all';
        renderGoalsView();
      });
      btn._hasListener = true;
    }
  });
}

