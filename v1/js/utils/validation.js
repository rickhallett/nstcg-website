/**
 * Validation Utilities Module
 * @module Validation
 */

/**
 * Common validation patterns
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  emailStrict: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/,
  phoneUK: /^(?:(?:\+44)|(?:0))(?:\d{10}|\d{4}\s\d{6}|\d{5}\s\d{5})$/,
  postcode: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i,
  postcodeUK: /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0A{2})$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z]+$/,
  numeric: /^[0-9]+$/,
  decimal: /^-?\d+\.?\d*$/,
  integer: /^-?\d+$/,
  positiveInteger: /^\d+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  username: /^[a-zA-Z0-9_-]{3,16}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$/,
  hexColor: /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i,
  ipv4: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]\d|2[0-3]):([0-5]\d)$/,
  dateTime: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
};

/**
 * String validators
 */
export const string = {
  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean} Is empty
   */
  isEmpty(value) {
    return value === null || value === undefined || value === '' || 
           (typeof value === 'string' && value.trim() === '') ||
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  },

  /**
   * Check if value is not empty
   * @param {*} value - Value to check
   * @returns {boolean} Is not empty
   */
  isNotEmpty(value) {
    return !this.isEmpty(value);
  },

  /**
   * Check minimum length
   * @param {string} value - Value to check
   * @param {number} min - Minimum length
   * @returns {boolean} Meets minimum length
   */
  minLength(value, min) {
    return value && value.length >= min;
  },

  /**
   * Check maximum length
   * @param {string} value - Value to check
   * @param {number} max - Maximum length
   * @returns {boolean} Within maximum length
   */
  maxLength(value, max) {
    return !value || value.length <= max;
  },

  /**
   * Check exact length
   * @param {string} value - Value to check
   * @param {number} length - Required length
   * @returns {boolean} Matches length
   */
  length(value, length) {
    return value && value.length === length;
  },

  /**
   * Check if value matches pattern
   * @param {string} value - Value to check
   * @param {RegExp} pattern - Pattern to match
   * @returns {boolean} Matches pattern
   */
  matches(value, pattern) {
    return !value || pattern.test(value);
  },

  /**
   * Check if value contains substring
   * @param {string} value - Value to check
   * @param {string} substring - Substring to find
   * @param {boolean} caseSensitive - Case sensitive search
   * @returns {boolean} Contains substring
   */
  contains(value, substring, caseSensitive = true) {
    if (!value || !substring) return false;
    
    if (caseSensitive) {
      return value.includes(substring);
    }
    return value.toLowerCase().includes(substring.toLowerCase());
  },

  /**
   * Check if value starts with prefix
   * @param {string} value - Value to check
   * @param {string} prefix - Prefix to check
   * @returns {boolean} Starts with prefix
   */
  startsWith(value, prefix) {
    return value && value.startsWith(prefix);
  },

  /**
   * Check if value ends with suffix
   * @param {string} value - Value to check
   * @param {string} suffix - Suffix to check
   * @returns {boolean} Ends with suffix
   */
  endsWith(value, suffix) {
    return value && value.endsWith(suffix);
  }
};

/**
 * Number validators
 */
export const number = {
  /**
   * Check if value is a number
   * @param {*} value - Value to check
   * @returns {boolean} Is number
   */
  isNumber(value) {
    return !isNaN(value) && isFinite(value);
  },

  /**
   * Check if value is an integer
   * @param {*} value - Value to check
   * @returns {boolean} Is integer
   */
  isInteger(value) {
    return Number.isInteger(Number(value));
  },

  /**
   * Check if value is positive
   * @param {number} value - Value to check
   * @returns {boolean} Is positive
   */
  isPositive(value) {
    return this.isNumber(value) && Number(value) > 0;
  },

  /**
   * Check if value is negative
   * @param {number} value - Value to check
   * @returns {boolean} Is negative
   */
  isNegative(value) {
    return this.isNumber(value) && Number(value) < 0;
  },

  /**
   * Check minimum value
   * @param {number} value - Value to check
   * @param {number} min - Minimum value
   * @returns {boolean} Meets minimum
   */
  min(value, min) {
    return this.isNumber(value) && Number(value) >= min;
  },

  /**
   * Check maximum value
   * @param {number} value - Value to check
   * @param {number} max - Maximum value
   * @returns {boolean} Within maximum
   */
  max(value, max) {
    return this.isNumber(value) && Number(value) <= max;
  },

  /**
   * Check if value is between min and max
   * @param {number} value - Value to check
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} Is between
   */
  between(value, min, max) {
    return this.isNumber(value) && Number(value) >= min && Number(value) <= max;
  },

  /**
   * Check if value is in range (exclusive)
   * @param {number} value - Value to check
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} Is in range
   */
  inRange(value, min, max) {
    return this.isNumber(value) && Number(value) > min && Number(value) < max;
  }
};

