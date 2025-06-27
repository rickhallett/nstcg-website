# Configuration Management - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: Medium

## Issue Assessment
- **Priority**: MEDIUM
- **Complexity**: 8 (Fibonacci)
- **Risk Level**: Low
- **Time Estimate**: 2-3 weeks

### Priority Justification
- Hardcoded values prevent flexible deployment
- Missing validation causes startup failures
- No feature flags block gradual rollouts
- Poor documentation delays onboarding

### Complexity Breakdown
- Configuration system architecture (3)
- Feature flag implementation (3)
- Environment validation framework (2)

## Executive Summary
This PRD addresses the lack of proper configuration management in the NSTCG platform. Current issues include hardcoded values throughout the codebase, missing environment validation, no feature toggle system, and poor documentation of configuration options. Implementing proper configuration management will improve deployment flexibility, security, and development efficiency.

## Problem Statement

### Current Configuration Issues

1. **Hardcoded Values**
   - API URLs embedded in code
   - Magic numbers without explanation
   - Environment-specific values in source
   - No centralized configuration

2. **Environment Management**
   - No validation of required env vars
   - Missing env vars fail silently
   - No type checking for env values
   - Different configs across environments

3. **Feature Management**
   - No proper feature flag system
   - Features enabled/disabled by commenting code
   - No gradual rollout capability
   - No A/B testing infrastructure

4. **Documentation Issues**
   - No comprehensive config documentation
   - Missing example configurations
   - No validation schemas
   - Unclear configuration hierarchy

## Goals & Objectives

### Primary Goals
1. Centralize all configuration in a type-safe system
2. Implement robust environment validation
3. Create flexible feature flag management
4. Document all configuration options

### Success Metrics
- Zero hardcoded values in codebase
- 100% environment validation coverage
- < 5 minute configuration changes
- Zero configuration-related incidents

## User Stories

### As a Developer
- I want type-safe configuration access
- I want clear validation errors
- I want easy local development setup
- I want documented configuration options

### As a DevOps Engineer
- I want environment-specific configs
- I want secure secret management
- I want configuration validation
- I want deployment flexibility

### As a Product Manager
- I want to toggle features easily
- I want gradual feature rollouts
- I want A/B testing capabilities
- I want usage analytics

## Technical Requirements

### 1. Configuration Architecture

#### Type-Safe Configuration System
```typescript
// Configuration schema
interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    port: number;
    host: string;
  };
  
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimits: {
      anonymous: number;
      authenticated: number;
    };
  };
  
  database: {
    notion: {
      apiKey: string;
      databaseId: string;
      gamificationDbId?: string;
      version: string;
    };
  };
  
  features: {
    donations: boolean;
    gamification: boolean;
    leaderboard: boolean;
    referralTracking: boolean;
    recaptcha: boolean;
  };
  
  security: {
    cors: {
      origins: string[];
      credentials: boolean;
    };
    csp: {
      directives: Record<string, string[]>;
    };
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  monitoring: {
    sentry?: {
      dsn: string;
      environment: string;
      tracesSampleRate: number;
    };
    analytics?: {
      trackingId: string;
      enabled: boolean;
    };
  };
}

// Configuration loader
class ConfigurationManager {
  private config: AppConfig;
  private validators: Map<string, Validator> = new Map();
  
  constructor() {
    this.loadConfiguration();
    this.validateConfiguration();
  }
  
  private loadConfiguration(): void {
    // Load from multiple sources in priority order
    const sources = [
      this.loadDefaults(),
      this.loadEnvironmentFile(),
      this.loadEnvironmentVariables(),
      this.loadCommandLineArgs(),
      this.loadRemoteConfig()
    ];
    
    // Merge configurations
    this.config = this.mergeConfigs(sources);
  }
  
  private loadDefaults(): Partial<AppConfig> {
    return {
      app: {
        name: 'NSTCG',
        version: process.env.npm_package_version || '1.0.0',
        environment: 'development',
        port: 3000,
        host: 'localhost'
      },
      api: {
        baseUrl: 'http://localhost:3000',
        timeout: 30000,
        retryAttempts: 3,
        rateLimits: {
          anonymous: 60,
          authenticated: 300
        }
      },
      features: {
        donations: false,
        gamification: false,
        leaderboard: false,
        referralTracking: true,
        recaptcha: false
      },
      security: {
        cors: {
          origins: ['http://localhost:3000'],
          credentials: true
        },
        rateLimit: {
          windowMs: 60000,
          maxRequests: 100
        }
      }
    };
  }
  
  private loadEnvironmentVariables(): Partial<AppConfig> {
    return {
      app: {
        environment: process.env.NODE_ENV as any,
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST
      },
      database: {
        notion: {
          apiKey: process.env.NOTION_TOKEN!,
          databaseId: process.env.NOTION_DATABASE_ID!,
          gamificationDbId: process.env.NOTION_GAMIFICATION_DB_ID,
          version: process.env.NOTION_VERSION || '2022-06-28'
        }
      }
    };
  }
  
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  getPath<T = any>(path: string): T {
    const keys = path.split('.');
    let value: any = this.config;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        throw new Error(`Configuration key not found: ${path}`);
      }
    }
    
    return value;
  }
  
  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Required fields
    const required = [
      'app.environment',
      'database.notion.apiKey',
      'database.notion.databaseId'
    ];
    
    for (const path of required) {
      try {
        const value = this.getPath(path);
        if (!value) {
          errors.push({
            path,
            message: 'Required configuration value is missing'
          });
        }
      } catch (error) {
        errors.push({
          path,
          message: 'Required configuration value is missing'
        });
      }
    }
    
    // Custom validators
    this.validators.forEach((validator, path) => {
      try {
        const value = this.getPath(path);
        if (!validator(value)) {
          errors.push({
            path,
            message: `Validation failed for ${path}`
          });
        }
      } catch (error) {
        // Path doesn't exist, skip validation
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 2. Environment Management

#### Environment Validator
```typescript
class EnvironmentValidator {
  private schema: EnvironmentSchema;
  
