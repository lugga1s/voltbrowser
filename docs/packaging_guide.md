# Volt Browser — Packaging and Deployment Guide

This document outlines the pipeline for testing, building, and packaging **Volt Browser** for production.

---

## 1. Local Testing Cycle (Development vs. Production)

To prevent bugs and ensure that code changes reflect correctly when testing locally:

* **Vite Dev Server (Dev Mode):** Running `npm run dev` launches a local Vite dev server with Hot-Module-Replacement (HMR) and opens Electron pointing to `http://localhost:5173`.
* **Static Build (Direct Mode):** Running `npm run build` compiles Vite assets to the `dist/` directory. You can run these static files locally via `npx electron .` to test the production bundle without packaging it first.
* **Packaged Execution (Production Mode):** Running `npm run dist` packages the application into a standalone installer and a compiled directory (`release/win-unpacked/Volt Browser.exe`).

---

## 2. Preventing Process File Locks (EBUSY)

When compiling or packaging the app, the build script might fail with an `EBUSY` error if files are locked by active processes (like an active dev server or an open packaged app).

### Standard Build Prevention:
1. Always run `scripts/check-release-locks.mjs` before packaging.
2. In PowerShell, you can run the following command to force-close any locking processes:
   ```powershell
   Stop-Process -Name 'Volt Browser' -Force -ErrorAction SilentlyContinue
   Stop-Process -Name 'electron' -Force -ErrorAction SilentlyContinue
   ```

---

## 3. Configuring Electron-Builder (`package.json`)

The packaging structure is handled via `electron-builder`. Below is the standard configuration to be implemented in `package.json`:

```json
"build": {
  "appId": "com.volt.browser",
  "productName": "Volt Browser",
  "electronDist": "./node_modules/electron/dist",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "src/main/**/*",
    "package.json"
  ],
  "win": {
    "icon": "assets/icon.ico",
    "target": [
      "nsis"
    ]
  },
  "nsis": {
    "oneClick": true,
    "allowToChangeInstallationDirectory": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Volt Browser"
  }
}
```

---

## 4. Running the Shortcut PowerShell Script

To quickly update the Windows Desktop Shortcut for testing:

* **Point to Dev Server (fast UI iteration):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/update-shortcut.ps1 -Mode dev
  ```
* **Point to compiled unpacked local production build (final validation):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/update-shortcut.ps1 -Mode prod
  ```
* **Point to local static build directly (without console window):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/update-shortcut.ps1 -Mode direct
  ```
