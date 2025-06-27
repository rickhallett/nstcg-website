# Referral User Experience PRD

## Executive Summary

This document outlines requirements for creating an exceptional user experience around the referral system. The enhancements will provide users with clear visibility into their referral impact, beautiful shareable content, and motivating progress tracking through an intuitive dashboard interface.

## Problem Statement

Current user experience limitations:
- No visibility into referral performance
- Generic share content lacks personalization  
- Missing progress tracking and achievements
- No mobile-optimized sharing tools
- Lack of social proof in shared content

These issues lead to:
- Low referral engagement rates (< 10%)
- Users unaware of their impact
- Missed viral growth opportunities
- Poor mobile sharing experience

## Goals & Objectives

### Primary Goals
1. Create intuitive referral dashboard
2. Design beautiful shareable referral cards
3. Implement QR code generation for offline sharing
4. Build achievement and milestone system

### Success Metrics
- 50% increase in share rate
- 80% user satisfaction score
- 30% improvement in referral conversions
- 90% mobile sharing success rate

## User Stories

### As a Registered User
- I want to see my referral stats at a glance
- I want to track who I've referred
- I want to share beautiful referral cards
- I want to celebrate milestones and achievements

### As a Power Referrer
- I want detailed analytics on my network
- I want to compete on leaderboards
- I want special recognition for my impact
- I want advanced sharing tools

### As a Mobile User
- I want easy one-tap sharing
- I want QR codes for in-person referrals
- I want mobile-optimized referral cards
- I want offline sharing capabilities

### As a New User
- I want to understand how referrals work
- I want simple onboarding for sharing
- I want to see potential impact
- I want motivation to start sharing

## Functional Requirements

### 1. Referral Dashboard

#### Dashboard Overview
```javascript
const dashboardSections = {
  hero: {
    primaryMetric: 'Total Referrals',
    secondaryMetrics: ['This Week', 'Conversion Rate', 'Network Size'],
    visualType: 'animated-counter'
  },
  
  impactSummary: {
    title: 'Your Impact',
    metrics: [
      { label: 'People Reached', value: 47, icon: 'users' },
      { label: 'Actions Taken', value: 12, icon: 'check-circle' },
      { label: 'Network Growth', value: '+23%', icon: 'trending-up' },
      { label: 'Community Rank', value: '#8', icon: 'trophy' }
    ]
  },
  
  referralNetwork: {
    title: 'Your Network',
    visualization: 'network-graph',
    features: ['zoom', 'filter', 'explore']
  },
  
  activityFeed: {
    title: 'Recent Activity',
    items: [
      'Sarah joined through your link',
      'You earned 50 points',
      'Mike shared your referral',
      'You reached Top 10 status'
    ]
  }
};
```

#### Visual Components
```javascript
// Network Visualization
class NetworkGraph {
  render() {
    return {
      centerNode: {
        type: 'user',
        label: 'You',
        size: 'large',
        color: 'primary'
      },
      connections: [
        {
          type: 'direct-referral',
          nodes: this.getDirectReferrals(),
          style: 'solid-line'
        },
        {
          type: 'indirect-referral',
          nodes: this.getIndirectReferrals(),
          style: 'dashed-line'
        }
      ],
      interactions: {
        hover: 'show-details',
        click: 'expand-network',
        zoom: 'mouse-wheel',
        pan: 'drag'
      }
    };
  }
}

// Progress Tracking
class ProgressTracker {
  milestones = [
    { threshold: 1, label: 'First Referral', reward: 'Pioneer Badge' },
    { threshold: 5, label: 'Community Builder', reward: '50 Bonus Points' },
    { threshold: 10, label: 'Influencer', reward: 'Custom Card Design' },
    { threshold: 25, label: 'Ambassador', reward: 'Leaderboard Badge' },
    { threshold: 50, label: 'Legend', reward: 'Hall of Fame' }
  ];

  renderProgress(currentReferrals) {
    const nextMilestone = this.milestones.find(m => m.threshold > currentReferrals);
    const progress = nextMilestone 
      ? (currentReferrals / nextMilestone.threshold) * 100
      : 100;

    return {
      currentLevel: this.getCurrentLevel(currentReferrals),
      nextMilestone,
      progressPercent: progress,
      unlockedRewards: this.getUnlockedRewards(currentReferrals)
    };
  }
}
```

