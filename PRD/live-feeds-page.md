# Product Requirements Document: See More Live Feeds Page

## Feature Overview
A dedicated page displaying all registered participants in the NSTCG campaign, extending the existing live feeds section from the homepage.

### Version: 1.0
### Date: January 2025
### Priority: HIGH

---

## Executive Summary

The "See More" Live Feeds page provides a complete view of all campaign participants, removing the limitation of showing only recent registrations. It maintains visual consistency with the homepage while offering a comprehensive participant directory.

### Key Metrics
- **Complexity**: Small (8 story points)
- **Development Time**: 2-3 days
- **Dependencies**: Navigation System
- **Testing Time**: 1 day

---

## User Stories

### Curious Visitors
```
As a site visitor
I want to see all registered participants
So that I can understand the full scale of community support
```

### Community Members
```
As a community member
I want to find my neighbors who've registered
So that I can connect with like-minded residents
```

### Campaign Organizers
```
As a campaign organizer
I want to showcase total participation
So that I can demonstrate campaign momentum
```

---

## Technical Requirements

### Page Structure
- **URL**: `/feeds.html`
- **Layout**: Full-width responsive grid
- **Data Source**: Notion API (same as homepage)
- **Loading**: Single load, no pagination
- **Sorting**: Most recent first (default)

### Components to Reuse
1. Navigation header (from navigation system)
2. Footer (from homepage)
3. Participant card styling (from homepage)
4. Loading spinner (from homepage)

### New Components
1. Page hero section
2. Stats summary bar
3. Sort/filter controls (future enhancement)

### Implementation Details

#### HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Same head as index.html -->
    <title>All Participants - NSTCG</title>
</head>
<body>
    <!-- Navigation (shared component) -->
    
    <main class="feeds-page">
        <!-- Hero Section -->
        <section class="feeds-hero">
            <div class="container">
                <h1>Community Voices</h1>
                <p>Every signature represents a Swanage resident demanding safer streets</p>
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number" id="total-count">0</span>
                        <span class="stat-label">Total Participants</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="today-count">0</span>
                        <span class="stat-label">Joined Today</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="week-count">0</span>
                        <span class="stat-label">This Week</span>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- All Feeds Section -->
        <section class="all-feeds">
            <div class="container">
                <div id="feeds-grid" class="feeds-grid">
                    <!-- Participant cards loaded here -->
                </div>
                <div id="loading-spinner" class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading participants...</p>
                </div>
            </div>
        </section>
    </main>
    
    <!-- Footer (shared component) -->
</body>
</html>
```

#### JavaScript Requirements
```javascript
// Core functions:
1. loadAllParticipants() - Fetch all data from API
2. renderParticipantCard() - Reuse from homepage
3. calculateStats() - Count today/week participants
4. handleLoadError() - Error state UI
5. initializePage() - Setup and load data
```

#### CSS Requirements
- Reuse existing `.feeds-grid` styles
- Reuse existing `.participant-card` styles
- New hero section styling
- Stats bar with responsive layout
- Loading and error states

### API Integration
- Endpoint: `/api/get-all-participants` (new)
- Response: Array of all participants
- Caching: Consider 5-minute cache
- Error handling: Graceful fallback

---

## Development Breakdown

### Frontend (5 points)
- Page setup and hero (2)
- Stats calculation (1)
- Grid rendering (1)
- Error handling (1)

### Backend (3 points)
- New API endpoint (2)
- Caching logic (1)

---

## BDD Scenarios

```gherkin
Feature: View All Participants
  As a visitor
  I want to see all campaign participants
  So that I can gauge community support

  Scenario: Load feeds page
    Given I navigate to /feeds.html
    Then I should see a loading spinner
    And all participants should load
    And I should see participant statistics

  Scenario: View participant details
    Given the feeds page has loaded
    When I view a participant card
    Then I should see their name
    And I should see their comment
    And I should see when they joined

  Scenario: Handle large dataset
    Given there are 1000+ participants
    When I load the feeds page
    Then all participants should display
    And the page should remain responsive

  Scenario: Error handling
    Given the API is unavailable
    When I load the feeds page
    Then I should see an error message
    And I should see a retry button
```

---

## TDD Test Requirements

```javascript
// Unit Tests
describe('Feeds Page', () => {
  test('should calculate today count correctly', () => {});
  test('should calculate week count correctly', () => {});
  test('should format dates consistently', () => {});
  test('should handle empty participant list', () => {});
});

describe('Stats Calculation', () => {
  test('should count participants by date', () => {});
  test('should handle timezone correctly', () => {});
  test('should update counts dynamically', () => {});
});

// Integration Tests
describe('API Integration', () => {
  test('should fetch all participants', () => {});
  test('should handle API errors gracefully', () => {});
  test('should implement caching correctly', () => {});
});

// E2E Tests
describe('Feeds Page Journey', () => {
  test('user can view all participants', () => {});
  test('statistics display correctly', () => {});
  test('page performs well with many items', () => {});
});
```

---

## Performance Considerations

- Lazy load images after initial render
- Virtual scrolling for 1000+ items (future)
- Compress API response
- Browser caching for static assets
- Minimize reflows during render

---

## Accessibility Requirements

- Semantic HTML structure
- ARIA labels for statistics
- Keyboard navigation support
- Screen reader announcements
- Sufficient color contrast

---

## Future Enhancements

1. Search functionality
2. Filter by area/postcode
3. Sort options (newest/oldest)
4. Virtual scrolling for performance
5. Share specific participant card
6. Export participant list (admin only)

---

## Success Criteria

- [ ] All participants load successfully
- [ ] Statistics calculate correctly
- [ ] Page loads in < 3 seconds
- [ ] Responsive on all devices
- [ ] Accessible to screen readers
- [ ] Error states handled gracefully
- [ ] Visual consistency with homepage