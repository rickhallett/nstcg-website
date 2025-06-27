# API Layer Improvements - Product Requirements Document

## Document Information
- **Author**: Development Team
- **Date**: January 2025
- **Version**: 1.0
- **Status**: Draft
- **Priority**: High

## Issue Assessment
- **Priority**: HIGH
- **Complexity**: 13 (Fibonacci)
- **Risk Level**: Medium
- **Time Estimate**: 3-4 weeks

### Priority Justification
- Broken pagination affects all list endpoints
- Inconsistent responses complicate frontend development
- Missing versioning prevents safe evolution
- Poor documentation blocks third-party integration

### Complexity Breakdown
- Cursor-based pagination implementation (5)
- Response standardization across all endpoints (3)
- API versioning framework (3)
- OpenAPI documentation generation (2)

## Executive Summary
This PRD addresses critical issues in the API layer of the NSTCG platform, including broken pagination, inconsistent response formats, lack of API versioning, and poor documentation. These improvements will enhance developer experience, system reliability, and enable future scalability.

## Problem Statement

### Current API Issues

1. **Broken Pagination**
   - `getStartCursor` always returns undefined
   - No proper cursor management
   - Arbitrary count estimates instead of real totals
   - Inconsistent pagination patterns across endpoints

2. **Response Inconsistency**
   - Different error formats across endpoints
   - Mixed status code usage
   - Inconsistent field naming conventions
   - No standard envelope format

3. **Missing API Features**
   - No API versioning strategy
   - No request ID tracking
   - No rate limit headers
   - No compression support

4. **Poor Documentation**
   - No OpenAPI/Swagger spec
   - Missing endpoint documentation
   - No example requests/responses
   - No error code catalog

## Goals & Objectives

### Primary Goals
1. Implement proper cursor-based pagination
2. Standardize all API responses
3. Add comprehensive API versioning
4. Create complete API documentation

### Success Metrics
- 100% endpoints with consistent responses
- < 100ms pagination query time
- 100% API documentation coverage
- Zero breaking changes after v1.0

## User Stories

### As an API Consumer
- I want consistent response formats across all endpoints
- I want clear pagination that works reliably
- I want comprehensive documentation with examples
- I want versioning to protect against breaking changes

### As a Frontend Developer
- I want predictable error handling
- I want TypeScript types for all API responses
- I want request tracking for debugging
- I want clear rate limit information

### As a Third-Party Developer
- I want OpenAPI specification
- I want API client libraries
- I want webhook support
- I want comprehensive error codes

## Technical Requirements

### 1. Standardized Response Format

#### Success Response Envelope
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
  };
  pagination?: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}
```

#### Error Response Envelope
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    fields?: FieldError[];
  };
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

interface FieldError {
  field: string;
  code: string;
  message: string;
}
```

#### Response Middleware
```javascript
class ResponseFormatter {
  constructor(version = 'v1') {
    this.version = version;
  }
  
  success(data, options = {}) {
    const response = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: options.requestId || generateRequestId(),
        version: this.version
      }
    };
    
    if (options.pagination) {
      response.pagination = this.formatPagination(options.pagination);
    }
    
    return response;
  }
  
  error(error, options = {}) {
    const response = {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.details || undefined,
        fields: error.fields || undefined
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: options.requestId || generateRequestId(),
        version: this.version
      }
    };
    
    return response;
  }
  
  formatPagination(pagination) {
    const { page, perPage, total } = pagination;
    const totalPages = Math.ceil(total / perPage);
    
    return {
      page,
      perPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextCursor: pagination.nextCursor || undefined,
      prevCursor: pagination.prevCursor || undefined
    };
  }
}
```

### 2. Cursor-Based Pagination