### 2. Shareable Referral Cards

#### Card Design System
```javascript
class ReferralCard {
  templates = {
    minimal: {
      dimensions: { width: 1200, height: 630 },
      background: 'gradient',
      elements: ['logo', 'message', 'code', 'cta']
    },
    
    personal: {
      dimensions: { width: 1200, height: 630 },
      background: 'photo-overlay',
      elements: ['avatar', 'name', 'message', 'stats', 'code']
    },
    
    impact: {
      dimensions: { width: 1200, height: 630 },
      background: 'data-visualization',
      elements: ['impact-number', 'community-size', 'urgency', 'code']
    },
    
    story: {
      dimensions: { width: 1080, height: 1920 }, // Stories format
      background: 'vertical-gradient',
      elements: ['hook', 'problem', 'solution', 'code', 'swipe-up']
    }
  };

  async generateCard(userId, template = 'minimal') {
    const userData = await this.getUserData(userId);
    const design = this.templates[template];
    
    // Generate dynamic content
    const content = {
      message: this.personalizeMessage(userData),
      stats: this.formatStats(userData.impact),
      visual: await this.generateVisual(design, userData)
    };
    
    // Render card
    return this.renderCard(design, content);
  }

  personalizeMessage(userData) {
    const templates = [
      `${userData.name} is making a difference in North Swanage`,
      `Join ${userData.name} and ${userData.networkSize} others`,
      `${userData.name} has helped ${userData.referralCount} people take action`,
      `Be part of ${userData.name}'s movement for safer streets`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
}
```

#### Dynamic Card Generation
```javascript
// Server-side card rendering
app.get('/api/referral-card/:userId/:template', async (req, res) => {
  const { userId, template } = req.params;
  
  // Generate card with Canvas/Sharp
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#00ff00');
  gradient.addColorStop(1, '#00cc00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  
  // User data
  const user = await getUserData(userId);
  
  // Text elements
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(user.name, 100, 200);
  
  ctx.font = '36px Arial';
  ctx.fillText(`Has referred ${user.referralCount} people`, 100, 280);
  
  // QR code
  const qrCode = await generateQRCode(user.referralUrl);
  ctx.drawImage(qrCode, 900, 400, 200, 200);
  
  // Return image
  res.type('png');
  canvas.createPNGStream().pipe(res);
});
```

### 3. QR Code Generation

#### QR Code System
```javascript
class QRCodeGenerator {
  async generate(referralUrl, options = {}) {
    const config = {
      size: options.size || 300,
      margin: options.margin || 4,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#ffffff'
      },
      logo: options.includeLogo ? await this.getLogo() : null,
      style: options.style || 'square' // square, dots, rounded
    };
    
    // Generate QR code
    const qrData = await QRCode.toDataURL(referralUrl, {
      width: config.size,
      margin: config.margin,
      color: config.color,
      errorCorrectionLevel: 'H' // High correction for logo overlay
    });
    
    // Add logo if requested
    if (config.logo) {
      return this.addLogoToQR(qrData, config.logo);
    }
    
    return qrData;
  }

  async generatePrintable(referralCode) {
    const template = `
      <div class="qr-print-template">
        <h1>Join the Movement</h1>
        <div class="qr-code">${await this.generate(referralCode)}</div>
        <p class="referral-code">${referralCode}</p>
        <p class="instructions">Scan to join or visit nstcg.org</p>
      </div>
    `;
    
    return {
      html: template,
      pdf: await this.generatePDF(template),
      image: await this.generateImage(template)
    };
  }
}
```

#### Offline Sharing Tools
```javascript
const offlineSharing = {
  // Generate business card design
  businessCard: {
    size: '3.5x2 inches',
    elements: [
      'QR code',
      'Referral code',
      'Short URL',
      'Call to action'
    ],
    formats: ['pdf', 'png', 'print-ready']
  },
  
  // Generate flyer design
  flyer: {
    size: 'A5',
    elements: [
      'Headline',
      'QR code',
      'Key points',
      'Referral code',
      'Contact info'
    ],
    formats: ['pdf', 'docx']
  },
  
  // Generate sticker design
  sticker: {
    size: '3x3 inches',
    elements: [
      'QR code',
      'Short message',
      'Logo'
    ],
    formats: ['pdf', 'svg']
  }
};
```

### 4. Achievement System

#### Achievement Framework
```javascript
class AchievementSystem {
  achievements = {
    referrals: [
      {
        id: 'first_referral',
        name: 'Pioneer',
        description: 'Made your first referral',
        icon: 'flag',
        points: 10,
        criteria: { referralCount: 1 }
      },
      {
        id: 'referral_streak',
        name: 'Consistent Advocate',
        description: 'Referred someone 7 days in a row',
        icon: 'fire',
        points: 50,
        criteria: { dailyStreak: 7 }
      },
      {
        id: 'viral_moment',
        name: 'Viral Sensation',
        description: '10 referrals in one day',
        icon: 'rocket',
        points: 100,
        criteria: { dailyReferrals: 10 }
      }
    ],
    
    engagement: [
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Shared on 5 different platforms',
        icon: 'share',
        points: 25,
        criteria: { platformsUsed: 5 }
      },
      {
        id: 'conversation_starter',
        name: 'Conversation Starter',
        description: 'Your referrals left 10 comments',
        icon: 'chat',
        points: 30,
        criteria: { referralComments: 10 }
      }
    ],
    
