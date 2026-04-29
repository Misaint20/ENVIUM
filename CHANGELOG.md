# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-28

### Added
- **`env.onChange` helper method:** A new developer-friendly method to easily listen for specific configuration changes. Supports arrays of keys and partial matching (e.g., listening to `'PORT'` also detects `'API_PORT'`).
- **Structured `change` & `reload` events:** The watcher now diffs the old and new `.env` states. The emitted event payload now includes `keys` (what changed), `changes` (old/new values dict), and `data` (full environment).

### Changed
- **Smart Hot-Reloading:** The file watcher now prevents emitting false `reload` events if the `.env` file was saved but no actual keys or values were modified.
- **Proxy Handlers Fix:** Fixed an internal proxy invariant violation where the `get` trap was failing to return target properties properly when they had `configurable: false` (like the event emitter methods).

## [1.0.1] - 2026-03-27

### Added
- Initial stable release.
- Core `Envium` functionality: Parsing, Validation, Injection, Proxy generation.
- CLI automation tools (`init`, `gen-docs`, `gen-assets`, `check`, `update`).
- Typescript support via deep generic inference.
- Production and Development security strategies.
