export interface SessionConfig {
  id: string;
  name: string;
}

export interface ShortcutConfig {
  id: string;
  name: string;
  url: string;
  sessionId: string;
  color: string;
}

export interface UserConfig {
  version: string;
  sessions: SessionConfig[];
  shortcuts: ShortcutConfig[];
}

export interface ElectronAPI {
  loadConfig: () => Promise<UserConfig>;
  saveConfig: (config: UserConfig) => Promise<boolean>;
  getWebviewPreloadPath: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
