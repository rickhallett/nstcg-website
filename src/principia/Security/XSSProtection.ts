/**
 * @module XSSProtection
 * @description Security utilities for preventing XSS attacks
 * 
 * Provides comprehensive protection against Cross-Site Scripting (XSS) attacks
 * by sanitizing user input and safely rendering HTML content.
 */

/**
 * HTML entities that need escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
};

/**
 * Regex for matching HTML entities
 */
const ENTITY_REGEX = /[&<>"'\/]/g;

/**
 * Allowed HTML tags for safe rendering
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 'i', 'b',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'span', 'div'
]);

/**
 * Allowed attributes for specific tags
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  'a': new Set(['href', 'title', 'target', 'rel']),
  'img': new Set(['src', 'alt', 'width', 'height', 'title']),
  'blockquote': new Set(['cite']),
  '*': new Set(['class', 'id']) // Allowed on all tags
};

/**
 * Dangerous protocols to block (excluding data: which is handled separately)
 */
const DANGEROUS_PROTOCOLS = new Set([
  'javascript:',
  'vbscript:',
  'file:',
  'about:'
]);

/**
 * XSSProtection class for preventing XSS attacks
 */
export class XSSProtection {
  /**
   * Escape HTML entities in a string
   */
  public static escapeHtml(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    
    return str.replace(ENTITY_REGEX, (match) => HTML_ENTITIES[match]);
  }
  
  /**
   * Unescape HTML entities
   */
  public static unescapeHtml(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }
  
  /**
   * Sanitize HTML string by removing dangerous elements
   */
  public static sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
    if (typeof html !== 'string') {
      return '';
    }
    
    const {
      allowedTags = ALLOWED_TAGS,
      allowedAttributes = ALLOWED_ATTRIBUTES,
      allowDataUrls = false
    } = options;
    
    // Create a temporary DOM element
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Recursively clean the DOM tree
    this.cleanNode(temp, allowedTags, allowedAttributes, allowDataUrls);
    
    return temp.innerHTML;
  }
  
  /**
   * Clean a DOM node and its children
   */
  private static cleanNode(
    node: Node,
    allowedTags: Set<string>,
    allowedAttributes: Record<string, Set<string>>,
    allowDataUrls: boolean
  ): void {
    // Process child nodes first (to handle removals)
    const children = Array.from(node.childNodes);
    children.forEach(child => {
      this.cleanNode(child, allowedTags, allowedAttributes, allowDataUrls);
    });
    
    // Handle element nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      // Remove disallowed tags
      if (!allowedTags.has(tagName)) {
        // Move children up to parent before removing
        while (element.firstChild) {
          node.parentNode?.insertBefore(element.firstChild, element);
        }
        element.remove();
        return;
      }
      
      // Clean attributes
      const attributes = Array.from(element.attributes);
      attributes.forEach(attr => {
        if (!this.isAllowedAttribute(tagName, attr.name, allowedAttributes)) {
          element.removeAttribute(attr.name);
        } else if (attr.name === 'href' || attr.name === 'src') {
          // Sanitize URLs
          const sanitized = this.sanitizeUrl(attr.value, allowDataUrls);
          if (sanitized !== attr.value) {
            element.setAttribute(attr.name, sanitized);
          }
        }
      });
      
      // Add rel="noopener noreferrer" to external links
      if (tagName === 'a' && element.getAttribute('target') === '_blank') {
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
    
    // Handle text nodes - no action needed
    // Handle comment nodes - remove them
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
    }
  }
  
  /**
   * Check if an attribute is allowed
   */
  private static isAllowedAttribute(
    tagName: string,
    attrName: string,
    allowedAttributes: Record<string, Set<string>>
  ): boolean {
    // Check tag-specific attributes
    if (allowedAttributes[tagName]?.has(attrName)) {
      return true;
    }
    
    // Check universal attributes
    if (allowedAttributes['*']?.has(attrName)) {
      return true;
    }
    
    // Block event handlers
    if (attrName.startsWith('on')) {
      return false;
    }
    
    return false;
  }
  
  /**
   * Sanitize a URL
   */
  public static sanitizeUrl(url: string, allowDataUrls: boolean = false): string {
    if (!url) {
      return '';
    }
    
    // Trim and lowercase for protocol check
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();
    
    // Check for dangerous protocols
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (lower.startsWith(protocol)) {
        return '';
      }
    }
    
    // Handle data URLs
    if (lower.startsWith('data:') && !allowDataUrls) {
      return '';
    }
    
    // When data URLs are allowed, still check for images only
    if (lower.startsWith('data:') && allowDataUrls) {
      if (!lower.startsWith('data:image/')) {
        return '';
      }
    }
    
    return trimmed;
  }
  
  /**
   * Create a Content Security Policy header
   */
  public static createCSP(options: CSPOptions = {}): string {
    const {
      defaultSrc = ["'self'"],
      scriptSrc = ["'self'"],
      styleSrc = ["'self'", "'unsafe-inline'"],
      imgSrc = ["'self'", 'data:', 'https:'],
      connectSrc = ["'self'"],
      fontSrc = ["'self'"],
      objectSrc = ["'none'"],
      mediaSrc = ["'self'"],
      frameSrc = ["'none'"],
      reportUri
    } = options;
    
    const directives: string[] = [];
    
    if (defaultSrc.length) directives.push(`default-src ${defaultSrc.join(' ')}`);
    if (scriptSrc.length) directives.push(`script-src ${scriptSrc.join(' ')}`);
    if (styleSrc.length) directives.push(`style-src ${styleSrc.join(' ')}`);
    if (imgSrc.length) directives.push(`img-src ${imgSrc.join(' ')}`);
    if (connectSrc.length) directives.push(`connect-src ${connectSrc.join(' ')}`);
    if (fontSrc.length) directives.push(`font-src ${fontSrc.join(' ')}`);
    if (objectSrc.length) directives.push(`object-src ${objectSrc.join(' ')}`);
    if (mediaSrc.length) directives.push(`media-src ${mediaSrc.join(' ')}`);
    if (frameSrc.length) directives.push(`frame-src ${frameSrc.join(' ')}`);
    if (reportUri) directives.push(`report-uri ${reportUri}`);
    
    return directives.join('; ');
  }
  
  /**
   * Validate and sanitize JSON input
   */
  public static sanitizeJSON<T = any>(input: string): T | null {
    try {
      // Remove any BOM or zero-width characters
      const cleaned = input
        .replace(/^\uFEFF/, '') // Remove BOM
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width chars
      
      // Parse JSON
      const parsed = JSON.parse(cleaned);
      
      // Deep clean the object
      return this.deepCleanObject(parsed);
    } catch {
      return null;
    }
  }
  
  /**
   * Deep clean an object by sanitizing all string values
   */
  private static deepCleanObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this.escapeHtml(obj) as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCleanObject(item)) as T;
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Sanitize the key
          const cleanKey = this.escapeHtml(key);
          cleaned[cleanKey] = this.deepCleanObject(obj[key]);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
}