/**
 * Date validators
 */
export const date = {
  /**
   * Check if value is a valid date
   * @param {*} value - Value to check
   * @returns {boolean} Is valid date
   */
  isDate(value) {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  },

  /**
   * Check if date is before another date
   * @param {Date|string} value - Date to check
   * @param {Date|string} before - Reference date
   * @returns {boolean} Is before
   */
  isBefore(value, before) {
    const date1 = new Date(value);
    const date2 = new Date(before);
    return this.isDate(date1) && this.isDate(date2) && date1 < date2;
  },

  /**
   * Check if date is after another date
   * @param {Date|string} value - Date to check
   * @param {Date|string} after - Reference date
   * @returns {boolean} Is after
   */
  isAfter(value, after) {
    const date1 = new Date(value);
    const date2 = new Date(after);
    return this.isDate(date1) && this.isDate(date2) && date1 > date2;
  },

  /**
   * Check if date is between two dates
   * @param {Date|string} value - Date to check
   * @param {Date|string} start - Start date
   * @param {Date|string} end - End date
   * @returns {boolean} Is between
   */
  isBetween(value, start, end) {
    const date = new Date(value);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.isDate(date) && date >= startDate && date <= endDate;
  },

  /**
   * Check if date is today
   * @param {Date|string} value - Date to check
   * @returns {boolean} Is today
   */
  isToday(value) {
    const date = new Date(value);
    const today = new Date();
    return this.isDate(date) && 
           date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  },

  /**
   * Check if date is in the past
   * @param {Date|string} value - Date to check
   * @returns {boolean} Is in past
   */
  isPast(value) {
    const date = new Date(value);
    return this.isDate(date) && date < new Date();
  },

  /**
   * Check if date is in the future
   * @param {Date|string} value - Date to check
   * @returns {boolean} Is in future
   */
  isFuture(value) {
    const date = new Date(value);
    return this.isDate(date) && date > new Date();
  },

  /**
   * Check if year is leap year
   * @param {number} year - Year to check
   * @returns {boolean} Is leap year
   */
  isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
};

/**
 * Type validators
 */
export const type = {
  /**
   * Check if value is string
   * @param {*} value - Value to check
   * @returns {boolean} Is string
   */
  isString(value) {
    return typeof value === 'string';
  },

  /**
   * Check if value is boolean
   * @param {*} value - Value to check
   * @returns {boolean} Is boolean
   */
  isBoolean(value) {
    return typeof value === 'boolean';
  },

  /**
   * Check if value is array
   * @param {*} value - Value to check
   * @returns {boolean} Is array
   */
  isArray(value) {
    return Array.isArray(value);
  },

  /**
   * Check if value is object
   * @param {*} value - Value to check
   * @returns {boolean} Is object
   */
  isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },

  /**
   * Check if value is function
   * @param {*} value - Value to check
   * @returns {boolean} Is function
   */
  isFunction(value) {
    return typeof value === 'function';
  },

  /**
   * Check if value is null
   * @param {*} value - Value to check
   * @returns {boolean} Is null
   */
  isNull(value) {
    return value === null;
  },

  /**
   * Check if value is undefined
   * @param {*} value - Value to check
   * @returns {boolean} Is undefined
   */
  isUndefined(value) {
    return value === undefined;
  },

  /**
   * Check if value is null or undefined
   * @param {*} value - Value to check
   * @returns {boolean} Is null or undefined
   */
  isNil(value) {
    return value === null || value === undefined;
  }
};

/**
 * Format validators
 */