#### Cursor Implementation
```javascript
class CursorPagination {
  constructor(model) {
    this.model = model;
  }
  
  encodeCursor(record) {
    const cursor = {
      id: record.id,
      timestamp: record.created_at || record.timestamp,
      sortValue: record.sortValue
    };
    
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }
  
  decodeCursor(cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString();
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid cursor');
    }
  }
  
  async paginate(options = {}) {
    const {
      cursor,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      filter = {}
    } = options;
    
    let query = this.model.where(filter);
    
    // Apply cursor
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      const operator = sortOrder === 'DESC' ? '<' : '>';
      
      query = query.where(function() {
        this.where(sortBy, operator, decoded.sortValue)
          .orWhere(function() {
            this.where(sortBy, '=', decoded.sortValue)
              .andWhere('id', operator, decoded.id);
          });
      });
    }
    
    // Apply sorting
    query = query.orderBy(sortBy, sortOrder).orderBy('id', sortOrder);
    
    // Fetch one extra to determine if there's a next page
    const results = await query.limit(limit + 1);
    
    // Check if there's a next page
    const hasMore = results.length > limit;
    if (hasMore) {
      results.pop(); // Remove the extra item
    }
    
    // Generate cursors
    const cursors = {
      next: hasMore ? this.encodeCursor(results[results.length - 1]) : null,
      prev: cursor ? await this.getPrevCursor(options) : null
    };
    
    // Get total count (cached)
    const total = await this.getTotalCount(filter);
    
    return {
      data: results,
      cursors,
      hasMore,
      total
    };
  }
  
  async getPrevCursor(options) {
    // Reverse the sort order to get previous page
    const reverseOrder = options.sortOrder === 'DESC' ? 'ASC' : 'DESC';
    const result = await this.paginate({
      ...options,
      sortOrder: reverseOrder,
      limit: 1
    });
    
    return result.data.length > 0 ? 
      this.encodeCursor(result.data[0]) : null;
  }
  
  async getTotalCount(filter) {
    // Cache counts for performance
    const cacheKey = `count:${JSON.stringify(filter)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) return cached;
    
    const count = await this.model.where(filter).count();
    await cache.set(cacheKey, count, { ttl: 60 });
    
    return count;
  }
}
```

### 3. API Versioning

#### Version Management
```javascript
class ApiVersionManager {
  constructor() {
    this.versions = new Map();
    this.defaultVersion = 'v1';
    this.deprecationSchedule = new Map();
  }
  
  register(version, routes) {
    this.versions.set(version, routes);
  }
  
  deprecate(version, sunsetDate) {
    this.deprecationSchedule.set(version, {
      deprecated: true,
      sunsetDate,
      alternativeVersion: this.getLatestVersion()
    });
  }
  
  middleware() {
    return (req, res, next) => {
      // Extract version from header or URL
      const version = this.extractVersion(req);
      
      // Check if version exists
      if (!this.versions.has(version)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VERSION',
            message: `API version ${version} not found`,
            supportedVersions: Array.from(this.versions.keys())
          }
        });
      }
      
      // Check deprecation
      const deprecation = this.deprecationSchedule.get(version);
      if (deprecation) {
        res.set({
          'Sunset': deprecation.sunsetDate.toISOString(),
          'Deprecation': 'true',
          'Link': `<${req.baseUrl}/${deprecation.alternativeVersion}>; rel="successor-version"`
        });
      }
      
      // Set version in request
      req.apiVersion = version;
      next();
    };
  }
  
  extractVersion(req) {
    // 1. Check Accept header
    const acceptHeader = req.get('Accept');
    if (acceptHeader) {
      const match = acceptHeader.match(/application\/vnd\.nstcg\.([^+]+)\+json/);
      if (match) return match[1];
    }
    
    // 2. Check URL path
    const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
    if (pathMatch) return pathMatch[1];
    
    // 3. Check query parameter
    if (req.query.version) return req.query.version;
    
    // 4. Default version
    return this.defaultVersion;
  }
  
  getLatestVersion() {
    const versions = Array.from(this.versions.keys());
    return versions.sort().pop();
  }
}
```

#### Version-Specific Handlers
```javascript
// v1 handlers
const v1Handlers = {
  getUsers: async (req, res) => {
    const users = await db.users.findAll();
    res.json(formatter.success(users));
  },
  
  getUser: async (req, res) => {
    const user = await db.users.findById(req.params.id);
    if (!user) {
      return res.status(404).json(
        formatter.error({ code: 'USER_NOT_FOUND' })
      );
    }
    res.json(formatter.success(user));
  }
};

// v2 handlers with breaking changes
const v2Handlers = {
  getUsers: async (req, res) => {
    const pagination = new CursorPagination(db.users);
    const result = await pagination.paginate({
      cursor: req.query.cursor,
      limit: req.query.limit
    });
    
    res.json(formatter.success(result.data, {
      pagination: result
    }));
  },
  
  getUser: async (req, res) => {
    const user = await db.users.findById(req.params.id);
    if (!user) {
      return res.status(404).json(
        formatter.error({ 
          code: 'RESOURCE_NOT_FOUND',
          details: { resource: 'user', id: req.params.id }
        })
      );
    }
    
    // v2 includes additional fields
    const enrichedUser = await enrichUser(user);
    res.json(formatter.success(enrichedUser));
  }
};
```

### 4. Comprehensive Documentation

#### OpenAPI Specification
```yaml
openapi: 3.0.0
info:
  title: NSTCG API
  version: 1.0.0
  description: |
    North Swanage Traffic Consultation Group API
    
    ## Authentication
    Currently, the API is public. Authentication will be added in v2.
    
    ## Rate Limiting
    - Anonymous: 60 requests per minute
    - Authenticated: 300 requests per minute (coming in v2)
    
    ## Versioning
    Specify version via Accept header: `Accept: application/vnd.nstcg.v1+json`
    
