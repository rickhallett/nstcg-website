# Product Requirements Document: NSTCG Website Modularization

## Project Overview

### Background
The North Swanage Traffic Consultation Group (NSTCG) website is currently built as a monolithic application with a single 1500+ line JavaScript file and a large CSS file. This structure makes the codebase difficult to maintain, extend, and test. The goal of this project is to refactor the codebase into a modular, maintainable architecture while preserving all existing functionality.

### Objectives
1. Break down monolithic files into logical, reusable modules
2. Implement a lightweight state management system
3. Add comprehensive documentation with JSDoc
4. Create a configuration system for easy customization
5. Implement a templating system for dynamic UI components
6. Improve code organization and maintainability

## Current State Analysis

### Technical Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Vercel Serverless Functions
- **Database**: Notion API
- **Dependencies**: MicroModal, Font Awesome, Animate.css
- **Deployment**: Vercel

### Current Issues
1. **Monolithic Structure**: Single main.js file with 1500+ lines
2. **Global Variables**: State scattered across global variables
3. **No Module System**: All code in one namespace
4. **Limited Reusability**: Components not abstracted
5. **Documentation**: Minimal inline comments
6. **Configuration**: Hard-coded values throughout

## Requirements

### Functional Requirements

#### FR1: Module System
- **FR1.1**: JavaScript code must be split into ES6 modules
- **FR1.2**: Each module must have a single responsibility
- **FR1.3**: Modules must be imported/exported properly
- **FR1.4**: Dependencies between modules must be explicit

#### FR2: State Management
- **FR2.1**: Implement centralized state management
- **FR2.2**: State changes must notify subscribers
- **FR2.3**: State must be immutable
- **FR2.4**: Provide getter/setter methods

#### FR3: Configuration System
- **FR3.1**: Extract all configuration to separate files
- **FR3.2**: Support environment-specific configurations
- **FR3.3**: Configuration must be typed and documented
- **FR3.4**: No hard-coded values in implementation

#### FR4: Templating System
- **FR4.1**: Use Alpine.js for reactive templates
- **FR4.2**: Create reusable template functions
- **FR4.3**: Support dynamic data binding
- **FR4.4**: Templates must be testable

#### FR5: Documentation
- **FR5.1**: Add JSDoc comments to all functions
- **FR5.2**: Document module interfaces
- **FR5.3**: Include usage examples
- **FR5.4**: Generate API documentation

### Non-Functional Requirements

#### NFR1: Performance
- **NFR1.1**: Page load time must not increase by more than 10%
- **NFR1.2**: JavaScript bundle size must remain under 100KB
- **NFR1.3**: Maintain current Lighthouse scores

#### NFR2: Maintainability
- **NFR2.1**: Code coverage must exceed 80%
- **NFR2.2**: Cyclomatic complexity per function < 10
- **NFR2.3**: Clear separation of concerns

#### NFR3: Compatibility
- **NFR3.1**: Support all current browser targets
- **NFR3.2**: Maintain IE11 compatibility if currently supported
- **NFR3.3**: Progressive enhancement approach

## Technical Specifications

### Module Structure

```
/js/
├── main.js                 # Entry point
├── config/
│   ├── app.config.js      # Application settings
│   ├── api.config.js      # API endpoints
│   ├── ui.config.js       # UI constants
│   └── social.config.js   # Social media config
├── core/
│   ├── state.js           # State management
│   ├── events.js          # Event system
│   └── api.js             # API client
├── modules/
│   ├── countdown.js       # Countdown timer
│   ├── forms.js           # Form handling
│   ├── social.js          # Social sharing
│   ├── feed.js            # Live feed
│   ├── modal.js           # Modal management
│   └── analytics.js       # Analytics tracking
├── components/
│   ├── counter.js         # Animated counter
│   ├── toast.js           # Notifications
│   └── share-buttons.js   # Share buttons
├── templates/
│   └── templates.js       # HTML templates
└── utils/
    ├── dom.js             # DOM utilities
    ├── validation.js      # Validators
    └── format.js          # Formatters
```

### CSS Structure

```
/css/
├── main.css               # Entry point
├── base/
│   ├── reset.css         # Reset styles
│   ├── variables.css     # CSS variables
│   └── typography.css    # Typography
├── components/
│   ├── header.css        # Header component
│   ├── forms.css         # Form styles
│   ├── buttons.css       # Button styles
│   ├── modal.css         # Modal styles
│   └── feed.css          # Feed styles
├── layout/
│   └── grid.css          # Grid system
└── utilities/
    ├── animations.css    # Animations
    └── helpers.css       # Utility classes
```

### State Management Design

```javascript
class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
  }
  
  setState(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }
  
  getState(key) {
    return this.state[key];
  }
  
  subscribe(key, callback) {
    // Subscribe implementation
  }
  
  notify(key, value) {
    // Notify subscribers
  }
}
```

## Implementation Plan

### Phase 1: Foundation (Priority: High)
1. Create folder structure
2. Set up configuration files
3. Implement state management
4. Add Alpine.js integration

### Phase 2: Module Extraction (Priority: High)
1. Extract countdown functionality
2. Extract form handling logic
3. Extract API communication
4. Extract social sharing features
5. Extract live feed functionality
6. Extract modal management

### Phase 3: CSS Modularization (Priority: Medium)
1. Split CSS into component files
2. Create CSS variable system
3. Organize layout styles
4. Add utility classes

### Phase 4: Template System (Priority: Medium)
1. Create template functions
2. Convert static HTML to templates
3. Implement data binding
4. Add Alpine.js components

### Phase 5: Documentation (Priority: Medium)
1. Add JSDoc comments
2. Create usage examples
3. Generate documentation
4. Update README

## Success Criteria

1. **Code Organization**
   - No JavaScript file exceeds 300 lines
   - Clear module boundaries
   - Logical folder structure

2. **Functionality**
   - All existing features work identically
   - No regression in user experience
   - Performance metrics maintained

3. **Documentation**
   - 100% of public APIs documented
   - README updated with new structure
   - Setup instructions provided

4. **Testing**
   - Unit tests for core modules
   - Integration tests for critical paths
   - Manual testing checklist completed

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Comprehensive testing, gradual migration |
| Performance degradation | Medium | Performance monitoring, lazy loading |
| Browser compatibility issues | Medium | Testing across browsers, polyfills |
| Increased complexity | Low | Clear documentation, examples |

## Timeline

- **Week 1**: Foundation and core modules
- **Week 2**: Module extraction and testing
- **Week 3**: CSS modularization and templates
- **Week 4**: Documentation and final testing

## Dependencies

- Alpine.js (CDN)
- Existing dependencies (MicroModal, Font Awesome)
- Development tools (optional): Vite, ESLint, Prettier

## Appendix

### A. Current File Analysis
- main.js: 1525 lines
- styles.css: ~800 lines
- index.html: ~400 lines

### B. Module Mapping
- Countdown: lines 1-34
- API: lines 36-52, 162-174
- Forms: lines 54-160, 835-1074
- Feed: lines 417-545
- Social: lines 1191-1412
- Modal: lines 800-834, 1413-1525

### C. Configuration Extraction
- API endpoints
- Timing constants
- UI strings
- Social media URLs
- Storage keys