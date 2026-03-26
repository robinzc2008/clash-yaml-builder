# Rule Sources

`clash-yaml-builder` is designed so presets can point to upstream rule repositories instead of hardcoding every domain list locally.

## Current Upstream Source

- MetaCubeX `meta-rules-dat`
- Repository: https://github.com/MetaCubeX/meta-rules-dat

## Why This Matters

- Presets stay small and maintainable
- Rule coverage can improve without rewriting the app model
- Future source adapters can be added without changing the wizard flow

## Current Integration Strategy

- The app keeps a source adapter in `src/core/sources/metaRulesDat.ts`
- Presets can reference `geosite` YAML files from the `meta` branch
- The UI still works in terms of human-readable scenarios such as AI, GitHub, Apple, Telegram, and China Direct

## Future Direction

Possible next steps:

- add more source adapters beyond MetaCubeX
- add source health checks and fallback mirrors
- let advanced users choose between local, remote, and inline provider modes