servers:
  - url: https://api.nstcg.org/v1
    description: Production
  - url: https://staging-api.nstcg.org/v1
    description: Staging

paths:
  /participants:
    get:
      summary: List participants
      operationId: listParticipants
      tags:
        - Participants
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/PerPageParam'
        - $ref: '#/components/parameters/CursorParam'
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/SuccessResponse'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Participant'
                      pagination:
                        $ref: '#/components/schemas/PaginationMeta'
              examples:
                success:
                  $ref: '#/components/examples/ParticipantListExample'
        429:
          $ref: '#/components/responses/RateLimitError'
        500:
          $ref: '#/components/responses/InternalServerError'

components:
  schemas:
    Participant:
      type: object
      required:
        - id
        - email
        - name
        - createdAt
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        referralCode:
          type: string
          pattern: '^[A-Z0-9]{10}$'
        points:
          type: integer
          minimum: 0
        createdAt:
          type: string
          format: date-time
          
    SuccessResponse:
      type: object
      required:
        - success
        - data
        - meta
      properties:
        success:
          type: boolean
          enum: [true]
        data:
          type: object
        meta:
          $ref: '#/components/schemas/ResponseMeta'
```

#### SDK Generation
```javascript
// TypeScript SDK types
export interface NSTCGClient {
  participants: {
    list(options?: ListOptions): Promise<PaginatedResponse<Participant>>;
    get(id: string): Promise<Response<Participant>>;
    create(data: CreateParticipantDto): Promise<Response<Participant>>;
  };
  
  leaderboard: {
    get(options?: LeaderboardOptions): Promise<Response<LeaderboardEntry[]>>;
  };
  
  stats: {
    getCount(): Promise<Response<{ count: number }>>;
    getDonations(): Promise<Response<DonationStats>>;
  };
}

// Auto-generated from OpenAPI spec
```

## Implementation Plan

### Phase 1: Response Standardization (Week 1)
1. Implement response formatter
2. Update all endpoints
3. Add request ID tracking
4. Test response consistency

### Phase 2: Pagination Fix (Week 2)
1. Implement cursor pagination
2. Update all list endpoints
3. Add pagination metadata
4. Performance test queries

### Phase 3: API Versioning (Week 3)
1. Implement version manager
2. Create v1 namespace
3. Plan v2 improvements
4. Add deprecation headers

### Phase 4: Documentation (Week 4)
1. Write OpenAPI spec
2. Generate SDK types
3. Create example collection
4. Deploy documentation site

## Migration Strategy

### Backward Compatibility
```javascript
// Compatibility layer for old clients
app.use('/api/*', (req, res, next) => {
  // Old format detection
  if (req.get('X-Legacy-Client')) {
    res.locals.useLegacyFormat = true;
  }
  next();
});

// Response transformer
app.use((req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (res.locals.useLegacyFormat) {
      // Transform to legacy format
      data = transformToLegacy(data);
    }
    
    originalJson.call(this, data);
  };
  
  next();
});
```

## Monitoring & Analytics

### API Metrics
```javascript
const metrics = {
  // Request metrics
  requestCount: new Counter('api_requests_total'),
  requestDuration: new Histogram('api_request_duration_seconds'),
  
  // Error metrics
  errorCount: new Counter('api_errors_total'),
  
  // Business metrics
  endpointUsage: new Counter('api_endpoint_usage'),
  versionUsage: new Counter('api_version_usage')
};

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    metrics.requestCount.inc({
      method: req.method,
      endpoint: req.route?.path,
      status: res.statusCode
    });
    
    metrics.requestDuration.observe(duration / 1000);
    
    if (res.statusCode >= 400) {
      metrics.errorCount.inc({
        endpoint: req.route?.path,
        status: res.statusCode
      });
    }
  });
  
  next();
});
```

## Success Criteria

### Technical Metrics
- 100% endpoint standardization
- < 50ms pagination response time
- Zero breaking changes post-v1
- 100% OpenAPI coverage

### Developer Experience
- 90% satisfaction in developer survey
- < 30 minute integration time
- Zero support tickets for API usage
- 5+ community-contributed SDKs

## Appendix

### Error Code Catalog
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| INVALID_VERSION | 400 | API version not supported |
| AUTHENTICATION_REQUIRED | 401 | Authentication required |
| FORBIDDEN | 403 | Access denied |
| RESOURCE_NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Internal server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

### References
- RESTful API Design Guidelines
- JSON:API Specification
- OpenAPI 3.0 Specification
- API Versioning Best Practices