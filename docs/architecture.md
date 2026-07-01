# Volt Browser — Architectural Blueprint

This document defines the software design, component structure, and tech stack for **Volt Browser**, a modular and customizable workspace browser built using Electron, React 19, Vite, and TypeScript.

---

## 1. Technical Stack & Core Systems

Volt Browser is structured as a lightweight desktop container that integrates three core components:

1. **Host Environment (Electron + Node.js):** The main process (`main.js`) manages window lifecycles, operating system APIs, file reads/writes, and process isolation.
2. **User Interface (React 19 + TypeScript + Vite):** A responsive, dark-themed, glassmorphic layout mimicking macOS desktop applications. The UI functions as the desktop workspace container (managing shortcuts, local configuration, and views).
3. **Sandboxed Pages (Chromium WebViews):** Individual web applications (like Google Search Console, Google Analytics, Gmail) rendered inside `<webview>` tags.

---

## 2. Multi-Account Session Isolation

To resolve the primary constraint of logging into different Google accounts simultaneously without collisions, Volt Browser utilizes isolated Electron **session partitions**.

```
             +-----------------------------------------+
             |            Volt Browser Window          |
             +--------------------+--------------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
+--------v--------+                               +--------v--------+
|   Workspace A   |                               |   Workspace B   |
| (Session: A)    |                               | (Session: B)    |
|                 |                               |                 |
| +-------------+ |                               | +-------------+ |
| |  Webview 1  | |                               | |  Webview 3  | |
| |  (Gmail A)  | |                               | |  (Gmail B)  | |
| +-------------+ |                               | +-------------+ |
|                 |                               |                 |
| +-------------+ |                               | +-------------+ |
| |  Webview 2  | |                               | |  Webview 4  | |
| |   (GSC A)   | |                               | |   (GSC B)   | |
| +-------------+ |                               | +-------------+ |
+-----------------+                               +-----------------+
```

### Partitioning Rules:
* Each user-defined Google account/session is mapped to an isolated persistent partition: `persist:account_<id>` (e.g., `persist:account_1`).
* Webviews assigned to the same account/session ID share the same cookies, indexdb, and local storage (logging into Google once on any of these pages logs the user in on all other pages linked to the same session).
* Webviews assigned to different account/session IDs are completely isolated from each other.

---

## 3. WebView Performance & Memory Optimization

To keep the application highly performant and lightweight compared to standard Chrome instances, Volt Browser enforces two runtime strategies:

### Strategy A: Lazy Loading (On-Demand Mounting)
Do not mount all guest WebViews at startup. Mount a WebView only when the user clicks on the corresponding shortcut for the first time.
* Keep an `instantiatedShortcuts` state array inside React.
* Render the `<webview>` only if its shortcut ID is present in the `instantiatedShortcuts` list.

### Strategy B: Active/Inactive Toggling (Sizing vs. display:none)
To keep the websocket connections and page states alive without consuming GPU or rendering resources:
* **Never use `display: none` or conditional mounting** to hide an active WebView, as it triggers crash cycles or full page reloads.
* Toggle the CSS class `.hidden-webview` which shrinks the inactive WebView container to `width: 0px; height: 0px;` and applies `visibility: hidden; pointer-events: none;`.

---

## 4. Local-First Configuration Schema

All user shortcuts, profiles, and configurations are stored in the user's local directory under the filename `workspace-config.json`. No remote databases or user sign-ups are required.

### Specification (`workspace-config.json`):
```typescript
export interface SessionConfig {
  id: string;          // e.g., "session_1"
  name: string;        // e.g., "Conta Pessoal", "Cliente Furb"
}

export interface ShortcutConfig {
  id: string;          // Unique ID: "shortcut_171891"
  name: string;        // e.g., "Search Console"
  url: string;         // e.g., "https://search.google.com/search-console"
  sessionId: string;   // Reference to SessionConfig.id
  color: string;       // Hex color for sidebar representation
}

export interface UserConfig {
  version: string;
  sessions: SessionConfig[];
  shortcuts: ShortcutConfig[];
}
```
