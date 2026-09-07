/* ==========================================================================
   CHRONOLOG // PREMIUM CONFIRMATION & DIALOG MODAL SYSTEM
   ========================================================================== */

import { escapeHtml, sound } from '../utils.js';

let activeDialog = null;

/**
 * Show a sleek, futuristic, accessible confirmation dialog
 * @param {Object} options
 * @param {string} options.title - Dialog heading
 * @param {string} [options.badge] - Category or status pill (e.g. "PERMANENT DELETION", "RESET DATA")
 * @param {string} options.message - Descriptive text message (can contain HTML or bold tags)
 * @param {Object} [options.item] - Item preview data { name, icon, category, frequency, badge, meta }
 * @param {string} [options.warningNote] - Warning callout note
 * @param {string} [options.confirmText] - Label for confirm button (default: "Confirm")
 * @param {string} [options.cancelText] - Label for cancel button (default: "Cancel")
 * @param {string} [options.confirmIcon] - Icon for confirm button (e.g. '🗑️', '⚡', '✓')
 * @param {string} [options.variant] - 'danger' | 'warning' | 'primary' | 'info' (default: 'danger')
 * @param {string} [options.icon] - Header icon / emoji (default: '🗑️' or '⚠️')
 * @param {boolean} [options.showCancel] - Whether to show cancel button (default: true)
 * @returns {Promise<boolean>} Resolves true on confirm, false on cancel/escape/backdrop click
 */
export function showConfirmDialog(options = {}) {
  const {
    title = 'Confirm Action',
    badge = options.variant === 'danger' ? 'Permanent Action' : 'Action Required',
    message = 'Are you sure you want to proceed?',
    item = null,
    warningNote = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmIcon = options.variant === 'danger' ? '🗑️' : '✓',
    variant = 'danger',
    icon = options.variant === 'danger' ? '🗑️' : '⚠️',
    showCancel = true
  } = options;

  // Clean up any existing active dialog instance immediately
  if (activeDialog) {
    try {
      activeDialog.resolve(false);
      activeDialog.element.remove();
    } catch (e) {
      // Ignore cleanup error
    }
    activeDialog = null;
  }

  return new Promise((resolve) => {
    // Play subtle audio alert cue
    if (sound && typeof sound.playAlert === 'function') {
      sound.playAlert();
    }

    // Create backdrop container
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-dialog-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'custom-dialog-title');

    // Build Item Preview Component
    let itemPreviewMarkup = '';
    if (item && (item.name || item.icon)) {
      itemPreviewMarkup = `
        <div class="dialog-item-preview-card">
          <div class="dialog-item-left">
            <div class="dialog-item-icon-wrap">
              <span class="dialog-item-icon">${escapeHtml(item.icon || '📌')}</span>
            </div>
            <div class="dialog-item-details">
              <h4 class="dialog-item-name">${escapeHtml(item.name || '')}</h4>
              <div class="dialog-item-meta-row">
                ${item.category ? `<span class="dialog-item-tag category-tag">📂 ${escapeHtml(item.category)}</span>` : ''}
                ${item.frequency ? `<span class="dialog-item-tag freq-tag">⚡ ${escapeHtml(item.frequency)}</span>` : ''}
                ${item.badge ? `<span class="dialog-item-tag badge-tag">${escapeHtml(item.badge)}</span>` : ''}
                ${item.meta ? `<span class="dialog-item-meta">${escapeHtml(item.meta)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Build Warning Callout Banner
    let warningMarkup = '';
    if (warningNote) {
      warningMarkup = `
        <div class="dialog-warning-banner banner-${variant}">
          <span class="dialog-warning-icon">${variant === 'danger' ? '⚠️' : (variant === 'warning' ? '⚡' : 'ℹ️')}</span>
          <div class="dialog-warning-text">${escapeHtml(warningNote)}</div>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="custom-dialog-card dialog-variant-${variant}">
        <div class="dialog-glow-top"></div>

        <!-- Header -->
        <div class="custom-dialog-header">
          <div class="dialog-header-left">
            <div class="dialog-icon-badge badge-${variant}">
              <span class="dialog-badge-pulse"></span>
              <span class="dialog-badge-icon">${icon}</span>
            </div>
            <div class="dialog-title-wrap">
              <div class="dialog-title-row">
                <h3 id="custom-dialog-title" class="custom-dialog-title">${escapeHtml(title)}</h3>
                ${badge ? `<span class="dialog-status-pill pill-${variant}">${escapeHtml(badge)}</span>` : ''}
              </div>
            </div>
          </div>
          <button class="dialog-close-btn" id="dialog-close-btn" aria-label="Close dialog">✕</button>
        </div>

        <!-- Body -->
        <div class="custom-dialog-body">
          <div class="custom-dialog-message">${message}</div>
          ${itemPreviewMarkup}
          ${warningMarkup}
        </div>

        <!-- Footer -->
        <div class="custom-dialog-footer">
          ${showCancel ? `
            <button type="button" class="btn-dialog-cancel" id="dialog-cancel-btn">
              <span>${escapeHtml(cancelText)}</span>
              <kbd class="dialog-kbd">Esc</kbd>
            </button>
          ` : ''}
          <button type="button" class="btn-dialog-confirm btn-variant-${variant}" id="dialog-confirm-btn">
            ${confirmIcon ? `<span class="dialog-btn-icon">${confirmIcon}</span>` : ''}
            <span>${escapeHtml(confirmText)}</span>
            <kbd class="dialog-kbd">↵ Enter</kbd>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Save previous active element for accessibility focus restoration
    const previousActiveElement = document.activeElement;

    // Trigger smooth CSS animation in next frame
    requestAnimationFrame(() => {
      backdrop.classList.add('dialog-backdrop-active');
    });

    const cancelBtn = backdrop.querySelector('#dialog-cancel-btn');
    const confirmBtn = backdrop.querySelector('#dialog-confirm-btn');
    const closeBtn = backdrop.querySelector('#dialog-close-btn');

    // Safe focus defaults: on danger, focus Cancel; otherwise focus Confirm
    if (variant === 'danger' && cancelBtn) {
      setTimeout(() => cancelBtn.focus(), 50);
    } else if (confirmBtn) {
      setTimeout(() => confirmBtn.focus(), 50);
    }

    let isClosed = false;
    const cleanup = (result) => {
      if (isClosed) return;
      isClosed = true;
      document.removeEventListener('keydown', handleKeydown);

      backdrop.classList.remove('dialog-backdrop-active');
      backdrop.classList.add('dialog-backdrop-closing');

      setTimeout(() => {
        backdrop.remove();
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus();
        }
        activeDialog = null;
        resolve(result);
      }, 200);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Enter') {
        // If actively focused on cancel, cancel; otherwise confirm
        if (document.activeElement === cancelBtn) {
          e.preventDefault();
          cleanup(false);
        } else {
          e.preventDefault();
          cleanup(true);
        }
      } else if (e.key === 'Tab') {
        // Trap focus inside modal
        const focusables = backdrop.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    if (cancelBtn) cancelBtn.addEventListener('click', () => cleanup(false));
    if (closeBtn) closeBtn.addEventListener('click', () => cleanup(false));
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (sound && typeof sound.playCheck === 'function') sound.playCheck();
        cleanup(true);
      });
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        cleanup(false);
      }
    });

    activeDialog = { element: backdrop, resolve };
  });
}