    impact: [
      {
        id: 'community_pillar',
        name: 'Community Pillar',
        description: 'Built a network of 50+ people',
        icon: 'users',
        points: 200,
        criteria: { networkSize: 50 }
      },
      {
        id: 'change_maker',
        name: 'Change Maker',
        description: 'Top 1% of referrers',
        icon: 'crown',
        points: 500,
        criteria: { percentile: 99 }
      }
    ]
  };

  async checkAchievements(userId) {
    const userData = await this.getUserData(userId);
    const newAchievements = [];
    
    for (const category of Object.values(this.achievements)) {
      for (const achievement of category) {
        if (!userData.achievements.includes(achievement.id)) {
          if (this.meetsCriteria(userData, achievement.criteria)) {
            newAchievements.push(achievement);
          }
        }
      }
    }
    
    if (newAchievements.length > 0) {
      await this.awardAchievements(userId, newAchievements);
      this.notifyUser(userId, newAchievements);
    }
    
    return newAchievements;
  }
}
```

#### Notification System
```javascript
class NotificationManager {
  templates = {
    achievement: {
      title: 'Achievement Unlocked! 🎉',
      body: 'You earned "{achievementName}"',
      action: 'View Achievement',
      style: 'celebration'
    },
    
    milestone: {
      title: 'Milestone Reached! 🎯',
      body: 'You\'ve referred {count} people',
      action: 'Share Your Success',
      style: 'success'
    },
    
    leaderboard: {
      title: 'Leaderboard Update! 📊',
      body: 'You\'re now ranked #{rank}',
      action: 'View Leaderboard',
      style: 'info'
    }
  };

  async notify(userId, type, data) {
    const user = await this.getUser(userId);
    const template = this.templates[type];
    
    // In-app notification
    await this.createInAppNotification({
      userId,
      ...this.populateTemplate(template, data)
    });
    
    // Push notification (if enabled)
    if (user.pushEnabled) {
      await this.sendPushNotification({
        token: user.pushToken,
        ...this.populateTemplate(template, data)
      });
    }
    
    // Email notification (if enabled)
    if (user.emailNotifications) {
      await this.sendEmailNotification({
        email: user.email,
        ...this.populateTemplate(template, data)
      });
    }
  }
}
```

### 5. Mobile Experience

#### Mobile-First Design
```javascript
const mobileComponents = {
  shareSheet: {
    type: 'native-share',
    fallback: 'custom-modal',
    features: [
      'one-tap-share',
      'platform-detection',
      'deep-linking',
      'app-clips'
    ]
  },
  
  referralWidget: {
    type: 'floating-action-button',
    position: 'bottom-right',
    actions: [
      'quick-share',
      'view-stats',
      'scan-qr'
    ]
  },
  
  onboarding: {
    type: 'progressive',
    steps: [
      'welcome',
      'how-it-works',
      'first-share',
      'track-impact'
    ]
  }
};

