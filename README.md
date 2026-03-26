# clash-yaml-builder

`clash-yaml-builder` is a cross-platform rule wizard for generating Clash-family YAML and related routing configs.

The project is designed around a stable intermediate project model instead of binding the UI directly to any single platform's YAML format. That keeps the codebase extensible as support grows across:

- OpenClash on routers
- Windows Clash or Mihomo clients
- Sparkle-compatible clients
- Future macOS desktop builds
- Future iPhone and iPad companion flows

## Goals

- Let non-technical users generate routing rules through guided forms
- Separate user intent from platform-specific output
- Support long-term iteration without repeated large refactors
- Keep project files editable, migratable, and exportable to multiple targets

## Architecture

The app is intentionally split into:

- `domain`: stable project model, presets, capabilities, validation, normalization
- `adapters`: target-specific config renderers
- `ui`: wizard screens and previews
- `application`: orchestration between UI and core services

Read [ARCHITECTURE.md](/C:/Users/robin/Desktop/codex/clash-yaml-builder/ARCHITECTURE.md) for the design details.

## Current Scope

This initial scaffold includes:

- Stable project schema for future migrations
- Platform capability registry
- Validation and normalization pipeline
- Renderer interfaces and starter implementations
- Minimal React app shell for the guided builder UI
- Preset packs that can reference upstream rule sources such as MetaCubeX `meta-rules-dat`

## Planned Targets

- Web app shell for fast iteration
- Desktop packaging later through a lightweight shell
- Apple support later through shared front-end and core logic

## Development

Dependencies are declared, but the current workspace bootstrap may still need package installation before running locally.

Typical commands:

```bash
npm install
npm run dev
npm run build
```

## Roadmap

See [ROADMAP.md](/C:/Users/robin/Desktop/codex/clash-yaml-builder/ROADMAP.md).
