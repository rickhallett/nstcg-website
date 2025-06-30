[<- Back to README](../../README.md)

# Principia.js: A Deep Dive into the Modules

This document provides a detailed, module-by-module breakdown of the Principia.js architecture. It explores the "Why, What, and How" of each component, serving as a technical companion to the philosophical `principia.js.md` manifesto.

---

## Phase 1: The Core Engine

This phase creates the application-agnostic framework itself. These modules are pure, reusable, and form the foundation for everything that follows.

### `001_EventBus.js`

*   **Why (The Rationale):** To eliminate tight coupling between different parts of the application. Without a central messaging system, modules would need direct references to each other, creating a "spaghetti" architecture that is brittle and hard to refactor. The EventBus allows any module to communicate with any other module without them knowing about each other's existence.

*   **What (The Core Responsibility):** To provide a global, singleton pub/sub (publish/subscribe) mechanism. Its only jobs are to allow modules to subscribe to named events (`on`) and to trigger those events with an optional data payload (`emit`).

*   **How (The Implementation):** It's a simple class that maintains a dictionary (or Map) where keys are event names and values are arrays of callback functions (the subscribers). When `emit` is called, it looks up the event name and executes all associated callbacks. It is implemented as a singleton to ensure there is only one message bus for the entire application.

*   **Relationships:** The EventBus is the heart of the application's communication. It has no dependencies but is used by almost every other module.

    ```mermaid
    graph TD
        subgraph "Event Emitters"
            A[Components] -- emit --> EventBus
            B[View Controllers] -- emit --> EventBus
            C[Models] -- emit --> EventBus
        end

        subgraph "Event Listeners"
            EventBus -- notifies --> D[Models]
            EventBus -- notifies --> E[View Controllers]
            EventBus -- notifies --> F[Services]
        end
    ```

### `002_StateManager.js`

*   **Why (The Rationale):** To establish a single, predictable, and authoritative source of truth for the entire application's state. This solves the problem of "state scattered everywhere," which makes applications unpredictable and difficult to debug.

*   **What (The Core Responsibility):** To hold the application state in a single, private object. It provides methods to initialize (`initialize`), read (`get`), and write (`set`, `update`) to this state. Crucially, whenever the state changes, it notifies the rest of the application.

*   **How (The Implementation):** It maintains a plain JavaScript object for the state. The `get` and `set` methods use dot notation (e.g., `'user.profile.name'`) for easy access to nested properties. To prevent accidental mutation, `get` returns a deep clone of any object or array. When `set` or `update` is called, it uses the `EventBus` to emit a `state:changed` or `state:batch-changed` event, broadcasting the change to any interested listeners (like Components).

*   **Relationships:** The StateManager is the central repository of data. It is primarily written to by Models and read from by Components.

    ```mermaid
    graph TD
        A[Models] -- call .set() / .update() --> B(StateManager)
        B -- holds --> C{Application State}
        B -- emits 'state:changed' --> D(EventBus)
        D -- notifies --> E[Components]
        E -- call .get() --> B
    ```

### `005_dom-diff.js` & `006_Component.js`

*   **Why (The Rationale):** To create a declarative and efficient way to render UI. Instead of manually manipulating the DOM (e.g., `element.innerHTML = ...`), which is slow and error-prone, we want to simply declare what the UI *should* look like based on the current state. The `Component` and `dom-diff` utility work together to make this possible and performant.

*   **What (The Core Responsibility):**
    *   **`Component.js`**: An abstract base class that all UI components extend. Its job is to subscribe to changes in the `StateManager` and trigger a re-render when its data changes. It defines a component lifecycle (`attach`, `destroy`).
    *   **`dom-diff.js`**: A pure utility function that compares two DOM trees (the current one and the newly rendered one). Its job is to calculate the minimal set of changes required (e.g., update a text node, change an attribute) and apply *only* those changes to the actual DOM.

*   **How (The Implementation):**
    1.  A `Component` is instantiated with a `host` DOM element and `props`.
    2.  In its constructor, it can call `this.subscribeToState('path.to.data')`.
    3.  When `attach()` is called, it runs its `render()` method, which returns a new DOM tree fragment. This fragment is appended to the `host`.
    4.  When a subscribed piece of state changes, the `Component`'s update handler is triggered.
    5.  It runs `render()` again to create a *new* virtual DOM tree.
    6.  It calls the `diff()` function, passing the old DOM tree and the new one.
    7.  `diff()` walks both trees, comparing nodes. If text content differs, it updates it. If attributes differ, it adds/removes/updates them. If nodes are entirely different, it replaces them. This surgical update is far more efficient than replacing the entire `innerHTML`.

*   **Relationships:** This is a mini-engine within the framework.

    ```mermaid
    graph TD
        A(StateManager) -- state changes --> B(Component)
        B -- calls .render() --> C{New Virtual DOM}
        B -- calls --> D(dom-diff.js)
        D -- compares C with --> E{Old Real DOM}
        D -- applies minimal patches --> E
    ```

---

## Phase 2: The External World & Business Logic

This phase builds the bridge to the outside world and encodes the application's rules.

### `007_ApiService.js` & `008_NotionService.js`

*   **Why (The Rationale):** To isolate and manage the complexity of external API interactions. This creates an "Anti-Corruption Layer" that protects the core application from the specific implementation details of third-party services.