// Mobile sharing handler
class MobileShareHandler {
  async share(referralData) {
    // Check for native share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join the Movement',
          text: referralData.message,
          url: referralData.url
        });
        
        this.trackShare('native', true);
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.fallbackShare(referralData);
        }
      }
    } else {
      this.fallbackShare(referralData);
    }
  }

  fallbackShare(referralData) {
    // Custom share modal
    this.showShareModal({
      platforms: this.getAvailablePlatforms(),
      referralData,
      quickActions: ['copy-link', 'qr-code', 'save-image']
    });
  }
}
```

## Technical Requirements

### 1. Frontend Architecture

#### Component Library
```javascript
// Referral Dashboard Components
export const ReferralComponents = {
  // Dashboard
  Dashboard: () => import('./Dashboard/Dashboard.vue'),
  StatsCard: () => import('./Dashboard/StatsCard.vue'),
  NetworkGraph: () => import('./Dashboard/NetworkGraph.vue'),
  ActivityFeed: () => import('./Dashboard/ActivityFeed.vue'),
  
  // Sharing
  ShareButton: () => import('./Sharing/ShareButton.vue'),
  ShareModal: () => import('./Sharing/ShareModal.vue'),
  ReferralCard: () => import('./Sharing/ReferralCard.vue'),
  QRCode: () => import('./Sharing/QRCode.vue'),
  
  // Achievements
  AchievementList: () => import('./Achievements/AchievementList.vue'),
  AchievementModal: () => import('./Achievements/AchievementModal.vue'),
  ProgressBar: () => import('./Achievements/ProgressBar.vue'),
  
  // Mobile
  MobileShareSheet: () => import('./Mobile/ShareSheet.vue'),
  FloatingAction: () => import('./Mobile/FloatingAction.vue'),
  MobileNav: () => import('./Mobile/MobileNav.vue')
};
```

#### State Management
```javascript
// Vuex/Pinia Store for Referral System
const referralStore = {
  state: {
    userStats: {
      referralCount: 0,
      conversionRate: 0,
      networkSize: 0,
      rank: null
    },
    referralHistory: [],
    achievements: [],
    shareHistory: [],
    preferences: {
      cardTemplate: 'minimal',
      notifications: true,
      publicProfile: true
    }
  },

  actions: {
    async loadDashboard() {
      const [stats, history, achievements] = await Promise.all([
        api.getReferralStats(),
        api.getReferralHistory(),
        api.getAchievements()
      ]);
      
      this.updateStats(stats);
      this.updateHistory(history);
      this.updateAchievements(achievements);
    },

    async generateShareContent(platform) {
      const content = await api.generateShareContent({
        platform,
        template: this.state.preferences.cardTemplate,
        includeStats: true
      });
      
      return content;
    }
  }
};
```

### 2. API Endpoints

#### Dashboard APIs
```javascript
// Get user's referral dashboard data
GET /api/referral/dashboard
Response: {
  stats: {
    totalReferrals: 23,
    weeklyReferrals: 5,
    conversionRate: 0.65,
    networkSize: 89,
    rank: 12,
    percentile: 95
  },
  recentActivity: [...],
  networkGraph: {...},
  achievements: [...]
}

