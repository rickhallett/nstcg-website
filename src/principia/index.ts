/**
 * Principia.js - A principled vanilla JavaScript framework
 * 
 * Main entry point that exports all modules
 */

// Core services
export { EventBus } from './EventBus';
export { StateManager } from './StateManager';
export { LoggerService } from './LoggerService';
export { ErrorHandlerService } from './ErrorHandlerService';

// Utilities
export { diff } from './dom-diff';

// Component framework
export { Component } from './Component';
export type { ComponentState, ComponentLifecycle } from './Component';

// Services
export { ApiService } from './ApiService';
export type { ApiServiceConfig, ApiResponse, RequestConfig } from './ApiService';

export { NotionService } from './NotionService';
export type { NotionServiceConfig, Participant } from './NotionService';

// Models
export { UserModel } from './UserModel';
export type { UserModelConfig, UserRegistrationData, UserOperationResult } from './UserModel';

export { ParticipantModel } from './ParticipantModel';
export type { ParticipantModelConfig } from './ParticipantModel';

// Router
export { Router } from './Router';
export type { RouterConfig, RouteHandler, RouteContext, NavigationGuard } from './Router';

// View Controllers
export { HomePage } from './HomePage';
export type { HomePageConfig } from './HomePage';

// Application
export { initializeApp } from './app';
export type { AppConfig, App } from './app';

// Interfaces
export type { IService } from './IService';