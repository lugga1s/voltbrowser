const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable Chromium process-level sandboxing
app.enableSandbox();

let mainWindow = null;

// Copy webview-preload to userData to bypass ASAR restrictions for webview guest processes
function getWebviewPreloadPath() {
  const userDataPath = app.getPath('userData');
  const targetPath = path.join(userDataPath, 'volt-webview-preload.js');
  
  // In development, the file is in src/main/webview-preload.js
  // In production, files are packed inside app.asar/src/main/webview-preload.js
  const sourcePath = path.join(__dirname, 'webview-preload.js');

  try {
    fs.copyFileSync(sourcePath, targetPath);
    // Format path to be Chromium compatible (replace backslashes with forward slashes)
    const formattedPath = targetPath.replace(/\\/g, '/');
    return `file://${formattedPath}`;
  } catch (err) {
    console.error('Failed to copy webview preload script:', err);
    const formattedSource = sourcePath.replace(/\\/g, '/');
    return `file://${formattedSource}`;
  }
}

// User Config file path
const configFilePath = path.join(app.getPath('userData'), 'workspace-config.json');

// Helper to validate configuration schema
function validateConfig(config) {
  if (!config || typeof config !== 'object') return false;
  if (typeof config.version !== 'string') return false;
  if (!Array.isArray(config.sessions)) return false;
  if (!Array.isArray(config.shortcuts)) return false;
  
  // Validate sessions structure
  for (const s of config.sessions) {
    if (typeof s.id !== 'string' || typeof s.name !== 'string') return false;
  }
  
  // Validate shortcuts structure
  for (const s of config.shortcuts) {
    if (
      typeof s.id !== 'string' ||
      typeof s.name !== 'string' ||
      typeof s.url !== 'string' ||
      typeof s.sessionId !== 'string' ||
      typeof s.color !== 'string'
    ) {
      return false;
    }
    // Simple URL validation (ensure it starts with http/https)
    if (!s.url.startsWith('http://') && !s.url.startsWith('https://')) {
      return false;
    }
  }
  return true;
}

// Handle session creation to inject a standard modern browser User-Agent
app.on('will-create-session', (ses) => {
  ses.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Volt Browser",
    titleBarStyle: 'hidden', // frameless look for modern custom top-bar design
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#121212',
      symbolColor: '#a0a0a0',
      height: 35
    } : false,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true // allow <webview> guest browser elements
    }
  });

  // Load URL
  const isDirect = process.argv.includes('--direct');
  if (!app.isPackaged && !isDirect) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('load-config', async () => {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (validateConfig(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
  // Return default configuration if empty or invalid
  return {
    version: "1.0.0",
    sessions: [
      { id: "session_default", name: "Conta Principal" }
    ],
    shortcuts: []
  };
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    if (!validateConfig(config)) {
      throw new Error('Invalid config format');
    }
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    throw err;
  }
});

ipcMain.handle('get-webview-preload-path', async () => {
  return getWebviewPreloadPath();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