// Get referral history with pagination
GET /api/referral/history?page=1&limit=20
Response: {
  referrals: [
    {
      id: "ref123",
      name: "John S.",
      date: "2025-01-27",
      status: "converted",
      source: "facebook",
      impactScore: 85
    }
  ],
  pagination: {...}
}
```

#### Content Generation APIs
```javascript
// Generate referral card
POST /api/referral/generate-card
Body: {
  template: "personal",
  includeQR: true,
  message: "custom message"
}
Response: {
  imageUrl: "https://cdn.nstcg.org/cards/abc123.png",
  shareUrls: {...}
}

// Generate QR code
POST /api/referral/generate-qr
Body: {
  size: 300,
  format: "png",
  style: "dots"
}
Response: {
  qrCodeUrl: "https://cdn.nstcg.org/qr/xyz789.png",
  printableUrl: "https://cdn.nstcg.org/qr/xyz789-print.pdf"
}
```

### 3. Performance Optimization

#### Image Optimization
```javascript
class ImageOptimizer {
  async optimizeReferralCard(originalImage) {
    // Generate multiple formats
    const formats = await Promise.all([
      this.generateWebP(originalImage),
      this.generateAVIF(originalImage),
      this.generateJPEG(originalImage, 85)
    ]);
    
    // Generate responsive sizes
    const sizes = await Promise.all([
      this.resize(originalImage, 1200, 630),  // OG image
      this.resize(originalImage, 600, 315),   // Half size
      this.resize(originalImage, 300, 157)    // Thumbnail
    ]);
    
    // Upload to CDN
    const urls = await this.uploadToCDN(formats, sizes);
    
    return {
      srcset: this.generateSrcSet(urls),
      fallback: urls.jpeg.full
    };
  }
}
```

## Success Metrics

### Engagement Metrics
- Share button click rate: >30%
- Card generation rate: >50%
- Achievement unlock rate: >70%
- Dashboard return rate: >40%

### Experience Metrics
- Dashboard load time: <1s
- Card generation time: <2s
- Mobile share success: >90%
- User satisfaction: >4.5/5

### Business Metrics
- Referral conversion improvement: +30%
- Viral coefficient increase: +0.5
- User retention improvement: +25%
- Network growth rate: +40%

## Timeline & Milestones

### Phase 1: Dashboard MVP (Week 1-2)
- Basic stats display
- Simple activity feed
- Mobile responsive design
- Initial API integration

### Phase 2: Sharing Tools (Week 3-4)
- Card template system
- QR code generation
- Share tracking
- Platform optimization

### Phase 3: Gamification (Week 5-6)
- Achievement system
- Progress tracking
- Notifications
- Leaderboard integration

### Phase 4: Polish & Launch (Week 7-8)
- Performance optimization
- A/B testing
- User feedback integration
- Full deployment

## Risks & Mitigations

### Risk: Complex User Interface
**Mitigation**:
- Progressive disclosure design
- Guided onboarding flow
- Contextual help system
- User testing iterations

### Risk: Performance Issues
**Mitigation**:
- Lazy loading components
- Image optimization pipeline
- CDN distribution
- Caching strategy

### Risk: Low Adoption
**Mitigation**:
- Incentive program
- Social proof elements
- Easy sharing tools
- Success stories

## Dependencies

### Design Assets
- Brand guidelines
- Icon library
- Color system
- Typography

### Technical Stack
- Frontend framework (Vue/React)
- Image processing (Sharp/Canvas)
- QR code library
- Analytics platform

### Third-Party Services
- CDN for asset delivery
- Push notification service
- Email service
- Social media APIs

## Appendix

### A. Design Patterns
```css
/* Card Design System */
.referral-card {
  --card-width: 1200px;
  --card-height: 630px;
  --border-radius: 16px;
  --shadow: 0 10px 30px rgba(0,0,0,0.1);
}

/* Mobile Patterns */
@media (max-width: 768px) {
  .share-sheet {
    position: fixed;
    bottom: 0;
    border-radius: 16px 16px 0 0;
    max-height: 70vh;
  }
}
```

### B. Accessibility Guidelines
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader optimization
- High contrast mode

### C. Localization
- Support for multiple languages
- RTL layout support
- Cultural customization
- Regional share platforms