export const format = {
  /**
   * Check if value is valid email
   * @param {string} value - Value to check
   * @returns {boolean} Is valid email
   */
  isEmail(value) {
    return patterns.email.test(value);
  },

  /**
   * Check if value is valid URL
   * @param {string} value - Value to check
   * @returns {boolean} Is valid URL
   */
  isUrl(value) {
    return patterns.url.test(value);
  },

  /**
   * Check if value is valid phone
   * @param {string} value - Value to check
   * @returns {boolean} Is valid phone
   */
  isPhone(value) {
    return patterns.phone.test(value);
  },

  /**
   * Check if value is valid UK phone
   * @param {string} value - Value to check
   * @returns {boolean} Is valid UK phone
   */
  isPhoneUK(value) {
    return patterns.phoneUK.test(value);
  },

  /**
   * Check if value is valid postcode
   * @param {string} value - Value to check
   * @returns {boolean} Is valid postcode
   */
  isPostcode(value) {
    return patterns.postcode.test(value);
  },

  /**
   * Check if value is valid UK postcode
   * @param {string} value - Value to check
   * @returns {boolean} Is valid UK postcode
   */
  isPostcodeUK(value) {
    return patterns.postcodeUK.test(value);
  },

  /**
   * Check if value is alphanumeric
   * @param {string} value - Value to check
   * @returns {boolean} Is alphanumeric
   */
  isAlphanumeric(value) {
    return patterns.alphanumeric.test(value);
  },

  /**
   * Check if value is alphabetic
   * @param {string} value - Value to check
   * @returns {boolean} Is alphabetic
   */
  isAlphabetic(value) {
    return patterns.alphabetic.test(value);
  },

  /**
   * Check if value is numeric
   * @param {string} value - Value to check
   * @returns {boolean} Is numeric
   */
  isNumeric(value) {
    return patterns.numeric.test(value);
  },

  /**
   * Check if value is valid hex color
   * @param {string} value - Value to check
   * @returns {boolean} Is valid hex color
   */
  isHexColor(value) {
    return patterns.hexColor.test(value);
  },

  /**
   * Check if value is valid credit card
   * @param {string} value - Value to check
   * @returns {boolean} Is valid credit card
   */
  isCreditCard(value) {
    return patterns.creditCard.test(value);
  },

  /**
   * Check if value is valid IPv4
   * @param {string} value - Value to check
   * @returns {boolean} Is valid IPv4
   */
  isIPv4(value) {
    return patterns.ipv4.test(value);
  },

  /**
   * Check if value is valid IPv6
   * @param {string} value - Value to check
   * @returns {boolean} Is valid IPv6
   */
  isIPv6(value) {
    return patterns.ipv6.test(value);
  }
};

/**
 * Array validators
 */
export const array = {
  /**
   * Check if array has minimum length
   * @param {Array} value - Array to check
   * @param {number} min - Minimum length
   * @returns {boolean} Has minimum length
   */
  minLength(value, min) {
    return Array.isArray(value) && value.length >= min;
  },

  /**
   * Check if array has maximum length
   * @param {Array} value - Array to check
   * @param {number} max - Maximum length
   * @returns {boolean} Within maximum length
   */
  maxLength(value, max) {
    return Array.isArray(value) && value.length <= max;
  },

  /**
   * Check if array contains value
   * @param {Array} arr - Array to check
   * @param {*} value - Value to find
   * @returns {boolean} Contains value
   */
  contains(arr, value) {
    return Array.isArray(arr) && arr.includes(value);
  },

  /**
   * Check if array is unique
   * @param {Array} value - Array to check
   * @returns {boolean} Has unique values
   */
  isUnique(value) {
    if (!Array.isArray(value)) return false;
    return new Set(value).size === value.length;
  }
};

/**
 * Object validators
 */
export const object = {
  /**
   * Check if object has property
   * @param {Object} obj - Object to check
   * @param {string} property - Property name
   * @returns {boolean} Has property
   */
  hasProperty(obj, property) {
    return obj && obj.hasOwnProperty(property);
  },

  /**
   * Check if object has all properties
   * @param {Object} obj - Object to check
   * @param {Array<string>} properties - Property names
   * @returns {boolean} Has all properties
   */
  hasProperties(obj, properties) {
    if (!obj || !Array.isArray(properties)) return false;
    return properties.every(prop => this.hasProperty(obj, prop));
  },

  /**
   * Check if object is empty
   * @param {Object} obj - Object to check
   * @returns {boolean} Is empty
   */
  isEmpty(obj) {
    return !obj || Object.keys(obj).length === 0;
  },

  /**
   * Check if objects are equal (shallow)
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {boolean} Are equal
   */
  isEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => obj1[key] === obj2[key]);
  }
};

/**
 * Custom validators
 */
export const custom = {
  /**
   * Check if value passes all validators
   * @param {*} value - Value to check
   * @param {...Function} validators - Validator functions
   * @returns {boolean} Passes all validators
   */
  all(value, ...validators) {
    return validators.every(validator => validator(value));
  },

  /**
   * Check if value passes any validator
   * @param {*} value - Value to check
   * @param {...Function} validators - Validator functions
   * @returns {boolean} Passes any validator
   */
  any(value, ...validators) {
    return validators.some(validator => validator(value));
  },

  /**
   * Create a required validator
   * @param {string} message - Error message
   * @returns {Function} Validator function
   */
  required(message = 'This field is required') {
    return (value) => ({
      valid: string.isNotEmpty(value),
      message
    });
  },

  /**
   * Create a pattern validator
   * @param {RegExp} pattern - Pattern to match
   * @param {string} message - Error message
   * @returns {Function} Validator function
   */
  pattern(pattern, message = 'Invalid format') {
    return (value) => ({
      valid: !value || pattern.test(value),
      message
    });
  },

  /**
   * Create a conditional validator
   * @param {Function} condition - Condition function
   * @param {Function} validator - Validator to apply if condition is true
   * @returns {Function} Validator function
   */
  when(condition, validator) {
    return (value, data) => {
      if (condition(value, data)) {
        return validator(value, data);
      }
      return { valid: true };
    };
  }
};

