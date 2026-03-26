# Windows EXE Plan

`clash-yaml-builder` is now structured to support Tauri-based Windows desktop packaging.

## Current Stage

- Web app core is working
- Tauri desktop shell files are added under `src-tauri/`
- npm scripts for `tauri:dev` and `tauri:build` are declared

## Remaining Requirements For EXE Output

1. Install Rust toolchain on the build machine
2. Install Tauri npm CLI dependency
3. Verify `npm run tauri:dev`
4. Add app icons for bundled desktop output
5. Run `npm run tauri:build` to produce Windows artifacts

## Why Tauri

- Smaller output than Electron in many cases
- Good fit for a form-heavy configuration tool
- Preserves the current React and Vite front-end
- Keeps a path open for future macOS packaging
