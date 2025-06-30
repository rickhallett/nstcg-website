# Principia.js: A Manifesto for Principled Software Development

This document is the philosophical and architectural foundation of the NSTCG website rewrite. It is not merely a set of instructions, but a manifesto for a specific way of building software. It codifies the "why" behind our technical decisions, capturing the wisdom gained from past experiences and laying out a clear, intentional path forward. Its purpose is to ensure that every line of code is written with purpose, clarity, and a long-term vision for maintainability and growth.

---
## Documentation Index

*   **Architectural Deep Dive**
    *   [**Principia.js Manifesto**](./docs/principia.js.md): The core philosophy, principles, and developer journey.
    *   [**Module Breakdown**](./docs/principia_modules.md): A detailed exploration of each module's role, responsibilities, and interactions, complete with diagrams.
*   **TDD Blueprints**
    *   [**Master Blueprint**](./docs/blueprints/000_master_blueprint.md): The main index and build order for all Test-Driven Development blueprints.

## Project Structure

```
.
├── .claude/                    # Claude Code configuration
│   ├── commands/              # Custom slash commands
│   └── mcp.json              # MCP server configuration
├── .cursor/                   # Cursor IDE configuration
│   └── rules/                # Cursor-specific rules
├── .taskmaster/              # Task management system
│   ├── docs/                 # Project documentation
│   ├── reports/              # Analysis reports
│   ├── tasks/                # Task files and database
│   └── config.json           # Taskmaster configuration
├── docs/                     # Core documentation
│   ├── blueprints/           # TDD blueprints for each module
│   └── workflow/             # Development workflow guides
├── src/                      # Main source code (TypeScript)
│   ├── ApplicationError.ts   # Custom error handling
│   ├── ErrorHandlerService.ts # Error service implementation
│   ├── EventBus.ts           # Event-driven communication
│   ├── LoggerService.ts      # Logging service
│   ├── StateManager.ts       # Centralized state management
│   └── index.ts              # Application entry point
├── StarLinkOptimiser/        # Network monitoring service
│   ├── observer/             # Web dashboard
│   ├── src/                  # Service source code
│   └── test/                 # Service tests
├── test/                     # Test files for core modules
├── CLAUDE.md                 # Claude Code context guide
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

---

## 1. The Ghost of V1: Lessons from the Past

A rewrite is a rare opportunity. It's a chance to correct past mistakes, pay down technical debt, and build something resilient. The architecture of Principia.js is a direct response to the inferred challenges of the previous system (v1). To understand why we are building this way, we must first understand the problems we are solving.

*   **The Problem of Unpredictable State:** In v1, state was likely scattered. Data could live anywhere: in global variables, in multiple component instances, directly in the DOM. This leads to chaos. When a bug occurs, you don't know where the incorrect data came from. Updating state in one place might have unforeseen consequences elsewhere. Debugging becomes a nightmare of chasing ghosts through the machine.
*   **The Problem of "Spaghetti" Communication:** V1 likely suffered from tightly coupled modules. Component A would have a direct reference to Component B, which in turn would call a function in Module C. This creates a brittle web of dependencies. You can't change one part of the system without breaking another. Reusing a component in a different context is impossible because it's tied to its specific neighbors.
*   **The Problem of Mixed Concerns:** In v1, logic was probably mixed indiscriminately. A single component file might contain UI rendering (HTML), styling (CSS), data fetching (`fetch`), business logic (calculations, validation), and state manipulation all in one place. These "god objects" are impossible to test, difficult to reason about, and a nightmare to refactor.
*   **The Problem of API Brittleness:** The v1 codebase likely had direct calls to the Notion API scattered throughout the application. When Notion changes its API, or if we decide to move to a different backend, we would have to hunt down every single `fetch` call and change it. The application's logic is corrupted by the specific details of the external service.
*   **The Problem of Fragility:** Without a rigorous testing culture, v1 was likely fragile. Every new feature or bug fix had the potential to silently break something else. There was no safety net. Development slows to a crawl as developers become afraid to touch the code for fear of unknown side effects.

Principia.js is the antidote to these problems. It is a deliberate, opinionated architecture designed to enforce discipline and create a system that is predictable, scalable, and a pleasure to work on.

---

## 2. The Architectural Canon: The Six Immutable Laws

These six principles are the heart of Principia.js. They are not suggestions; they are laws. They are enforced by the very structure of the folders and the flow of data. Violating them is not just bad practice; it's actively difficult to do within this framework.

### I. The State is Singular
*   **What it is:** All application state—every piece of data that can change—lives in a single, global `StateManager` object. No component, service, or model stores its own persistent state.
*   **Why it matters:** This creates a **single source of truth**. There is never any ambiguity about the state of the application. When you need to know the value of something, there is only one place to look. This radically simplifies debugging. State changes become predictable and traceable. It also opens the door for advanced features like state snapshots, undo/redo functionality, and even "time-travel debugging."

### II. Events are the Messengers
*   **What it is:** Modules do not call each other directly. Instead, they communicate through a central `EventBus`. A component doesn't tell a model to register a user; it emits a `form:submit` event. The model listens for that event and acts accordingly.
*   **Why it matters:** This enforces **decoupling**. The `FormComponent` knows nothing about the `UserModel`, and vice-versa. They only know about the `EventBus`. This means you can swap out modules with zero impact on others. You could replace the `FormComponent` with a completely different UI, and as long as it emits the same event, the application works perfectly. The system becomes a set of independent, plug-and-play parts.

### III. The Flow is Unidirectional
*   **What it is:** Data flows in one direction, and one direction only: `Action → Event → Logic → State Change → Re-render`. A user clicks a button (Action), which triggers an `Event`. A `Model` or `View Controller` (Logic) handles the event, performs some work, and tells the `StateManager` to update. The `StateManager` (State Change) updates its data, which automatically triggers the relevant `Components` to re-render with the new state.
*   **Why it matters:** This creates **predictability**. You can reason about the flow of logic without getting lost in circles. It prevents the cascading, unpredictable updates that plague systems with two-way data binding. When something changes on the screen, you know exactly what sequence of events led to it.

### IV. The Services are Sentinels
*   **What it is:** All interaction with the outside world (APIs, `localStorage`, etc.) is isolated in a `Service` module. The `NotionService` is the *only* part of the application that knows how to talk to Notion. The `ApiService` is the only part that knows how to make an HTTP request.
*   **Why it matters:** This creates an **Anti-Corruption Layer**. The core of your application (models, components) is protected from the messy, ever-changing details of external APIs. If Notion changes its data format, you only have to update the `NotionService`. The rest of the application remains untouched. This makes the system incredibly resilient to external changes.

### V. Components are Dumb Artisans
*   **What it is:** Components are responsible for one thing: rendering a piece of UI based on the state they are given (`props` and `state`). They contain no business logic. They simply receive data and render HTML. When the user does something, the component's only job is to emit an event.
*   **Why it matters:** This creates **reusability and testability**. A "dumb" component can be reused anywhere in the application because it has no external dependencies on models or services. It's also trivial to test: give it some props, and assert that it renders the correct HTML.

### VI. Views are the Conductors
*   **What it is:** While components are "dumb," `View Controllers` are the "smart" orchestrators for a specific page or view. The `HomePage` controller is responsible for initializing all the components on the home page, listening for their events, and delegating tasks to the appropriate `Models`.
*   **Why it matters:** This provides a clear **separation of concerns**. Page-level logic has a designated home. It keeps the components clean while providing a place to manage the complexity of a full user-facing view.

---

## 3. The Developer's Journey: What You Will Learn

Building an application with Principia.js is not just a task; it's a learning experience. By adhering to this methodology, you are not just using a framework; you are building one. This process is designed to instill a deep understanding of the principles that underpin modern web development.

*   **You will master architectural patterns:** You will gain first-hand experience implementing fundamental software design patterns: the Singleton, the Observer (EventBus), the Facade (Services), and the Anti-Corruption Layer.
*   **You will understand the "why" of modern frameworks:** Why do tools like React, Vue, and Redux exist? By building your own `StateManager`, `Component` model, and `dom-diff` utility, you will understand the problems these libraries solve from the inside out. You will never look at them as "magic" again.
*   **You will internalize Test-Driven Development (TDD):** This project follows a strict TDD loop. You will learn the discipline of writing a failing test *before* writing the implementation code. This practice forces you to think clearly about your module's API and requirements upfront. It builds a comprehensive safety net that gives you the confidence to refactor and add features without fear.
*   **You will learn to write truly decoupled code:** The `EventBus` and `Service` layers will force you to think about dependencies. You will learn to build modules that are independent, reusable, and easy to test in isolation—the hallmark of a professional software engineer.
*   **You will build a system from the ground up:** The "Foundation-First" build order is a masterclass in project strategy. You will learn how to build a complex system by starting with a stable core and progressively adding layers of functionality, ensuring that each new piece rests on a tested and reliable foundation.

This project is a dojo. It is a place to practice the art of software engineering with a clear philosophy and a structured approach. The result will not only be a functional website but also a more skilled and principled developer.
