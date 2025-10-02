// modal-manager.js
// Centralized modal/dialog management utilities

/**
 * Manages modal dialogs with consistent styling and behavior
 */
export class ModalManager {
  
  /**
   * Create a modal with standard structure
   * @param {Object} options - Modal configuration
   * @param {string} options.title - Modal title
   * @param {string} options.content - HTML content for modal body
   * @param {string} options.className - Additional CSS class (optional)
   * @param {boolean} options.showBackdrop - Show backdrop (default: true)
   * @param {Function} options.onClose - Callback when modal closes (optional)
   * @returns {HTMLElement} The modal element
   */
  static createModal(options = {}) {
    const {
      title = 'Modal',
      content = '',
      className = '',
      showBackdrop = true,
      onClose = null
    } = options;
    
    const modal = document.createElement('div');
    modal.className = `modal ${className}`;
    
    modal.innerHTML = `
      ${showBackdrop ? '<div class="modal-backdrop" data-action="close-modal"></div>' : ''}
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button data-action="close-modal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    // Store close callback
    if (onClose) {
      modal._onClose = onClose;
    }
    
    // Setup close handlers
    this._setupCloseHandlers(modal);
    
    console.log('[ModalManager] Modal created:', title);
    return modal;
  }
  
  /**
   * Create a modal with footer buttons
   * @param {Object} options - Modal configuration
   * @param {string} options.title - Modal title
   * @param {string} options.content - HTML content for modal body
   * @param {Array<Object>} options.buttons - Button configurations
   * @param {string} options.className - Additional CSS class (optional)
   * @param {Function} options.onClose - Callback when modal closes (optional)
   * @returns {HTMLElement} The modal element
   */
  static createModalWithFooter(options = {}) {
    const {
      title = 'Modal',
      content = '',
      buttons = [],
      className = '',
      onClose = null
    } = options;
    
    const modal = document.createElement('div');
    modal.className = `modal ${className}`;
    
    const footerButtons = buttons.map(btn => {
      const btnClass = btn.primary ? 'primary-button' : 'secondary-button';
      const action = btn.action || 'custom-action';
      return `<button data-action="${action}" class="${btnClass}">${btn.label}</button>`;
    }).join('');
    
    modal.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button data-action="close-modal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${footerButtons}
        </div>
      </div>
    `;
    
    // Store close callback
    if (onClose) {
      modal._onClose = onClose;
    }
    
    // Setup close handlers
    this._setupCloseHandlers(modal);
    
    // Setup button handlers
    buttons.forEach(btn => {
      if (btn.onClick) {
        const btnElement = modal.querySelector(`[data-action="${btn.action}"]`);
        if (btnElement) {
          btnElement.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.onClick(modal, e);
          });
        }
      }
    });
    
    console.log('[ModalManager] Modal with footer created:', title);
    return modal;
  }
  
  /**
   * Setup close handlers for modal
   * @param {HTMLElement} modal - The modal element
   * @private
   */
  static _setupCloseHandlers(modal) {
    // Close on backdrop click
    const backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeModal(modal));
    }
    
    // Close on × button click
    const closeButtons = modal.querySelectorAll('[data-action="close-modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeModal(modal);
      });
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        this.closeModal(modal);
      }
    };
    modal._escapeHandler = escapeHandler;
    document.addEventListener('keydown', escapeHandler);
  }
  
  /**
   * Show a modal (add to DOM)
   * @param {HTMLElement} modal - The modal element
   * @param {HTMLElement} container - Container to append to (default: document.body)
   */
  static showModal(modal, container = document.body) {
    container.appendChild(modal);
    console.log('[ModalManager] Modal shown');
  }
  
  /**
   * Close and cleanup a modal
   * @param {HTMLElement} modal - The modal element
   */
  static closeModal(modal) {
    // Call close callback if exists
    if (modal._onClose) {
      modal._onClose(modal);
    }
    
    // Cleanup event listeners
    if (modal._escapeHandler) {
      document.removeEventListener('keydown', modal._escapeHandler);
      modal._escapeHandler = null;
    }
    
    // Cleanup any stored viewer data
    if (modal._viewerData) {
      if (modal._viewerData.viewer && modal._viewerData.viewer.destroy) {
        modal._viewerData.viewer.destroy();
      }
      if (modal._viewerData.controls && modal._viewerData.controls.destroy) {
        modal._viewerData.controls.destroy();
      }
      modal._viewerData = null;
    }
    
    // Remove from DOM
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    
    console.log('[ModalManager] Modal closed and cleaned up');
  }
  
  /**
   * Create a confirmation dialog
   * @param {Object} options - Dialog configuration
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Confirmation message
   * @param {string} options.confirmLabel - Confirm button label (default: 'Confirm')
   * @param {string} options.cancelLabel - Cancel button label (default: 'Cancel')
   * @param {Function} options.onConfirm - Callback when confirmed
   * @param {Function} options.onCancel - Callback when cancelled (optional)
   * @returns {HTMLElement} The modal element
   */
  static createConfirmDialog(options = {}) {
    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      onConfirm = null,
      onCancel = null
    } = options;
    
    const modal = this.createModalWithFooter({
      title,
      content: `<p>${message}</p>`,
      className: 'confirm-dialog',
      buttons: [
        {
          label: cancelLabel,
          action: 'cancel',
          primary: false,
          onClick: (modal) => {
            if (onCancel) onCancel();
            this.closeModal(modal);
          }
        },
        {
          label: confirmLabel,
          action: 'confirm',
          primary: true,
          onClick: (modal) => {
            if (onConfirm) onConfirm();
            this.closeModal(modal);
          }
        }
      ]
    });
    
    return modal;
  }
  
  /**
   * Show a temporary notification
   * @param {Object} options - Notification configuration
   * @param {string} options.message - Notification message
   * @param {string} options.type - Notification type: 'success', 'error', 'warning', 'info'
   * @param {number} options.duration - Duration in ms (default: 3000)
   * @param {string} options.position - Position: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
   */
  static showNotification(options = {}) {
    const {
      message = '',
      type = 'info',
      duration = 3000,
      position = 'top-right'
    } = options;
    
    const typeStyles = {
      success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
      error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
      warning: { bg: '#fff3cd', color: '#856404', border: '#ffeaa7' },
      info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    
    const positions = {
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      ${positions[position] || positions['top-right']}
      background: ${style.bg};
      color: ${style.color};
      border: 1px solid ${style.border};
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }
}

// Node.js compatibility guard
if (typeof window !== 'undefined') {
  console.log('[ModalManager] Modal manager loaded');
}
