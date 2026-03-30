# 🌍 Envium

> **The Zero-Boilerplate & Type-Safe Environment Manager.**

Envium is the modern solution for Node.js environment variable management. Unlike traditional tools like `dotenv` that merely load loose strings, Envium **segments, validates, strictly types, and protects** your application's configuration powered by SOLID principles and robust Developer Experience (DX). It also provides **event-driven watch functionality** and **flat destructuring support** for hot-reloading in development.

---

## 🚀 Features

- **📂 Group Segmentation:** Organize logically using `[GROUP]` syntax natively inside your `.env` files.
- **🛡️ Differential Security:** Applies Strict **Immutability** (`writable: false`, `configurable: false`) in Production and permissive **Hot-Reloading** (`fs.watch`) in Development scenarios.
- **🛑 Fail-Fast Validation:** Automatically checks runtime variables against a schema. The system prevents app execution if any required variable is missing or mismatched.
- **🪄 Magic TypeScript Autocomplete:** Inject your schema once and gain deep nested autocomplete (e.g. `env.DATABASE.PORT`) powered by native TypeScript generics. Zero `.d.ts` boilerplate generations hiding in your root.
- **🔄 Flat Destructuring:** Destructure environment variables using flat keys within groups (e.g. `const { ACCESS_KEY_ID } = env.AWS;`) alongside nested access, making integration with third-party libraries seamless.
- **☁️ Cloud Deployments Compatible:** Features a robust "Unflattening" engine that seamlessly maps flat CI/CD variables (like `DATABASE_PORT=5432` from Vercel or AWS) into your grouped `env.DATABASE.PORT` runtime without changing a line of code.
- **🛠️ Automated CLI DX:** Integrated CLI automating the creation of `.env.example` placeholders, Markdown documentation, and validation hooks.

---

## 📦 Installation

```bash
npm install envium
# or using pnpm
pnpm add envium
```

---

## 💡 Quick Start

### 1. Define your `.env`

Group your variables to keep everything perfectly organized and readable:

```env
NODE_ENV=development

[SERVER]
PORT=3000
DEBUG=true

[DATABASE]
HOST=localhost
USER=admin
[/DATABASE] # Optional explicit closing tag
```

### 2. Configure your Schema (envium.config.ts/js)

You can write your schema manually, or run \`npx envium init --ts\` to automatically generate your \`envium.config.ts\` based on your existing \`.env\`:

```typescript
// envium.config.ts
export const schema = {
  SERVER: {
    PORT: { type: 'number', required: true, default: 8080 },
    DEBUG: { type: 'boolean' }
  },
  DATABASE: {
    HOST: { type: 'string', required: true },
    USER: { type: 'string' }
  }
} as const; // 'as const' is required for TS deep auto-completion!
```

### 3. Initialize Envium 

Import `init` and pass your exported schema. By default, Envium will automatically load the \`.env\` file from the root of your project unless configured otherwise:

```typescript
import { init } from 'envium-js';
import { schema } from './envium.config';

// Initialize and export the strongly-typed environment
export const env = init({ 
  schema, 
  // path: '.env', -> Loads natively from root by default
  watch: process.env.NODE_ENV !== 'production' 
});
```

### 4. Destructuring Support (Flat or Nested)
Envium supports **both nested and flat destructuring** for maximum flexibility and cleaner code:

```typescript
import { env } from 'envium-js';

// Flat destructuring from groups 
const { ENDPOINT, REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY } = env.AWS;

// Nested destructuring
const { ENDPOINT, REGION, ACCESS: { KEY: { ID: ACCESS_KEY_ID } } } = env.AWS;

// Mix and match
const REGION = env.AWS.REGION; // Nested access
const ACCESS_KEY_ID = env.AWS.ACCESS_KEY_ID; // Flat access
```

This makes configuration code cleaner and more intuitive, especially for AWS SDKs and similar libraries.
---

## 📡 Event Emitters & Watch Functionality

Envium provides **event-driven development** with built-in watchers for hot-reloading in development environments. Listen to configuration changes and react dynamically:

```typescript
import { env } from 'envium-js';

// Listen for configuration reloads (e.g., when .env file changes)
env.on('reload', (changes) => {
  console.log('Configuration reloaded:', changes);
  // Restart services, update connections, etc.
});

// Emit custom events for your application logic
env.emit('custom-event', { data: 'example' });

// Remove listeners when done
env.off('reload');
```

In development mode, Envium automatically watches your `.env` file for changes and emits `reload` events with the updated configuration. This enables seamless hot-reloading without restarting your application.

**Proxy Inspection**: Use `console.log(env)` to inspect the current configuration structure with custom symbols for debugging.

---

## ☁️ Production Native Unflattening

In platforms like **Vercel**, **Railway**, or **AWS**, deploying a `.env` file with `[GROUP]` syntax isn't possible (dashboards only support flat `KEY=VALUE` lists).
Envium handles this perfectly behind the scenes using our advanced **Unflattener**!

Define your config flatly in your deployment Dashboard by concatenating the group and variable names:
```text
SERVER_PORT=80
DATABASE_HOST=mongodb://production
```
Envium will detect `SERVER_PORT` and map it automatically casting it natively to `env.SERVER.PORT`. Your application codebase remains 100% identical.

---

## 🧑‍💻 CLI Automation (The Bridge)

The `envium` CLI reads your project constraints generating utilities out of the box ensuring DRY principles (Don't Repeat Yourself!):

```bash
# 1. Generate an automated configuration based on your current .env file
npx envium init

# 2. Update your config schema when .env changes
npx envium update [--dry-run]

# 3. Generate or synchronize your ENV_DOCS.md, explaining schemas, required fields, and defaults
npx envium gen-docs

# 4. Format a .env.example file, automatically omitting credential strings by default
npx envium gen-assets

# 5. Actively validate your local .env file (Ideal for automated CI/CD pipelines)
npx envium check
```

---
*Built focusing tightly on extreme deployment constraints avoiding manual configurations.*

## 📚 API Reference

### Core Functions

- **`init(options?)`**: Initialize Envium with optional configuration. Returns the typed environment proxy.
  - `options.mode`: `'development'` or `'production'` (auto-detected by default)
  - `options.envPath`: Path to `.env` file (default: `.env`)

### Proxy Methods

- **`env.on(event, listener)`**: Listen to events like `'reload'` for configuration changes.
- **`env.off(event, listener?)`**: Remove event listeners.
- **`env.emit(event, data?)`**: Emit custom events.
- **`env.activeMode`**: Get current mode (`'development'` or `'production'`).
- **`env.isInitialized`**: Check if Envium is initialized.

### CLI Commands

- **`npx envium init`**: Generate initial configuration from `.env`.
- **`npx envium update [--dry-run]`**: Update schema when `.env` changes.
- **`npx envium gen-docs`**: Generate Markdown documentation.
- **`npx envium gen-assets`**: Generate `.env.example` file.
- **`npx envium check`**: Validate `.env` file against schema.

![npm version](https://img.shields.io/npm/v/envium-js?color=6366F1&style=for-the-badge)
![npm downloads](https://img.shields.io/npm/dm/envium-js?color=0A66C2&style=for-the-badge)
![license](https://img.shields.io/github/license/misaint20/envium?color=FF7F50&style=for-the-badge)