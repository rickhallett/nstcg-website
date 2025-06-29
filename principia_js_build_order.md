Excellent. Now that we have the comprehensive blueprints for each foundational module, the final piece of the architectural puzzle is the **Build Order and Strategy**. This is crucial. Following the correct sequence ensures that each new piece of the application is built upon a solid, tested foundation, dramatically reducing complexity and debugging time.

Here is the definitive build order, designed to follow our **Foundation-First** architectural strategy. This order should be followed rigorously by the development agent.

---

### **The Principia.js Build Order & Rationale**

**Guiding Philosophy:** We build from the inside out. We start with the most abstract, application-agnostic core services and progressively move towards the concrete, user-facing UI components. Each step depends only on the steps that came before it.

---

### **Phase 1: The Core Engine (The Framework)**

**Objective:** To build the core, reusable, application-agnostic engine. At the end of this phase, we will have a fully functional, in-memory "framework" ready to power an application.

| Step | Module to Build | Test Blueprint | Rationale |
| :--- | :--- | :--- | :--- |
| **1.1** | `EventBus.js` | `EventBus.test.js` | **The Absolute Foundation.** The `EventBus` is the simplest module with zero dependencies. It is the primitive communication channel upon which everything else will be built. Building it first allows subsequent modules to use it for logging and event emission. |
| **1.2** | `StateManager.js` | `StateManager.test.js` | **The Single Source of Truth.** This module depends on nothing but is a dependency for almost everything else. It defines *how* the application's state is managed. We must have a working state store before we can build anything that reads or writes state. |
| **1.3** | `ErrorHandlerService.js` | `ErrorHandlerService.test.js` | **The Global Safety Net.** This service depends on the `EventBus` (to emit UI errors) and the yet-to-be-built `LoggerService`. We blueprint it now to establish the error handling contract. It can be implemented with a temporary `console.error` and refactored later to use the `LoggerService`. |
| **1.4** | `LoggerService.js` | `LoggerService.test.js` | **The System's Scribe.** The logger depends on the `EventBus` and `StateManager` to passively observe the system. By building it now, all subsequent modules can be wrapped for logging, giving us complete observability from the very beginning. |
| **1.5** | `dom-diff.js` | `dom-diff.test.js` | **The Surgical Tool.** This is a pure, dependency-free utility function. It must be built before the `Component` class that uses it for efficient rendering. It's a complex piece of logic that should be built and tested in isolation. |
| **1.6** | `Component.js` | `Component.test.js` | **The Cellular Unit of UI.** This is a major milestone. The `Component` base class brings together the `StateManager` (for reactivity) and the `dom-diff` utility (for rendering). It defines the contract that all UI elements must follow. |

**Outcome of Phase 1:** We have a complete, headless framework. We can create components that react to state changes, but we have no application-specific logic or UI yet.

---

### **Phase 2: The External World & Business Logic**

**Objective:** To build the layers that handle external communication and contain the application's core rules and logic. This phase is still UI-agnostic.

| Step | Module to Build | Test Blueprint | Rationale |
| :--- | :--- | :--- | :--- |
| **2.1** | `ApiService.js` | `ApiService.test.js` | **The Generic Gateway.** This abstracts the browser's `fetch` API and standardizes how we handle all HTTP requests, including timeouts and error handling. It's a reusable utility for all other services. |
| **2.2** | `NotionService.js` | `NotionService.test.js` | **The First Sentinel.** Our first concrete implementation of the Anti-Corruption Layer. It depends on `ApiService`. This module isolates all Notion-specific code, proving our service layer pattern works. |
| **2.3** | `I18nService.js` | `I18nService.test.js` | **The Content Abstractor.** This service also uses `ApiService` (to fetch locale files). Building it now ensures that from this point forward, no hard-coded strings will enter our UI components, enforcing a crucial architectural principle. |
| **2.4** | `UserModel.js` & `ParticipantModel.js` | `UserModel.test.js`, `ParticipantModel.test.js` | **The Brains of the Operation.** With the service layer complete, we can now build the `Models`. They depend on the `Services` for data and the `StateManager` for updates. This is where the application's business rules are encoded for the first time. |

**Outcome of Phase 2:** We have a fully functional application engine that can fetch data, process it according to business rules, and manage state. It still has no user interface.

---

### **Phase 3: The User Interface & Application Assembly**

**Objective:** To build the visible parts of the application and wire them into the engine, creating a complete, functional feature slice.

| Step | Module to Build | Test Blueprint | Rationale |
| :--- | :--- | :--- | :--- |
| **3.1** | `CounterComponent.js` | `CounterComponent.test.js` | **"Hello, World!" Component.** This is the simplest possible reactive component. It proves that our entire state-to-UI pipeline works. We build it to validate that a component can subscribe to state (`stats.participantCount`) and re-render when the `ParticipantModel` updates it. |
| **3.2** | `FormComponent.js` & `ModalComponent.js` | `FormComponent.test.js`, `ModalComponent.test.js` | **The Interactive Components.** These are more complex UI pieces. Building them tests our component architecture's ability to handle user input, event emission, and composition (a form inside a modal). |
| **3.3** | `HomePage.js` (View Controller) | `HomePage.test.js` | **The First Conductor.** This is the final assembly step for our first feature. The `HomePage` view controller instantiates the `FormComponent` and `CounterComponent`, subscribes to their events, and orchestrates the `UserModel` and `ParticipantModel` in response. **This step validates the entire unidirectional data flow.** |
| **3.4** | `Router.js` | `Router.test.js` | **The Navigator.** Although blueprinted in Phase 1, we implement the full `Router` now. We have multiple views (`HomePage`, and soon `LeaderboardPage`, etc.) that need to be navigated between. The router wires all the different `View Controllers` together into a cohesive Single-Page Application. |
| **3.5** | `app.js` | `app.test.js` | **The Ignition Switch.** The final piece. This top-level script is responsible for initializing all the singletons (`StateManager`, `EventBus`, `Router`, etc.) in the correct order and starting the application by telling the `Router` to handle the initial URL. |

**Outcome of Phase 3:** We have a fully functional, interactive, single-page application with a working registration flow and participant counter. The core architecture is proven end-to-end.

---

### **Phase 4: Feature Expansion**

**Objective:** With the foundation and first feature complete, we can now rapidly build out the remaining features by simply repeating the pattern of creating Models, Components, and View Controllers.

*   Build out the **Leaderboard** feature: `LeaderboardModel.js`, `LeaderboardComponent.js`, `LeaderboardPage.js`.
*   Build out the **Donations** feature: `StripeService.js`, `DonationModel.js`, `DonateFormComponent.js`, `DonatePage.js`.
*   And so on.

Because the foundation is so solid, adding new features becomes a predictable, repeatable process of "filling in the blanks" within the established architecture, rather than an exercise in new architectural design. This is the ultimate payoff of the Foundation-First approach.