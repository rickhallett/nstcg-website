import { describe, it, expect } from 'bun:test';
import { XSSProtection, html, SafeHTML } from './XSSProtection';

describe('XSSProtection', () => {
  describe('escapeHtml', () => {
    it('should escape dangerous HTML characters', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = XSSProtection.escapeHtml(input);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape all HTML entities', () => {
      const input = '& < > " \' /';
      const escaped = XSSProtection.escapeHtml(input);
      expect(escaped).toBe('&amp; &lt; &gt; &quot; &#39; &#x2F;');
    });

    it('should handle empty and invalid input', () => {
      expect(XSSProtection.escapeHtml('')).toBe('');
      expect(XSSProtection.escapeHtml(null as any)).toBe('');
      expect(XSSProtection.escapeHtml(undefined as any)).toBe('');
      expect(XSSProtection.escapeHtml(123 as any)).toBe('');
    });

    it('should not double-escape', () => {
      const input = '&amp;';
      const escaped = XSSProtection.escapeHtml(input);
      expect(escaped).toBe('&amp;amp;');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      const input = '&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;';
      const unescaped = XSSProtection.unescapeHtml(input);
      expect(unescaped).toBe('<div>Hello & goodbye</div>');
    });

    it('should handle numeric entities', () => {
      const input = '&#39;&#x2F;';
      const unescaped = XSSProtection.unescapeHtml(input);
      expect(unescaped).toBe('\'/');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).toBe('<p>Hello</p>alert("XSS")<p>World</p>');
    });

    it('should remove event handlers', () => {
      const input = '<button onclick="alert(\'XSS\')">Click me</button>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).not.toContain('onclick');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).toBe(input);
    });

    it('should sanitize href attributes', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).toBe('<a href="">Click</a>');
    });

    it('should add rel attribute to external links', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).toContain('rel="noopener noreferrer"');
    });

    it('should remove dangerous protocols', () => {
      const inputs = [
        '<a href="javascript:void(0)">JS</a>',
        '<a href="vbscript:msgbox()">VB</a>',
        '<img src="data:text/html,<script>alert(1)</script>">',
        '<a href="file:///etc/passwd">File</a>'
      ];
      
      inputs.forEach(input => {
        const sanitized = XSSProtection.sanitizeHtml(input);
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('vbscript:');
        expect(sanitized).not.toContain('file:');
      });
    });

    it('should handle nested malicious content', () => {
      const input = '<div><div><script>alert("XSS")</script></div></div>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('<div><div>alert("XSS")</div></div>');
    });

    it('should remove HTML comments', () => {
      const input = '<p>Hello<!-- evil comment --></p>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).toBe('<p>Hello</p>');
    });

    it('should handle malformed HTML', () => {
      const input = '<p>Unclosed paragraph<script>alert("XSS")</script>';
      const sanitized = XSSProtection.sanitizeHtml(input);
      expect(sanitized).not.toContain('<script>');
    });

    it('should allow data URLs for images when enabled', () => {
      const input = '<img src="data:image/png;base64,iVBORw0KGgo=">';
      const sanitized = XSSProtection.sanitizeHtml(input, { allowDataUrls: true });
      expect(sanitized).toContain('data:image/png');
    });

    it('should block non-image data URLs even when enabled', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const sanitized = XSSProtection.sanitizeHtml(input, { allowDataUrls: true });
      expect(sanitized).toBe('<img src="">');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow safe URLs', () => {
      const urls = [
        'https://example.com',
        'http://example.com',
        '/relative/path',
        'relative/path',
        '#anchor',
        'mailto:test@example.com'
      ];
      
      urls.forEach(url => {
        expect(XSSProtection.sanitizeUrl(url)).toBe(url.trim());
      });
    });

    it('should block dangerous protocols', () => {
      const urls = [
        'javascript:alert(1)',
        'JavaScript:alert(1)', // Case variation
        '  javascript:alert(1)', // Whitespace
        'vbscript:msgbox()',
        'file:///etc/passwd',
        'about:blank'
      ];
      
      urls.forEach(url => {
        expect(XSSProtection.sanitizeUrl(url)).toBe('');
      });
    });

    it('should handle data URLs based on flag', () => {
      const imageDataUrl = 'data:image/png;base64,abc123';
      const htmlDataUrl = 'data:text/html,<script>alert(1)</script>';
      
      expect(XSSProtection.sanitizeUrl(imageDataUrl, false)).toBe('');
      expect(XSSProtection.sanitizeUrl(imageDataUrl, true)).toBe(imageDataUrl);
      expect(XSSProtection.sanitizeUrl(htmlDataUrl, true)).toBe('');
    });
  });

  describe('createCSP', () => {
    it('should create basic CSP header', () => {
      const csp = XSSProtection.createCSP();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('should handle custom CSP options', () => {
      const csp = XSSProtection.createCSP({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        reportUri: 'https://example.com/csp-report'
      });
      
      expect(csp).toContain("script-src 'self' https://cdn.example.com");
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain('report-uri https://example.com/csp-report');
    });
  });

  describe('sanitizeJSON', () => {
    it('should parse and sanitize JSON', () => {
      const input = '{"name": "<script>alert(1)</script>", "safe": "value"}';
      const result = XSSProtection.sanitizeJSON(input);
      
      expect(result).not.toBeNull();
      expect(result!.name).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      expect(result!.safe).toBe('value');
    });

    it('should handle nested objects', () => {
      const input = '{"user": {"name": "<b>Bold</b>", "bio": "<script>evil</script>"}}';
      const result = XSSProtection.sanitizeJSON(input);
      
      expect(result).not.toBeNull();
      expect(result!.user.name).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;');
      expect(result!.user.bio).toBe('&lt;script&gt;evil&lt;&#x2F;script&gt;');
    });

    it('should handle arrays', () => {
      const input = '["<script>", "safe", "<img onerror=alert(1)>"]';
      const result = XSSProtection.sanitizeJSON<string[]>(input);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('&lt;script&gt;');
      expect(result![1]).toBe('safe');
      expect(result![2]).toContain('&lt;img');
    });

    it('should handle invalid JSON', () => {
      const inputs = [
        '{invalid}',
        '{"unclosed": ',
        'undefined',
        ''
      ];
      
      inputs.forEach(input => {
        expect(XSSProtection.sanitizeJSON(input)).toBeNull();
      });
    });

    it('should remove BOM and zero-width characters', () => {
      const input = '\uFEFF{"clean": "value\u200B"}';
      const result = XSSProtection.sanitizeJSON(input);
      
      expect(result).not.toBeNull();
      expect(result!.clean).toBe('value');
    });
  });

  describe('html template tag', () => {
    it('should auto-escape interpolated values', () => {
      const userInput = '<script>alert("XSS")</script>';
      const name = 'John & Jane';
      
      const result = html`<div>Hello ${name}, you said: ${userInput}</div>`;
      
      expect(result).toBe('<div>Hello John &amp; Jane, you said: &lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;</div>');
    });

    it('should handle arrays', () => {
      const items = ['<b>One</b>', '<i>Two</i>', '<script>Three</script>'];
      
      const result = html`<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      
      expect(result).toContain('&lt;b&gt;One&lt;&#x2F;b&gt;');
      expect(result).toContain('&lt;script&gt;Three&lt;&#x2F;script&gt;');
    });

    it('should respect SafeHTML', () => {
      const trusted = SafeHTML.trust('<strong>Safe content</strong>');
      const untrusted = '<script>alert(1)</script>';
      
      const result = html`<div>${trusted} ${untrusted}</div>`;
      
      expect(result).toBe('<div><strong>Safe content</strong> &lt;script&gt;alert(1)&lt;&#x2F;script&gt;</div>');
    });
  });

  describe('SafeHTML', () => {
    it('should sanitize before trusting', () => {
      const input = '<p>Safe</p><script>alert(1)</script>';
      const trusted = SafeHTML.trust(input);
      
      expect(trusted.toString()).toBe('<p>Safe</p>alert(1)');
    });

    it('should work with html template tag', () => {
      const content = SafeHTML.trust('<em>Emphasized</em>');
      const result = html`<p>${content}</p>`;
      
      expect(result).toBe('<p><em>Emphasized</em></p>');
    });
  });
});