# Volt Browser — Security Hardening Specifications

Security is a core pillar of Volt Browser. Since the application loads external web pages (like Google Search Console) and runs them alongside local desktop access (Node.js), strict security boundaries must be maintained to prevent Cross-Site Scripting (XSS) from compromising the user's computer.

---

## 1. Chromium Sandboxing & Process Isolation

Volt Browser enforces full sandboxing at the process level:

* **Sandbox Enabled:** The `sandbox: true` flag must be set on all main window configurations and `webPreferences`.
* **Disabling Node Integration:** `nodeIntegration: false` must remain disabled in the React renderer and all guest webviews. External websites must never have access to Node.js APIs (`require`, `process`, `fs`, etc.).
* **Context Isolation:** `contextIsolation: true` must be enabled. This creates a secure boundary between the page context and the preload scripts.

```
+--------------------------------------------------------+
|                      MAIN PROCESS                      |
|                  (main.js / Node.js)                   |
+--------------------^-----------------^-----------------+
                     |                 |
         IPC (invoke/handle)       IPC (send/on)
                     |                 |
+--------------------v-----------------v-----------------+
|                    HOST RENDERER                       |
|           (React UI - Context Isolated)                |
|                                                        |
|   +------------------------------------------------+   |
|   |                  GUEST WEBVIEW                 |   |
|   |              (Google / External Web)           |   |
|   |         - Custom Preload Script Injected -     |   |
|   +------------------------------------------------+   |
+--------------------------------------------------------+
```

---

## 2. IPC Sanitization & Schema Validation

Communication between the React front-end and the Electron main process goes through the `window.electronAPI` bridge.

* **Never expose raw Node/Electron modules:** Do not expose `ipcRenderer` directly. Only expose safe, explicit functions (e.g., `window.electronAPI.saveConfig(config)`).
* **Validate Parameters:** Inside the main process (`main.js`), validate all incoming IPC arguments. Never trust inputs from the renderer. Verify types and structures (e.g., check that URLs are valid `https` endpoints) before writing to disk or calling OS functions.

---

## 3. WebView Preload Script ASAR Workaround (Crucial for Production)

In production, the application files are packed inside a virtual archive called `app.asar`. 

### The Problem:
Chromium's isolated guest process (running inside `<webview>`) cannot read files directly from inside the virtual `app.asar` archive under the `file://` protocol. If we point the webview's `preload` attribute directly to `src/main/webview-preload.js` inside the packaged app, the page will fail to load the preload script silently, breaking communications.

### The Solution:
On application startup, the Electron main process must copy the preload script from the virtual ASAR package to the physical filesystem (in the user's local application data directory) and resolve the absolute `file://` URL pointing to that unpacked copy.

#### Code Pattern (Main Process):
```javascript
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getWebviewPreloadPath() {
  const userDataPath = app.getPath('userData');
  const targetPath = path.join(userDataPath, 'volt-webview-preload.js');

  // Locate the source inside app.asar (or dev folder)
  const sourcePath = path.join(__dirname, 'webview-preload.js');

  try {
    // Copy the file from virtual ASAR to real filesystem
    fs.copyFileSync(sourcePath, targetPath);
    return `file://${targetPath.replace(/\\/g, '/')}`;
  } catch (err) {
    console.error('Failed to copy webview preload script:', err);
    return `file://${sourcePath.replace(/\\/g, '/')}`; // fallback
  }
}
```

This URL is passed to the React front-end during startup and injected into the `<webview>`'s `preload` property on the initial render.
