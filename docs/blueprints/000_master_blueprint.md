[<- Back to README](../../README.md)

# Master Blueprint: Principia.js

This document outlines the master plan for building the NSTCG website using the Principia.js architecture.

## Architectural Canon

1.  **The State is Singular:** All application state lives *only* in the `StateManager`.
2.  **Events are the Messengers:** All module communication happens *only* through the `EventBus`.
3.  **The Flow is Unidirectional:** `Action → Event → Logic → State Change → Re-render`. No exceptions.
4.  **The Services are Sentinels:** All external dependencies are isolated in a `Service` module.
5.  **Components are Dumb Artisans:** Components *only* render state and emit events. They contain no business logic.
6.  **Views are the Conductors:** Page-specific orchestration is the *only* job of a `View Controller`.

## Build Order

The project will be built in the following phases:

### Phase 1: The Core Engine

*   [**001_EventBus.md**](./001_EventBus.md)
*   [**002_StateManager.md**](./002_StateManager.md)
*   [**003_ErrorHandlerService.md**](./003_ErrorHandlerService.md)
*   [**004_LoggerService.md**](./004_LoggerService.md)
*   [**005_dom-diff.md**](./005_dom-diff.md)
*   [**006_Component.md**](./006_Component.md)

### Phase 2: The External World & Business Logic

*   [**007_ApiService.md**](./007_ApiService.md)
*   [**008_NotionService.md**](./008_NotionService.md)
*   [**009_I18nService.md**](./009_I18nService.md)
*   [**010_UserModel.md**](./010_UserModel.md)
*   [**011_ParticipantModel.md**](./011_ParticipantModel.md)

### Phase 3: The User Interface & Application Assembly

*   [**012_CounterComponent.md**](./012_CounterComponent.md)
*   [**013_FormComponent.md**](./013_FormComponent.md)
*   [**014_ModalComponent.md**](./014_ModalComponent.md)
*   [**015_HomePage.md**](./015_HomePage.md)
*   [**016_Router.md**](./016_Router.md)
*   [**017_app.md**](./017_app.md)
*   [**018_NotificationComponent.md**](./018_NotificationComponent.md)
*   [**019_AssetService.md**](./019_AssetService.md)