/**
 * Options for HTML sanitization
 */
export interface SanitizeOptions {
  allowedTags?: Set<string>;
  allowedAttributes?: Record<string, Set<string>>;
  allowDataUrls?: boolean;
}

/**
 * Options for Content Security Policy
 */
export interface CSPOptions {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  frameSrc?: string[];
  reportUri?: string;
}

/**
 * Create a secure HTML template literal tag
 */
export function html(strings: TemplateStringsArray, ...values: any[]): string {
  let result = '';
  
  strings.forEach((str, i) => {
    result += str;
    
    if (i < values.length) {
      const value = values[i];
      
      // Auto-escape all interpolated values
      if (value instanceof SafeHTML) {
        result += value.toString();
      } else if (Array.isArray(value)) {
        result += value.map(v => XSSProtection.escapeHtml(String(v))).join('');
      } else {
        result += XSSProtection.escapeHtml(String(value));
      }
    }
  });
  
  return result;
}

/**
 * Safe HTML wrapper for trusted content
 */
export class SafeHTML {
  constructor(private content: string) {}
  
  toString(): string {
    return this.content;
  }
  
  static trust(html: string): SafeHTML {
    // Only trust after sanitizing
    const sanitized = XSSProtection.sanitizeHtml(html);
    return new SafeHTML(sanitized);
  }
}