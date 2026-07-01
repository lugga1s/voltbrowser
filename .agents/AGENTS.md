# Volt Browser — AI Agent Collaboration & Behavior Rules

This document outlines the operational protocol, coding standards, and repository workflows that all AI agents must follow when executing tasks in this workspace.

---

## 1. Role & Autonomy Guidelines

* **Non-Technical Context Engineer**: The user directing this project is a non-technical context owner. Do not ask the user for command-line execution instructions, code reviews, or troubleshooting steps.
* **Complete Ownership**: The AI Agent must take full technical responsibility. You must:
  1. Search documentation and guidelines.
  2. Implement features according to 2026 industry standards.
  3. Validate type safety and build success.
  4. Manage version control (Git) automatically.

---

## 2. Git & GitHub Workflow Protocol

The remote repository is: `git@github.com:lugga1s/voltbrowser.git` (HTTPS: `https://github.com/lugga1s/voltbrowser.git`).

### A. Initialization & Setup
1. Check if `.git` exists. If not, initialize:
   ```bash
   git init
   git remote add origin git@github.com:lugga1s/voltbrowser.git
   ```
2. Track configuration files (`.gitignore` must exclude `node_modules`, `dist`, `release`, and `workspace-config.json` to protect session security).

### B. Daily Feature Workflow
1. **Pull and Sync**: Always check current state and fetch latest remote commits:
   ```bash
   git checkout main
   git pull origin main --rebase
   ```
2. **Branching**: Do not commit directly to the `main` branch. Create a feature branch:
   ```bash
   git checkout -b feature/<feature-name>
   ```
3. **Conventional Commits**: Format commit messages descriptively:
   * `feat(scope): Description` (for new features)
   * `fix(scope): Description` (for bug fixes)
   * `chore(scope): Description` (for updates, configs, or docs)
4. **Pushing & PRs**:
   * Verify build succeeds: `npm run build`.
   * Push the branch: `git push origin feature/<feature-name>`.
   * Write a detailed, user-facing summary of the changes in the push log, formatted so the user can easily see what was done.

---

## 3. Technology Stack & Security Standards (2026)

All code modifications must respect Electron, React 19, Vite, and TypeScript best practices.

### A. Electron Security Hardening (Mandatory)
* **Context Isolation**: `contextIsolation: true` must remain enabled in the main window configuration inside `main.js`.
* **Node Integration**: `nodeIntegration: false` must remain disabled in the renderer process.
* **Chromium Sandboxing**: `sandbox: true` must be enabled.
* **IPC Sanitization**: Never pass raw Node/Electron modules to the frontend. Expose only minimal, validated APIs via `preload.js`. Validate all parameter schemas on the IPC receiver end inside the main process.

### B. Front-End Architecture (React 19 & TypeScript)
* **Type Safety**: Strictly avoid `any` types. Declare interfaces for all payloads, components, and event states.
* **CSS & Design Hygiene**: Keep index.css clean. Use CSS variables for themes (`--bg-app`, `--text-primary`, etc.) matching a modern macOS/glassmorphism dark aesthetic.
* **WebView Lifecycle**: Apply memory optimizations (lazy loading webviews, toggle `width: 0px; height: 0px;` class for background channels instead of conditional rendering or `display: none` to keep connections alive without GPU overhead).

---

## 4. Architectural & Troubleshooting Lessons (Knowledge Base)

When developing or debugging this project, agents must respect these findings to prevent breaking features:

### A. WebView Preload Script Initialization (Google Login & Session Handling)
* **Preload Attribute Constraint**: The `<webview>`'s `preload` attribute **cannot be set dynamically** after mounting (e.g., using `setAttribute` inside a `useEffect`). It must be provided in the initial React render.
* **Asynchronous Resolution**: Because `preload.js` is sandboxed, it cannot load Node.js native modules (like `path`). To supply `preloadPath` to `<webview>`, load the path asynchronously on React startup using `window.electronAPI.getWebviewPreloadPath()` and store it in state in `App.tsx`, then pass it down to your webview components.
* **ASAR Loading Restriction**: In production, the app is packaged inside an `app.asar` archive. Chromium's guest process inside `<webview>` cannot read files inside the virtual `app.asar` archive under the `file://` protocol. To bypass this, the main process must copy `webview-preload.js` from `app.asar` to the real filesystem `app.getPath('userData')` on startup, and return the resolved `file://` URL pointing to this unpacked copy.

### B. Custom Titlebar Buttons & Draggable Region (Windows OS)
* **Swallowed Clicks**: When `-webkit-app-region: drag` is active on a parent header, child elements marked as `no-drag` can still fail to receive click events on Windows.
* **Fix**: Ensure that the button container and the buttons themselves have:
  1. `-webkit-app-region: no-drag !important`
  2. `position: relative` (or absolute)
  3. `z-index` higher than the draggable header.

### C. Build Lock Prevention
* **Process Locks**: Prior to running the production compiler (`npm run dist`), you must ensure that all instances of `Volt Browser.exe` and `electron` are completely stopped to prevent file lock errors (EBUSY).
* **Stop Command**: Use PowerShell to clean them up:
  ```powershell
  Stop-Process -Name 'Volt Browser' -Force -ErrorAction SilentlyContinue
  Stop-Process -Name 'electron' -Force -ErrorAction SilentlyContinue
  ```

### D. Session Isolation API (Multi-Account Setup)
* **Electron Code Implementation**: In Volt Browser, setting custom partitions per Google session is done via Electron's session API. This isolates cookies, localstorage, and cache:
  ```javascript
  const ses = session.fromPartition('persist:account_id');
  ses.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  ```
* **Shared login**: By sharing the same partition `persist:account_id` between shortcuts of the same Google account, they share the active session, so logging in once logs the user in for Gmail, Analytics, GSC, etc.

### E. Cycle of Packaging and Desktop Shortcuts
* **Process Cleaning**: Always run `scripts/check-release-locks.mjs` before executing `npm run dist`.
* **Desktop Shortcuts**: The `scripts/update-shortcut.ps1` updates a desktop shortcut `Volt Browser.lnk` pointing to:
  1. `run-volt.bat` (dev mode - Vite dev server + Electron)
  2. `release/win-unpacked/Volt Browser.exe` (local compiled production test)
  3. The officially installed application path in local appdata.

### F. WebAuthn (Passkeys / Windows Hello PIN) Development Limitation
* **Issue**: During local development (`npm run dev`), attempting to log in via a Google Passkey will show the Windows Hello PIN dialog, but after entering the PIN, the browser hangs indefinitely on "Verificando sua identidade..." (Verifying your identity).
* **Cause**: In local dev mode, the app runs inside the unverified and unsigned `node_modules/electron/dist/electron.exe` binary. Windows Hello security subsystems block returning authentication credentials/assertions to unsigned and untrusted Win32 binary paths to protect credentials.
* **Development Workaround**: Click "Tentar de outro jeito" (Try another way) on the Google login page and proceed with password-based authentication + standard MFA.
* **Production Resolution**: Once the application is packaged and signed with a standard code-signing certificate (typical for production deployment), Windows Hello and Google will verify the trusted executable identity and successfully return the credentials, resolving the flow automatically.
