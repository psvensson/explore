/**
 * UIUtils - Common UI helper functions for forms, validation, and DOM manipulation
 * 
 * Provides reusable utilities for creating consistent UI components across the tileset editor.
 */

export class UIUtils {
    /**
     * Show a styled alert message to the user
     * @param {string} message - The message to display
     * @param {string} type - Alert type: 'success', 'warning', 'danger', 'info'
     */
    static showAlert(message, type = 'info') {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Find or create alerts container
        let alertsContainer = document.getElementById('alerts-container');
        if (!alertsContainer) {
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'alerts-container';
            alertsContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1050;
                max-width: 400px;
            `;
            document.body.appendChild(alertsContainer);
        }
        
        alertsContainer.appendChild(alertElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 5000);
        
        // Add click handler for close button
        const closeBtn = alertElement.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.onclick = () => alertElement.remove();
        }
    }

    /**
     * Show messages (alias for showAlert for backward compatibility)
     * @param {string} message - The message to display
     * @param {string} type - Message type: 'success', 'warning', 'danger', 'info'
     */
    static showMessage(message, type = 'info') {
        return this.showAlert(message, type);
    }

    /**
     * Create a form group with label and input
     * @param {string} id - Input element ID
     * @param {string} label - Label text
     * @param {string} type - Input type (text, number, textarea, select)
     * @param {string} value - Initial value
     * @param {Object} options - Additional options for selects
     * @return {HTMLElement} Form group element
     */
    static createFormGroup(id, label, type = 'text', value = '', options = {}) {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const labelElement = document.createElement('label');
        labelElement.setAttribute('for', id);
        labelElement.textContent = label;
        
        let input;
        if (type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = options.rows || 3;
        } else if (type === 'select') {
            input = document.createElement('select');
            if (options.options) {
                options.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = typeof opt === 'object' ? opt.value : opt;
                    option.textContent = typeof opt === 'object' ? opt.text : opt;
                    if (option.value === value) option.selected = true;
                    input.appendChild(option);
                });
            }
        } else {
            input = document.createElement('input');
            input.type = type;
        }
        
        input.id = id;
        input.className = 'form-control';
        if (type !== 'select') {
            input.value = value;
        }
        
        // Add any additional attributes
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, val]) => {
                input.setAttribute(key, val);
            });
        }
        
        group.appendChild(labelElement);
        group.appendChild(input);
        
        return group;
    }

    /**
     * Create a button with consistent styling
     * @param {string} text - Button text
     * @param {string} className - CSS classes (e.g., 'btn btn-primary')
     * @param {Function} onClick - Click handler
     * @param {Object} options - Additional options
     * @return {HTMLElement} Button element
     */
    static createButton(text, className = 'btn btn-primary', onClick = null, options = {}) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = className;
        
        if (onClick) {
            button.onclick = onClick;
        }
        
        if (options.id) {
            button.id = options.id;
        }
        
        if (options.disabled) {
            button.disabled = true;
        }
        
        return button;
    }

    /**
     * Create a section with header and content area
     * @param {string} title - Section title
     * @param {string} className - Additional CSS classes
     * @return {Object} Object with section element and content area
     */
    static createSection(title, className = '') {
        const section = document.createElement('div');
        section.className = `editor-section ${className}`;
        
        const header = document.createElement('h3');
        header.textContent = title;
        
        const content = document.createElement('div');
        content.className = 'section-content';
        
        section.appendChild(header);
        section.appendChild(content);
        
        return { section, content };
    }

    /**
     * Validate form inputs and show errors
     * @param {Object} validators - Object mapping field IDs to validation functions
     * @return {boolean} True if all validations pass
     */
    static validateForm(validators) {
        let isValid = true;
        const errors = [];
        
        Object.entries(validators).forEach(([fieldId, validator]) => {
            const field = document.getElementById(fieldId);
            if (!field) return;
            
            const result = validator(field.value, field);
            if (result !== true) {
                isValid = false;
                errors.push(result);
                field.classList.add('is-invalid');
                
                // Remove existing error message
                const existingError = field.parentNode.querySelector('.invalid-feedback');
                if (existingError) {
                    existingError.remove();
                }
                
                // Add error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'invalid-feedback';
                errorDiv.textContent = result;
                field.parentNode.appendChild(errorDiv);
            } else {
                field.classList.remove('is-invalid');
                const existingError = field.parentNode.querySelector('.invalid-feedback');
                if (existingError) {
                    existingError.remove();
                }
            }
        });
        
        return isValid;
    }

    /**
     * Create a loading spinner element
     * @param {string} text - Loading text
     * @return {HTMLElement} Loading element
     */
    static createLoader(text = 'Loading...') {
        const loader = document.createElement('div');
        loader.className = 'loader-container';
        loader.innerHTML = `
            <div class="spinner-border" role="status">
                <span class="visually-hidden">${text}</span>
            </div>
            <div class="loader-text">${text}</div>
        `;
        return loader;
    }

    /**
     * Create a progress bar
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} label - Progress label
     * @return {HTMLElement} Progress bar element
     */
    static createProgressBar(progress = 0, label = '') {
        const container = document.createElement('div');
        container.className = 'progress-container';
        
        if (label) {
            const labelElement = document.createElement('div');
            labelElement.className = 'progress-label';
            labelElement.textContent = label;
            container.appendChild(labelElement);
        }
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress';
        progressBar.innerHTML = `
            <div class="progress-bar" role="progressbar" 
                 style="width: ${progress}%" 
                 aria-valuenow="${progress}" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
                ${progress}%
            </div>
        `;
        
        container.appendChild(progressBar);
        return container;
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @return {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Safely get element by ID with error handling
     * @param {string} id - Element ID
     * @param {string} context - Context for error messages
     * @return {HTMLElement|null} Element or null if not found
     */
    static getElementById(id, context = '') {
        const element = document.getElementById(id);
        if (!element && context) {
            console.warn(`Element with ID "${id}" not found in context: ${context}`);
        }
        return element;
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @return {string} Formatted size string
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}