  constructor(schema: EnvironmentSchema) {
    this.schema = schema;
  }
  
  validate(): void {
    const errors: string[] = [];
    
    for (const [key, config] of Object.entries(this.schema)) {
      const value = process.env[key];
      
      // Check required
      if (config.required && !value) {
        errors.push(`Missing required environment variable: ${key}`);
        continue;
      }
      
      // Skip optional undefined
      if (!value) continue;
      
      // Type validation
      if (!this.validateType(value, config.type)) {
        errors.push(`Invalid type for ${key}: expected ${config.type}`);
      }
      
      // Custom validation
      if (config.validator && !config.validator(value)) {
        errors.push(`Validation failed for ${key}`);
      }
      
      // Enum validation
      if (config.enum && !config.enum.includes(value)) {
        errors.push(`Invalid value for ${key}: must be one of ${config.enum.join(', ')}`);
      }
    }
    
    if (errors.length > 0) {
      console.error('Environment validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
  
  private validateType(value: string, type: string): boolean {
    switch (type) {
      case 'string':
        return true;
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }
}

// Environment schema
const environmentSchema: EnvironmentSchema = {
  NODE_ENV: {
    type: 'string',
    required: true,
    enum: ['development', 'staging', 'production']
  },
  PORT: {
    type: 'number',
    required: false,
    default: '3000'
  },
  NOTION_TOKEN: {
    type: 'string',
    required: true,
    validator: (value) => value.startsWith('secret_')
  },
  NOTION_DATABASE_ID: {
    type: 'string',
    required: true,
    validator: (value) => /^[a-f0-9]{32}$/.test(value.replace(/-/g, ''))
  },
  SENTRY_DSN: {
    type: 'url',
    required: false
  },
  RECAPTCHA_SITE_KEY: {
    type: 'string',
    required: false
  },
  STRIPE_PUBLIC_KEY: {
    type: 'string',
    required: false,
    validator: (value) => value.startsWith('pk_')
  }
};
```

### 3. Feature Flag System

#### Feature Flag Manager
```typescript
interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  targetUsers?: string[];
  targetGroups?: string[];
  startDate?: Date;
  endDate?: Date;
  dependencies?: string[];
}

class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private remoteConfig?: RemoteConfigProvider;
  
  constructor(config?: FeatureFlagConfig) {
    this.loadLocalFlags();
    
    if (config?.remoteProvider) {
      this.remoteConfig = config.remoteProvider;
      this.syncRemoteFlags();
    }
  }
  
  isEnabled(key: string, context?: FeatureContext): boolean {
    const flag = this.flags.get(key);
    
    if (!flag) {
      console.warn(`Unknown feature flag: ${key}`);
      return false;
    }
    
    // Check basic enabled state
    if (!flag.enabled) return false;
    
    // Check date range
    const now = new Date();
    if (flag.startDate && now < flag.startDate) return false;
    if (flag.endDate && now > flag.endDate) return false;
    
    // Check dependencies
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep, context)) return false;
      }
    }
    
    // Check user targeting
    if (context?.userId && flag.targetUsers) {
      return flag.targetUsers.includes(context.userId);
    }
    
    // Check group targeting
    if (context?.groups && flag.targetGroups) {
      const hasTargetGroup = flag.targetGroups.some(group => 
        context.groups!.includes(group)
      );
      if (hasTargetGroup) return true;
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const hash = this.hashUserId(context?.userId || 'anonymous');
      const bucket = hash % 100;
      return bucket < flag.rolloutPercentage;
    }
    
    return true;
  }
  
  async syncRemoteFlags(): Promise<void> {
    if (!this.remoteConfig) return;
    
    try {
      const remoteFlags = await this.remoteConfig.fetchFlags();
      
      // Merge with local flags
      remoteFlags.forEach(flag => {
        this.flags.set(flag.key, flag);
      });
      
      // Set up polling
      setInterval(() => {
        this.syncRemoteFlags();
      }, 60000); // Sync every minute
      
    } catch (error) {
      console.error('Failed to sync remote flags:', error);
    }
  }
  
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  // React hook for feature flags
  useFeatureFlag(key: string): boolean {
    const [enabled, setEnabled] = useState(false);
    const [context] = useContext(FeatureContext);
    
    useEffect(() => {
      const checkFlag = () => {
        setEnabled(this.isEnabled(key, context));
      };
      
      checkFlag();
      
      // Re-check on context change
      const interval = setInterval(checkFlag, 5000);
      
      return () => clearInterval(interval);
    }, [key, context]);
    
    return enabled;
  }
}

