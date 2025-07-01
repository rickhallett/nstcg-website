# Phase 1 Agent Instructions Summary

## Overview
This document provides a quick reference for all Phase 1 Core Engine modules that need to be implemented to complete the Principia.js foundation.

## Completed Modules ✅
1. **Blueprint 001 - EventBus**: Singleton pub/sub messaging system (PR #8 - Merged)
2. **Blueprint 004 - LoggerService**: Configurable logging with levels (PR #9 - Merged)

## Modules Requiring Implementation 🚧

### 1. Blueprint 002 - StateManager
- **Agent Instructions**: `docs/agent-instructions/002_StateManager_Agent.md`
- **Key Features**: Singleton, immutable state, deep cloning, EventBus notifications
- **Branch**: `feature/blueprint-002`
- **Worktree**: `../principia-002`

### 2. Blueprint 003 - ErrorHandlerService  
- **Agent Instructions**: `docs/agent-instructions/003_ErrorHandlerService_Agent.md`
- **Key Features**: Global error handling, LoggerService integration, error recovery
- **Branch**: `feature/blueprint-003`
- **Worktree**: `../principia-003`

### 3. Blueprint 005 - dom-diff
- **Agent Instructions**: `docs/agent-instructions/005_dom-diff_Agent.md`
- **Key Features**: Pure function, minimal DOM updates, attribute diffing, child reconciliation
- **Branch**: `feature/blueprint-005`
- **Worktree**: `../principia-005`

### 4. Blueprint 006 - Component
- **Agent Instructions**: `docs/agent-instructions/006_Component_Agent.md`
- **Key Features**: Abstract base class, lifecycle methods, state subscriptions, dom-diff rendering
- **Branch**: `feature/blueprint-006`
- **Worktree**: `../principia-006`

## Agent Assignment Process

For each module, assign to an agent with these instructions:

```bash
# 1. Agent reads their specific instruction file
cat docs/agent-instructions/XXX_ModuleName_Agent.md

# 2. Agent creates worktree and implements module following TDD
git worktree add ../principia-XXX -b feature/blueprint-XXX
cd ../principia-XXX

# 3. Agent follows the test-by-test implementation process
# 4. Agent creates PR when complete
# 5. Agent notifies when PR is ready for review
```

## Integration Dependencies

The modules have these dependencies:
- **StateManager**: Depends on EventBus ✅
- **ErrorHandlerService**: Depends on EventBus ✅ and LoggerService ✅
- **dom-diff**: No dependencies (pure utility)
- **Component**: Depends on EventBus ✅, StateManager, and dom-diff

## Parallel Development Strategy

Agents can work in parallel with this grouping:
- **Group A**: StateManager and dom-diff (no blocking dependencies)
- **Group B**: ErrorHandlerService and Component (after Group A completes)

## Phase 1 Completion Criteria

✅ All 6 core modules implemented
✅ All tests passing (100% coverage)
✅ All PRs reviewed and merged
✅ Integration tests passing
✅ No circular dependencies
✅ Clean TypeScript with proper types

## Next Steps After Phase 1

Once all Phase 1 modules are complete:
1. Run full integration test suite
2. Merge all PRs to main
3. Tag release as `v0.1.0-alpha`
4. Begin Phase 2 (External World & Business Logic)