/**
 * Validation builder class
 */
export class ValidationBuilder {
  constructor() {
    this.rules = [];
  }

  /**
   * Add required rule
   * @param {string} message - Error message
   * @returns {ValidationBuilder} Builder instance
   */
  required(message) {
    this.rules.push({
      validator: (value) => string.isNotEmpty(value),
      message: message || 'This field is required'
    });
    return this;
  }

  /**
   * Add email rule
   * @param {string} message - Error message
   * @returns {ValidationBuilder} Builder instance
   */
  email(message) {
    this.rules.push({
      validator: (value) => !value || format.isEmail(value),
      message: message || 'Invalid email address'
    });
    return this;
  }

  /**
   * Add min length rule
   * @param {number} length - Minimum length
   * @param {string} message - Error message
   * @returns {ValidationBuilder} Builder instance
   */
  minLength(length, message) {
    this.rules.push({
      validator: (value) => !value || string.minLength(value, length),
      message: message || `Minimum ${length} characters required`
    });
    return this;
  }

  /**
   * Add max length rule
   * @param {number} length - Maximum length
   * @param {string} message - Error message
   * @returns {ValidationBuilder} Builder instance
   */
  maxLength(length, message) {
    this.rules.push({
      validator: (value) => !value || string.maxLength(value, length),
      message: message || `Maximum ${length} characters allowed`
    });
    return this;
  }

  /**
   * Add pattern rule
   * @param {RegExp} pattern - Pattern to match
   * @param {string} message - Error message
   * @returns {ValidationBuilder} Builder instance
   */
  pattern(pattern, message) {
    this.rules.push({
      validator: (value) => !value || pattern.test(value),
      message: message || 'Invalid format'
    });
    return this;
  }

  /**
   * Add custom rule
   * @param {Function} validator - Validator function
   * @param {string} message - Error message
   * @returns {ValidationBuilder} Builder instance
   */
  custom(validator, message) {
    this.rules.push({
      validator,
      message: message || 'Invalid value'
    });
    return this;
  }

  /**
   * Build validator function
   * @returns {Function} Validator function
   */
  build() {
    return (value, data) => {
      for (const rule of this.rules) {
        if (!rule.validator(value, data)) {
          return {
            valid: false,
            message: rule.message
          };
        }
      }
      return { valid: true };
    };
  }
}

/**
 * Create a new validation builder
 * @returns {ValidationBuilder} Builder instance
 */
export function validate() {
  return new ValidationBuilder();
}

/**
 * Sanitization utilities
 */
export const sanitize = {
  /**
   * Trim whitespace
   * @param {string} value - Value to sanitize
   * @returns {string} Trimmed value
   */
  trim(value) {
    return value ? String(value).trim() : '';
  },

  /**
   * Convert to lowercase
   * @param {string} value - Value to sanitize
   * @returns {string} Lowercase value
   */
  toLowerCase(value) {
    return value ? String(value).toLowerCase() : '';
  },

  /**
   * Convert to uppercase
   * @param {string} value - Value to sanitize
   * @returns {string} Uppercase value
   */
  toUpperCase(value) {
    return value ? String(value).toUpperCase() : '';
  },

  /**
   * Remove non-alphanumeric characters
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  alphanumeric(value) {
    return value ? String(value).replace(/[^a-zA-Z0-9]/g, '') : '';
  },

  /**
   * Remove HTML tags
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  stripTags(value) {
    return value ? String(value).replace(/<[^>]*>/g, '') : '';
  },

  /**
   * Escape HTML entities
   * @param {string} value - Value to sanitize
   * @returns {string} Escaped value
   */
  escapeHtml(value) {
    if (!value) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(value).replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * Normalize email
   * @param {string} value - Email to normalize
   * @returns {string} Normalized email
   */
  email(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase();
  },

  /**
   * Normalize phone number
   * @param {string} value - Phone to normalize
   * @returns {string} Normalized phone
   */
  phone(value) {
    if (!value) return '';
    return String(value).replace(/[^\d+]/g, '');
  }
};

// Export all utilities
export default {
  patterns,
  string,
  number,
  date,
  type,
  format,
  array,
  object,
  custom,
  validate,
  sanitize,
  ValidationBuilder
};