// Usage in React
function Component() {
  const showNewFeature = featureFlags.useFeatureFlag('new-feature');
  
  return (
    <div>
      {showNewFeature && <NewFeature />}
    </div>
  );
}
```

### 4. Secret Management

#### Secure Configuration
```typescript
class SecretManager {
  private secrets: Map<string, string> = new Map();
  private providers: SecretProvider[] = [];
  
  constructor(config: SecretManagerConfig) {
    // Add providers in priority order
    if (config.useEnv) {
      this.providers.push(new EnvironmentSecretProvider());
    }
    
    if (config.useVault) {
      this.providers.push(new VaultSecretProvider(config.vaultConfig));
    }
    
    if (config.useAws) {
      this.providers.push(new AwsSecretsManagerProvider(config.awsConfig));
    }
  }
  
  async get(key: string): Promise<string> {
    // Check cache first
    if (this.secrets.has(key)) {
      return this.secrets.get(key)!;
    }
    
    // Try each provider
    for (const provider of this.providers) {
      try {
        const value = await provider.getSecret(key);
        if (value) {
          this.secrets.set(key, value);
          return value;
        }
      } catch (error) {
        console.error(`Failed to get secret from ${provider.name}:`, error);
      }
    }
    
    throw new Error(`Secret not found: ${key}`);
  }
  
  async rotate(key: string): Promise<void> {
    // Find provider that owns this secret
    for (const provider of this.providers) {
      if (await provider.hasSecret(key)) {
        await provider.rotateSecret(key);
        this.secrets.delete(key); // Clear cache
        return;
      }
    }
    
    throw new Error(`Cannot rotate secret: ${key}`);
  }
}

// Environment variables provider
class EnvironmentSecretProvider implements SecretProvider {
  name = 'environment';
  
  async getSecret(key: string): Promise<string | null> {
    return process.env[key] || null;
  }
  
  async hasSecret(key: string): Promise<boolean> {
    return key in process.env;
  }
  