*   **What (The Core Responsibility):**
    *   **`ApiService.js`**: A generic wrapper around the browser's `fetch` API. It handles universal concerns like setting default headers, managing timeouts, and standardizing success/error responses. It knows *how* to make HTTP requests, but not *what* those requests are for.
    *   **`NotionService.js`**: A specific service that uses `ApiService`. It knows *what* to do with Notion. Its job is to translate application-level requests (e.g., `getParticipantByEmail`) into the specific API endpoints and data structures that Notion expects. It also transforms the complex data received from Notion into simple, clean objects that the rest of our application can easily use.

*   **How (The Implementation):** `NotionService` is instantiated with an `ApiService` instance. When a method like `createParticipant(user)` is called on `NotionService`, it first transforms the simple `user` object into the complex JSON payload Notion requires. Then, it calls `this.apiService.post('/pages', notionPayload)`. This clean separation makes both modules highly testable and maintainable.

*   **Relationships:** A clear chain of command for external data.

    ```mermaid
    graph TD
        A[Models] -- e.g., "get me a user" --> B(NotionService)
        B -- "transform app data to API data" --> B
        B -- calls .get()/.post() --> C(ApiService)
        C -- "handles fetch, headers, errors" --> C
        C -- makes HTTP request --> D[External API]
        D -- returns raw API data --> C
        C -- returns standardized response --> B
        B -- "transform API data to clean app data" --> B
        B -- returns clean data --> A
    ```

### `010_UserModel.js` & `011_ParticipantModel.js`

*   **Why (The Rationale):** To create a dedicated home for business logic. A `Component` shouldn't know how to register a user, and a `Service` shouldn't know the *rules* for registration (e.g., "check for duplicates first"). The Model layer fills this gap.

*   **What (The Core Responsibility):** To orchestrate actions. A model receives a command (e.g., `register(userData)`), uses one or more services to fetch or persist data, applies business rules (e.g., generate a referral code, calculate points), and finally, commands the `StateManager` to update the state with the new information.

*   **How (The Implementation):** A `UserModel` method like `register` will first call `notionService.getParticipantByEmail`. If a user exists, it returns an error. If not, it generates a referral code, then calls `notionService.createParticipant`. On success, it calls `stateManager.update({...})` to update the user's state, making the change available to the entire application.

*   **Relationships:** Models are the brains of the operation.

    ```mermaid
    graph TD
        A[View Controllers] -- calls method e.g. .register() --> B(Model)
        B -- uses --> C(Service)
        B -- applies business logic --> B
        B -- commands --> D(StateManager)
    ```

---

## Phase 3: The User Interface & Application Assembly

This phase builds the visible parts of the application and wires them into the engine.

### `015_HomePage.js` (View Controller)

*   **Why (The Rationale):** To manage the complexity of a specific page or "view." While individual components are "dumb," a full page is often complex. It needs to initialize multiple components, listen for events from all of them, and orchestrate the flow of data between them and the models. The View Controller is the "conductor" for this orchestra.

*   **What (The Core Responsibility):** To instantiate and assemble all the components needed for a particular view (e.g., the `HomePage`). It listens for events from its child components (like `form:submit`) and delegates the resulting work to the appropriate `Model`.

*   **How (The Implementation):** The `HomePage.js` file will have an `init()` method. This method will find the host elements in the DOM (e.g., `#signup-form-container`), create new instances of `FormComponent` and `CounterComponent`, and call `.attach()` on them. It will also subscribe to `eventBus.on('form:submit', this.handleFormSubmit)`. The `handleFormSubmit` method will then call `userModel.register(data)`.

### `016_Router.js`

*   **Why (The Rationale):** To enable a Single-Page Application (SPA) experience. Instead of full page reloads when navigating, which is slow and jarring, the Router intercepts navigation, fetches only the necessary content, and updates the page dynamically.

*   **What (The Core Responsibility):** To map URL paths to `View Controllers`. It listens for link clicks and browser back/forward button presses (`popstate`). When a route changes, it fetches the new page's HTML, updates the main content area of the DOM, and, most importantly, calls the `init()` method of the corresponding `View Controller` to bring the new page to life.

*   **How (The Implementation):** It attaches a global click listener to the document. If a clicked link is internal, it prevents the browser's default navigation. It uses `history.pushState()` to update the URL in the address bar without a page load. It then fetches the HTML for the new route, uses `dom-diff` to patch the main content area, and dynamically imports and runs the `init()` function for the new view's controller (e.g., `HomePage.init()` or `LeaderboardPage.init()`).

### `017_app.js`

*   **Why (The Rationale):** Every application needs a single, unambiguous entry point—a place where everything starts.

*   **What (The Core Responsibility):** To be the ignition switch. Its only job is to initialize all the core singleton services (`StateManager`, `EventBus`, `Router`, `ErrorHandlerService`, etc.) in the correct order and then tell the `Router` to handle the initial page load.

*   **How (The Implementation):** A simple script that, on DOMContentLoaded, creates instances of all the core services and calls their respective `init()` methods. The final step is `Router.getInstance().init(routes)`.

This modular, principled architecture ensures that the application is robust, maintainable, and scalable. Each piece has a clearly defined purpose, making the entire system easier to understand, test, and extend.
