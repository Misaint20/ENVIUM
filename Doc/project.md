# 📄 Project Blueprint: Envium

## 1. Project Identity
* **Name:** `envium`
* **Tagline:** "The Zero-Boilerplate & Type-Safe Environment Manager"
* **Language:** TypeScript (Strict Mode)
* **License:** MIT

---

## 2. Goals and Vision
**Envium** was created to solve the lack of structure in environment variable management in Node.js. Unlike `dotenv`, this library not only loads strings, but also **segments, validates, types, and protects** the application's configuration.

### Core Principles
1.  **Group Segmentation:** Logical organization using `[GROUP]` syntax.
2.  **Differential Security:** Restrictive behavior (Immutable) in Production and permissive (Mutable/Watcher) in Development.
3.  **Fail-Fast:** The system must prevent the application from starting if the environment is invalid according to the schema.
4.  **Single Source of Truth:** The validation schema automatically generates documentation (`ENV_DOCS.md`) and the template (`.env.example`).

---

## 3. Technical Architecture (SOLID)

The project is governed by decoupled components through interfaces:

| Module | SOLID Principle | Responsibility |
| :--- | :--- | :--- |
| **Parser** | **SRP** | Transforms the `.env` file into a hierarchical object. |
| **Caster** | **SRP** | Converts string values into native types (bool, number). |
| **Injector** | **ISP** | Defines property descriptors to lock `process.env`. |
| **Security Strategy** | **OCP / LSP** | Switches behavior between Dev/Prod without modifying the Core. |
| **Validator** | **DIP** | Abstraction to validate the schema (native or external). |

---

## 4. Directory Structure

```text id="z7p4xk"
envium/
├── src/
│   ├── core/
│   │   ├── Parser.ts         # Regex engine and segmentation
│   │   ├── Injector.ts       # Injection and locking logic (Property Descriptors)
│   │   └── Caster.ts         # Data type conversion
│   ├── security/
│   │   ├── Strategy.ts       # Interface (IStrategy)
│   │   ├── DevStrategy.ts    # Mutable mode + Logs
│   │   └── ProdStrategy.ts   # Immutable mode (Deep Freeze)
│   ├── validation/
│   │   └── NativeValidator.ts # Type and required field validator
│   ├── generators/
│   │   ├── DocGenerator.ts   # ENV_DOCS.md generator (MD + HTML)
│   │   └── ExampleGen.ts     # .env.example generator
│   ├── types/
│   │   └── index.ts          # Global definitions and contracts
│   ├── index.ts              # Facade & Proxy (Entry point)
│   └── cli.ts                # Terminal commands (npx envium ...)
├── tests/                    # Unit & Integration tests (Vitest)
├── tsconfig.json             # TS Strict Configuration
└── package.json              # Exports (ESM/CJS) and Scripts
```

## 5. Implementation Specifications

### Security Rules
* **Production:** Injected variables must have `writable: false` and `configurable: false` in their JavaScript property descriptors.
* **Development:** `fs.watch` is enabled to allow hot changes (Hot-Reload), emitting events via `EventEmitter`.

### Dynamic Typing
The library must expose a **Proxy** that allows structured access:  
`const { PORT } = env.DATABASE;`  
instead of `process.env.DATABASE_PORT`.

---

## 6. Stack and Dependencies
* **Runtime:** Node.js (LTS).
* **Build Tool:** `tsup` (to generate hybrid CJS/ESM packages).
* **Test Runner:** `vitest`.
* **Core:** No external dependencies (Zero-dependencies core) for maximum security.

---

## 7. Roadmap and Deployment

### Phase 1: Core Engine
* Implement `Parser` with group support.
* Implement `Caster` for automatic type detection.
* Configure `tsup` for initial build.

### Phase 2: Security and Validation
* Create the strategy system (Dev/Prod).
* Implement `NativeValidator` with support for required fields.
* Ensure `process.env` locking in production mode.

### Phase 3: Developer Experience (DX)
* Develop the CLI to generate documentation.
* Implement the Proxy for clean variable access.
* Configure the Watcher for hot reload.

### Phase 4: Quality and Release
* Achieve >90% unit test coverage.
* Configure GitHub Actions for CI/CD.
* Publish to the NPM registry.

---

## 8. Contribution Guide
1. Any change to the `Parser` must include a unit test in `tests/core/Parser.test.ts`.
2. Changes that break compatibility with LTS versions of Node.js are not allowed.
3. Any new feature must be automatically reflected in the documentation generator.

---
**Signed:** Misaint Murillo  
**Start Date:** March 2026