  async rotateSecret(key: string): Promise<void> {
    throw new Error('Cannot rotate environment variables');
  }
}
```

### 5. Configuration Documentation

#### Auto-Generated Documentation
```typescript
class ConfigDocumentationGenerator {
  private schema: ConfigSchema;
  
  constructor(schema: ConfigSchema) {
    this.schema = schema;
  }
  
  generateMarkdown(): string {
    const sections = [
      this.generateHeader(),
      this.generateTableOfContents(),
      this.generateEnvironmentVariables(),
      this.generateFeatureFlags(),
      this.generateExamples()
    ];
    
    return sections.join('\n\n');
  }
  
  private generateEnvironmentVariables(): string {
    const lines = ['## Environment Variables', ''];
    
    for (const [key, config] of Object.entries(this.schema.env)) {
      lines.push(`### ${key}`);
      lines.push('');
      lines.push(`- **Type**: ${config.type}`);
      lines.push(`- **Required**: ${config.required ? 'Yes' : 'No'}`);
      if (config.default) {
        lines.push(`- **Default**: \`${config.default}\``);
      }
      if (config.description) {
        lines.push(`- **Description**: ${config.description}`);
      }
      if (config.example) {
        lines.push(`- **Example**: \`${config.example}\``);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  private generateExamples(): string {
    return `
## Example Configurations

### Development (.env.development)
\`\`\`bash
NODE_ENV=development
PORT=3000
NOTION_TOKEN=secret_dev_token
NOTION_DATABASE_ID=dev_database_id
ENABLE_DEBUG=true
\`\`\`

### Production (.env.production)
\`\`\`bash
NODE_ENV=production
PORT=8080
NOTION_TOKEN=secret_prod_token
NOTION_DATABASE_ID=prod_database_id
SENTRY_DSN=https://sentry.io/...
ENABLE_MONITORING=true
\`\`\`

### Docker Compose
\`\`\`yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - NOTION_TOKEN=\${NOTION_TOKEN}
      - NOTION_DATABASE_ID=\${NOTION_DATABASE_ID}
\`\`\`
`;
  }
}
```

## Implementation Plan

### Phase 1: Configuration System (Week 1)
1. Create configuration manager
2. Implement type-safe access
3. Add validation system
4. Migrate hardcoded values

### Phase 2: Environment Management (Week 2)
1. Create environment validator
2. Add startup validation
3. Implement defaults system
4. Document all variables

### Phase 3: Feature Flags (Week 3)
1. Build feature flag manager
2. Add targeting capabilities
3. Implement gradual rollout
4. Create management UI

### Phase 4: Secret Management (Week 4)
1. Implement secret providers
2. Add rotation support
3. Set up secure storage
4. Create audit logging

## Migration Strategy

### Step 1: Identify All Configuration
```bash
# Find hardcoded values
grep -r "http://\|https://\|localhost\|3000\|8080" --include="*.js" --include="*.ts"

# Find environment variable usage
grep -r "process.env\." --include="*.js" --include="*.ts"

# Find feature toggles
grep -r "if.*enabled\|feature\|flag" --include="*.js" --include="*.ts"
```

### Step 2: Create Migration Script
```typescript
// Migrate hardcoded values to config
const migrations = [
  {
    pattern: /http:\/\/localhost:3000/g,
    replacement: 'config.api.baseUrl'
  },
  {
    pattern: /60000/g, // 1 minute
    replacement: 'config.cache.ttl'
  }
];
```

## Monitoring & Compliance

### Configuration Metrics
- Configuration load time
- Validation failures
- Feature flag evaluations
- Secret access patterns

### Compliance Checks
- No hardcoded secrets
- All env vars documented
- Validation in place
- Secure secret storage

## Success Criteria

### Technical Metrics
- 100% configuration centralized
- Zero hardcoded values
- All environments validated
- < 100ms config load time

### Developer Experience
- Clear error messages
- Comprehensive documentation
- Easy local setup
- Type-safe access

## Appendix

### Configuration Best Practices
1. Never commit secrets
2. Use meaningful names
3. Document all options
4. Validate on startup
5. Provide sensible defaults

### Tools & References
- dotenv for local development
- Vault for secret management
- LaunchDarkly for feature flags
- 12-Factor App principles