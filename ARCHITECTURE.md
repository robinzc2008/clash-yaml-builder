# Architecture

## Design Principles

`clash-yaml-builder` is built to avoid the most common failure mode of config generators: coupling the entire app to one target YAML structure.

The architecture keeps three concerns separate:

1. User intent
2. Internal rule model
3. Platform-specific output

That separation lets us add new targets, presets, importers, and mobile shells without rewriting the core.

## Layers

### UI Layer

Responsible for:

- guided forms
- project editing
- YAML preview
- export actions

The UI never assembles raw YAML directly.

### Application Layer

Responsible for:

- loading and saving projects
- applying presets
- invoking normalize, validate, and render steps
- handling target switches

### Domain Layer

Responsible for:

- stable project schema
- rule and group modeling
- capability-aware validation
- migrations
- preset definitions

This is the long-lived center of the project.

### Adapter Layer

Responsible for:

- converting the domain model into target-specific output
- reporting unsupported features with actionable messages

Each target gets its own renderer implementation.

## Core Flow

The core pipeline is:

`project -> normalize -> validate -> render`

This keeps defaulting, rule checks, and YAML generation isolated from each other.

## Project File Strategy

The app's source of truth is a versioned project document, not exported YAML.

Benefits:

- migrations between app versions
- switching targets later
- saving unfinished work
- easier import and re-export support

## Capability-Driven Platform Support

Every target declares its capabilities separately from the UI:

- supports process rules or not
- supports source IP rules or not
- supports rule providers or not
- supports provider formats or not

The UI reads those capabilities to decide what to show. Validators use them to flag unsupported configurations. Renderers use them to format output correctly.

This avoids scattering platform `if` statements across the app.

## Apple Compatibility

The codebase is structured so the reusable parts live above any desktop wrapper:

- `src/core/*` stays platform-neutral
- `src/features/*` stays browser-friendly
- desktop-specific logic should be added in a shell layer later

That makes future macOS packaging and iPhone or iPad companion support far easier. The mobile path can reuse the same project model, validation, presets, and renderer code.

## Future Extension Points

Planned extension points include:

- importers for existing YAML
- preset packs contributed through GitHub
- translation files
- cloud sync or template sharing
- target-specific advanced options

## Folder Responsibilities

```txt
src/
  application/
  core/
    capabilities/
    migrations/
    model/
    normalization/
    presets/
    renderers/
    validation/
  features/
  ui/
```

## Guardrails

When adding new features:

- update the project schema first
- update platform capabilities second
- update validation before rendering
- keep target-specific logic out of the shared model
