# Product Requirements Document: Footer Enhancement with Legal Pages

## 1. Overview

### 1.1 Purpose
This PRD outlines the requirements for enhancing the NSTCG website footer to include links to Privacy Policy and Terms & Conditions pages, along with the creation of these standalone legal information pages.

### 1.2 Objectives
- Add a professional footer with standard legal links
- Create minimalist Privacy Policy page
- Create minimalist Terms & Conditions page
- Maintain site consistency while keeping legal pages simple and readable

### 1.3 Success Criteria
- Footer displays on all pages with clear legal links
- Legal pages load independently without main site navigation
- Pages are accessible and readable on all devices
- Implementation maintains site performance

## 2. Feature Requirements

### 2.1 Footer Enhancement

#### 2.1.1 Visual Design
- **Position**: Bottom of all pages
- **Background**: Consistent with current footer (`#000` black)
- **Text Color**: `#666` (gray) for standard text, `#999` for links
- **Typography**: System font stack, 14px base size
- **Padding**: 40px vertical, 20px horizontal (matching current)

#### 2.1.2 Content Structure
```
North Swanage Community Group | Protecting Our Neighborhoods Since 2020
Privacy Policy · Terms & Conditions
```

#### 2.1.3 Link Behavior
- Links styled with underline on hover
- Smooth color transition on hover (`#ccc`)
- Open in same tab (standard navigation)
- Accessible keyboard navigation

### 2.2 Privacy Policy Page

#### 2.2.1 Page Requirements
- **URL**: `/privacy-policy.html`
- **Layout**: Standalone page (no site header/navigation)
- **Styling**: Minimal, focused on readability

#### 2.2.2 Visual Design
- **Background**: Pure black (`#000`)
- **Text Color**: White (`#fff`)
- **Font**: Monospace (`font-family: monospace`)
- **Font Size**: 16px base
- **Line Height**: 1.6 for readability
- **Max Width**: 800px centered
- **Padding**: 40px on all sides

#### 2.2.3 Content Structure
```html
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - NSTCG</title>
    <!-- Minimal meta tags -->
</head>
<body>
    <div class="legal-container">
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: [Date]</p>
        
        <!-- Policy sections -->
        <h2>Information We Collect</h2>
        <p>...</p>
        
        <h2>How We Use Your Information</h2>
        <p>...</p>
        
        <!-- etc. -->
        
        <a href="/" class="back-link">← Back to main site</a>
    </div>
</body>
</html>
```

### 2.3 Terms & Conditions Page

#### 2.3.1 Page Requirements
- **URL**: `/terms-and-conditions.html`
- **Layout**: Identical structure to Privacy Policy
- **Styling**: Same minimal monospace design

#### 2.3.2 Content Structure
- Same HTML structure as Privacy Policy
- Different content sections:
  - Terms of Use
  - User Responsibilities
  - Disclaimers
  - Contact Information
  - Governing Law

## 3. Technical Implementation

### 3.1 File Structure
```
/
├── index.html (update footer)
├── privacy-policy.html (new)
├── terms-and-conditions.html (new)
└── css/
    └── layout/
        └── footer.css (update)
```

### 3.2 CSS Updates

#### 3.2.1 Footer CSS Enhancement
```css
.footer {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-gray);
  font-size: 14px;
}

.footer-links {
  margin-top: 10px;
}

.footer-links a {
  color: var(--color-gray-light);
  text-decoration: none;
  padding: 0 10px;
  transition: color var(--transition-base);
}

.footer-links a:hover {
  color: var(--color-gray-lighter);
  text-decoration: underline;
}

.footer-separator {
  color: var(--color-gray);
  padding: 0 5px;
}
```

#### 3.2.2 Legal Pages CSS (Inline)
```css
body {
    background: #000;
    color: #fff;
    font-family: monospace;
    font-size: 16px;
    line-height: 1.6;
    margin: 0;
    padding: 0;
}

.legal-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
}

h1 {
    font-size: 24px;
    margin-bottom: 10px;
}

h2 {
    font-size: 18px;
    margin-top: 30px;
    margin-bottom: 15px;
}

.last-updated {
    color: #999;
    font-size: 14px;
    margin-bottom: 40px;
}

.back-link {
    color: #999;
    text-decoration: none;
    display: inline-block;
    margin-top: 40px;
}

.back-link:hover {
    color: #fff;
    text-decoration: underline;
}
```

### 3.3 Accessibility Requirements
- All links must have sufficient color contrast (WCAG AA)
- Keyboard navigation support
- Screen reader friendly markup
- Semantic HTML structure

### 3.4 Mobile Responsiveness
- Footer links stack vertically on mobile (<768px)
- Legal pages maintain readability with adjusted padding
- Font sizes scale appropriately

## 4. Content Guidelines

### 4.1 Privacy Policy Content
- Clear language, avoiding legal jargon where possible
- Sections covering:
  - Data collection practices
  - Use of cookies
  - Third-party services (Notion, Vercel)
  - User rights
  - Contact information

### 4.2 Terms & Conditions Content
- Community-focused language
- Sections covering:
  - Acceptable use
  - User submissions
  - Intellectual property
  - Disclaimers and limitations
  - Modifications to terms

## 5. Implementation Timeline

### Phase 1: Footer Update
1. Update footer HTML structure
2. Enhance footer CSS
3. Test across devices

### Phase 2: Legal Pages
1. Create Privacy Policy page
2. Create Terms & Conditions page
3. Add minimal styling
4. Link from footer

### Phase 3: Testing & Launch
1. Cross-browser testing
2. Mobile device testing
3. Accessibility audit
4. Deploy to production

## 6. Future Considerations

- Cookie consent banner (if needed)
- Additional legal pages (GDPR compliance, etc.)
- Dynamic content loading for legal text updates
- Multi-language support

## 7. Success Metrics

- Zero broken links
- Page load time <1 second
- Mobile-friendly test pass
- Accessibility score >90
- Clear user feedback on legal page readability