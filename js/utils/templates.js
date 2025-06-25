/**
 * Template functions for rendering UI elements
 * @module Templates
 */

import { Colors, Typography, Spacing, Components } from '../config/ui.config.js';

/**
 * Create a button element
 * @param {Object} options - Button options
 * @returns {string} HTML string
 */
export function createButton({
  text = '',
  type = 'button',
  variant = 'primary',
  size = 'medium',
  icon = null,
  onClick = null,
  disabled = false,
  className = '',
  attributes = {}
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    disabled ? 'btn-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const iconHtml = icon ? `<i class="${icon}"></i> ` : '';
  
  return `<button 
    type="${type}" 
    class="${classes}"
    ${disabled ? 'disabled' : ''}
    ${onClick ? `onclick="${onClick}"` : ''}
    ${attrs}
  >
    ${iconHtml}${text}
  </button>`;
}

/**
 * Create an input field
 * @param {Object} options - Input options
 * @returns {string} HTML string
 */
export function createInput({
  type = 'text',
  name = '',
  placeholder = '',
  value = '',
  required = false,
  disabled = false,
  className = '',
  label = null,
  error = null,
  attributes = {}
}) {
  const inputId = `input-${name}-${Date.now()}`;
  const classes = ['form-input', error ? 'input-error' : '', className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const labelHtml = label ? `
    <label for="${inputId}" class="form-label">
      ${label}
      ${required ? '<span class="required">*</span>' : ''}
    </label>
  ` : '';

  const errorHtml = error ? `<span class="form-error">${error}</span>` : '';

  return `
    <div class="form-group">
      ${labelHtml}
      <input
        type="${type}"
        id="${inputId}"
        name="${name}"
        class="${classes}"
        placeholder="${placeholder}"
        value="${value}"
        ${required ? 'required' : ''}
        ${disabled ? 'disabled' : ''}
        ${attrs}
      />
      ${errorHtml}
    </div>
  `;
}

/**
 * Create a card component
 * @param {Object} options - Card options
 * @returns {string} HTML string
 */
export function createCard({
  title = '',
  content = '',
  footer = null,
  image = null,
  className = '',
  attributes = {}
}) {
  const classes = ['card', className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const imageHtml = image ? `
    <div class="card-image">
      <img src="${image.src}" alt="${image.alt || ''}" />
    </div>
  ` : '';

  const footerHtml = footer ? `<div class="card-footer">${footer}</div>` : '';

  return `
    <div class="${classes}" ${attrs}>
      ${imageHtml}
      <div class="card-body">
        ${title ? `<h3 class="card-title">${title}</h3>` : ''}
        <div class="card-content">${content}</div>
      </div>
      ${footerHtml}
    </div>
  `;
}

/**
 * Create an alert/notification
 * @param {Object} options - Alert options
 * @returns {string} HTML string
 */
export function createAlert({
  message = '',
  type = 'info',
  dismissible = true,
  icon = true,
  className = '',
  attributes = {}
}) {
  const classes = ['alert', `alert-${type}`, className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const iconHtml = icon ? `<i class="fas ${iconMap[type] || iconMap.info}"></i>` : '';
  
  const dismissHtml = dismissible ? `
    <button class="alert-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  ` : '';

  return `
    <div class="${classes}" role="alert" ${attrs}>
      ${iconHtml}
      <span class="alert-message">${message}</span>
      ${dismissHtml}
    </div>
  `;
}

/**
 * Create a loading spinner
 * @param {Object} options - Spinner options
 * @returns {string} HTML string
 */
export function createSpinner({
  size = 'medium',
  color = 'primary',
  text = null,
  className = '',
  attributes = {}
}) {
  const classes = ['spinner', `spinner-${size}`, `spinner-${color}`, className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const textHtml = text ? `<span class="spinner-text">${text}</span>` : '';

  return `
    <div class="${classes}" ${attrs}>
      <div class="spinner-circle"></div>
      ${textHtml}
    </div>
  `;
}

/**
 * Create a progress bar
 * @param {Object} options - Progress bar options
 * @returns {string} HTML string
 */
export function createProgressBar({
  value = 0,
  max = 100,
  label = null,
  showPercent = true,
  variant = 'primary',
  striped = false,
  animated = false,
  className = '',
  attributes = {}
}) {
  const percent = Math.round((value / max) * 100);
  const classes = [
    'progress-bar',
    `progress-bar-${variant}`,
    striped ? 'progress-bar-striped' : '',
    animated ? 'progress-bar-animated' : '',
    className
  ].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const labelHtml = label ? `<div class="progress-label">${label}</div>` : '';
  const percentHtml = showPercent ? `<span class="progress-percent">${percent}%</span>` : '';

  return `
    <div class="progress-container">
      ${labelHtml}
      <div class="progress" ${attrs}>
        <div 
          class="${classes}"
          role="progressbar"
          style="width: ${percent}%"
          aria-valuenow="${value}"
          aria-valuemin="0"
          aria-valuemax="${max}"
        >
          ${percentHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Create a modal template
 * @param {Object} options - Modal options
 * @returns {string} HTML string
 */
export function createModal({
  id = '',
  title = '',
  content = '',
  footer = null,
  size = 'medium',
  closeButton = true,
  className = '',
  attributes = {}
}) {
  const classes = ['modal', `modal-${size}`, className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const closeHtml = closeButton ? `
    <button class="modal-close" data-micromodal-close aria-label="Close modal">
      <i class="fas fa-times"></i>
    </button>
  ` : '';

  const footerHtml = footer ? `<div class="modal-footer">${footer}</div>` : '';

  return `
    <div id="${id}" class="${classes}" aria-hidden="true" ${attrs}>
      <div class="modal-overlay" tabindex="-1" data-micromodal-close>
        <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
          <header class="modal-header">
            <h2 id="${id}-title" class="modal-title">${title}</h2>
            ${closeHtml}
          </header>
          <main class="modal-content">
            ${content}
          </main>
          ${footerHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Create a list component
 * @param {Object} options - List options
 * @returns {string} HTML string
 */
export function createList({
  items = [],
  ordered = false,
  className = '',
  itemRenderer = null,
  attributes = {}
}) {
  const ListTag = ordered ? 'ol' : 'ul';
  const classes = ['list', className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const renderItem = itemRenderer || ((item) => {
    if (typeof item === 'object' && item.html) {
      return item.html;
    }
    return String(item);
  });

  const itemsHtml = items.map((item, index) => `
    <li class="list-item" data-index="${index}">
      ${renderItem(item, index)}
    </li>
  `).join('');

  return `
    <${ListTag} class="${classes}" ${attrs}>
      ${itemsHtml}
    </${ListTag}>
  `;
}

/**
 * Create a countdown timer component
 * @param {Object} options - Timer options
 * @returns {string} HTML string
 */
export function createCountdownTimer({
  deadline = null,
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
  className = '',
  attributes = {}
}) {
  const classes = ['countdown-timer', className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const units = [];
  if (showDays) units.push({ key: 'days', label: 'Days' });
  if (showHours) units.push({ key: 'hours', label: 'Hours' });
  if (showMinutes) units.push({ key: 'minutes', label: 'Minutes' });
  if (showSeconds) units.push({ key: 'seconds', label: 'Seconds' });

  const unitsHtml = units.map(unit => `
    <div class="countdown-unit">
      <span class="countdown-value" data-unit="${unit.key}">00</span>
      <span class="countdown-label">${unit.label}</span>
    </div>
  `).join('');

  return `
    <div class="${classes}" data-deadline="${deadline}" ${attrs}>
      ${unitsHtml}
    </div>
  `;
}

/**
 * Create social share buttons
 * @param {Object} options - Share options
 * @returns {string} HTML string
 */
export function createShareButtons({
  url = window.location.href,
  title = document.title,
  platforms = ['facebook', 'twitter', 'whatsapp', 'email'],
  className = '',
  attributes = {}
}) {
  const classes = ['share-buttons', className].filter(Boolean).join(' ');
  
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const shareLinks = {
    facebook: {
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: 'fab fa-facebook-f',
      label: 'Share on Facebook'
    },
    twitter: {
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      icon: 'fab fa-twitter',
      label: 'Share on Twitter'
    },
    whatsapp: {
      url: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
      icon: 'fab fa-whatsapp',
      label: 'Share on WhatsApp'
    },
    email: {
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
      icon: 'fas fa-envelope',
      label: 'Share via Email'
    }
  };

  const buttonsHtml = platforms.map(platform => {
    const share = shareLinks[platform];
    if (!share) return '';
    
    return `
      <a href="${share.url}" 
         class="share-button share-${platform}" 
         target="_blank" 
         rel="noopener noreferrer"
         aria-label="${share.label}">
        <i class="${share.icon}"></i>
      </a>
    `;
  }).join('');

  return `
    <div class="${classes}" ${attrs}>
      ${buttonsHtml}
    </div>
  `;
}

export default {
  createButton,
  createInput,
  createCard,
  createAlert,
  createSpinner,
  createProgressBar,
  createModal,
  createList,
  createCountdownTimer,
  createShareButtons
};