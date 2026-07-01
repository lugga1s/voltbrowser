import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Home, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Search, 
  Globe, 
  Trash2, 
  UserPlus, 
  ShieldAlert 
} from 'lucide-react';
import { UserConfig, ShortcutConfig, SessionConfig } from './electron-api';

const PREDEFINED_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6'  // Teal
];

export default function App() {
  // App Configurations
  const [config, setConfig] = useState<UserConfig>({
    version: "1.0.0",
    sessions: [
      { id: "session_default", name: "Conta Principal" }
    ],
    shortcuts: []
  });

  // Navigation State
  const [activeShortcutId, setActiveShortcutId] = useState<string | null>(null);
  const [instantiatedShortcuts, setInstantiatedShortcuts] = useState<string[]>([]);
  const [preloadPath, setPreloadPath] = useState<string>('');
  
  // URL address bar binding
  const [tempUrl, setTempUrl] = useState<string>('');
  const [currentUrls, setCurrentUrls] = useState<{ [shortcutId: string]: string }>({});

  // Modals Visibility
  const [showAddShortcutModal, setShowAddShortcutModal] = useState<boolean>(false);
  const [showManageSessionsModal, setShowManageSessionsModal] = useState<boolean>(false);

  // New Shortcut Form State
  const [newShortcutName, setNewShortcutName] = useState<string>('');
  const [newShortcutUrl, setNewShortcutUrl] = useState<string>('');
  const [newShortcutSessionId, setNewShortcutSessionId] = useState<string>('session_default');
  const [newShortcutColor, setNewShortcutColor] = useState<string>(PREDEFINED_COLORS[0]);

  // New Session Form State
  const [newSessionName, setNewSessionName] = useState<string>('');

  // Search Box Home State
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load configuration on startup
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const loadedConfig = await window.electronAPI.loadConfig();
        setConfig(loadedConfig);
        
        // Ensure default session exists
        if (!loadedConfig.sessions.some(s => s.id === 'session_default')) {
          const updated = {
            ...loadedConfig,
            sessions: [{ id: 'session_default', name: 'Conta Principal' }, ...loadedConfig.sessions]
          };
          setConfig(updated);
          await window.electronAPI.saveConfig(updated);
        }
      } catch (err) {
        console.error('Error loading config on startup:', err);
      }

      try {
        const path = await window.electronAPI.getWebviewPreloadPath();
        setPreloadPath(path);
      } catch (err) {
        console.error('Error loading webview preload path:', err);
      }
    };

    loadInitialData();
  }, []);

  // Update address bar input when active webview change
  useEffect(() => {
    if (activeShortcutId) {
      const current = currentUrls[activeShortcutId] || config.shortcuts.find(s => s.id === activeShortcutId)?.url || '';
      setTempUrl(current);
    } else {
      setTempUrl('');
    }
  }, [activeShortcutId, config.shortcuts, currentUrls]);

  // Watch and capture guest Webview events for address bar synchronization
  useEffect(() => {
    const webviews = document.querySelectorAll('webview');
    const listeners: { webview: Element, handler: any }[] = [];

    webviews.forEach((wv) => {
      const shortcutId = wv.getAttribute('data-id');
      if (!shortcutId) return;

      const updateUrl = (e: any) => {
        const navUrl = e.url;
        setCurrentUrls(prev => ({ ...prev, [shortcutId]: navUrl }));
        if (shortcutId === activeShortcutId) {
          setTempUrl(navUrl);
        }
      };

      wv.addEventListener('did-navigate', updateUrl);
      wv.addEventListener('did-navigate-in-page', updateUrl);
      
      listeners.push({ webview: wv, handler: updateUrl });
    });

    return () => {
      listeners.forEach(({ webview, handler }) => {
        try {
          webview.removeEventListener('did-navigate', handler);
          webview.removeEventListener('did-navigate-in-page', handler);
        } catch (err) {}
      });
    };
  }, [instantiatedShortcuts, activeShortcutId]);

  // Navigation Logic
  const handleShortcutClick = (id: string) => {
    setActiveShortcutId(id);
    if (!instantiatedShortcuts.includes(id)) {
      setInstantiatedShortcuts(prev => [...prev, id]);
    }
  };

  const handleHomeClick = () => {
    setActiveShortcutId(null);
  };

  // Webview Action Helpers
  const getActiveWebview = (): HTMLWebViewElement | null => {
    if (!activeShortcutId) return null;
    return document.querySelector(`webview[data-id="${activeShortcutId}"]`) as HTMLWebViewElement;
  };

  const handleGoBack = () => {
    const webview = getActiveWebview();
    if (webview && (webview as any).canGoBack()) {
      (webview as any).goBack();
    }
  };

  const handleGoForward = () => {
    const webview = getActiveWebview();
    if (webview && (webview as any).canGoForward()) {
      (webview as any).goForward();
    }
  };

  const handleReload = () => {
    const webview = getActiveWebview();
    if (webview) {
      (webview as any).reload();
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const webview = getActiveWebview();
    if (webview && tempUrl.trim()) {
      let targetUrl = tempUrl.trim();
      // Prefix http if missing
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      (webview as any).loadURL(targetUrl);
      setTempUrl(targetUrl);
    }
  };

  // Save new Shortcut configuration
  const handleAddShortcutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;

    let formattedUrl = newShortcutUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newShortcut: ShortcutConfig = {
      id: `shortcut_${Date.now()}`,
      name: newShortcutName.trim(),
      url: formattedUrl,
      sessionId: newShortcutSessionId,
      color: newShortcutColor
    };

    const updatedConfig = {
      ...config,
      shortcuts: [...config.shortcuts, newShortcut]
    };

    setConfig(updatedConfig);
    await window.electronAPI.saveConfig(updatedConfig);

    // Reset Form
    setNewShortcutName('');
    setNewShortcutUrl('');
    setNewShortcutSessionId(config.sessions[0]?.id || 'session_default');
    setNewShortcutColor(PREDEFINED_COLORS[0]);
    setShowAddShortcutModal(false);

    // Auto navigate to new shortcut
    handleShortcutClick(newShortcut.id);
  };

  // Remove Shortcut
  const handleRemoveShortcut = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filteredShortcuts = config.shortcuts.filter(s => s.id !== id);
    const updatedConfig = {
      ...config,
      shortcuts: filteredShortcuts
    };

    setConfig(updatedConfig);
    await window.electronAPI.saveConfig(updatedConfig);

    // If active was deleted, clear active view
    if (activeShortcutId === id) {
      setActiveShortcutId(null);
    }
    setInstantiatedShortcuts(prev => prev.filter(item => item !== id));
  };

  // Create new Account/Session isolation partition
  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    const newSession: SessionConfig = {
      id: `session_${Date.now()}`,
      name: newSessionName.trim()
    };

    const updatedConfig = {
      ...config,
      sessions: [...config.sessions, newSession]
    };

    setConfig(updatedConfig);
    await window.electronAPI.saveConfig(updatedConfig);
    setNewSessionName('');
  };

  // Delete Session configuration (and all linked shortcuts)
  const handleRemoveSession = async (id: string) => {
    if (id === 'session_default') return; // Cannot delete primary default account

    const filteredSessions = config.sessions.filter(s => s.id !== id);
    const filteredShortcuts = config.shortcuts.filter(s => s.sessionId !== id);
    
    const updatedConfig = {
      ...config,
      sessions: filteredSessions,
      shortcuts: filteredShortcuts
    };

    setConfig(updatedConfig);
    await window.electronAPI.saveConfig(updatedConfig);

    // Remove any webviews that were linked to deleted session shortcuts
    config.shortcuts.forEach(s => {
      if (s.sessionId === id) {
        setInstantiatedShortcuts(prev => prev.filter(item => item !== s.id));
        if (activeShortcutId === s.id) {
          setActiveShortcutId(null);
        }
      }
    });
  };

  // Homepage quick search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    // Add temporary search shortcut in configuration
    const newShortcut: ShortcutConfig = {
      id: `search_${Date.now()}`,
      name: `Busca: ${searchQuery}`,
      url: searchUrl,
      sessionId: 'session_default',
      color: '#a855f7' // Purple icon color for search shortcuts
    };

    const updatedConfig = {
      ...config,
      shortcuts: [...config.shortcuts, newShortcut]
    };

    setConfig(updatedConfig);
    window.electronAPI.saveConfig(updatedConfig);
    setSearchQuery('');
    
    handleShortcutClick(newShortcut.id);
  };

  const activeShortcut = config.shortcuts.find(s => s.id === activeShortcutId);
  const activeSessionName = activeShortcut 
    ? config.sessions.find(s => s.id === activeShortcut.sessionId)?.name 
    : '';

  return (
    <div className="app-container">
      {/* Draggable window frame top section */}
      <div className="sidebar-drag" />

      {/* Dock Sidebar */}
      <aside className="sidebar">
        {/* Home Button */}
        <button 
          className={`dock-item ${activeShortcutId === null ? 'active' : ''}`}
          onClick={handleHomeClick}
          title="Home Page"
        >
          <Home size={18} />
        </button>

        <div style={{ width: '24px', height: '1px', background: 'var(--border-color)', margin: '12px 0' }} />

        {/* Shortcuts list */}
        <div className="dock-icons">
          {config.shortcuts.map(shortcut => (
            <div
              key={shortcut.id}
              className={`dock-item ${activeShortcutId === shortcut.id ? 'active' : ''}`}
              onClick={() => handleShortcutClick(shortcut.id)}
              style={{ borderColor: shortcut.color }}
              title={`${shortcut.name} (${config.sessions.find(s => s.id === shortcut.sessionId)?.name || 'Default'})`}
            >
              <span style={{ color: shortcut.color }}>
                {shortcut.name.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}

          {/* Add Shortcut button */}
          <button 
            className="dock-item" 
            onClick={() => setShowAddShortcutModal(true)}
            title="Adicionar Atalho"
            style={{ borderStyle: 'dashed' }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Settings button */}
        <button 
          className="dock-item" 
          onClick={() => setShowManageSessionsModal(true)}
          title="Gerenciar Contas"
        >
          <Settings size={18} />
        </button>
      </aside>

      {/* Main Panel */}
      <main className="workspace">
        {activeShortcutId ? (
          <>
            {/* Header Address Bar controls */}
            <header className="top-header">
              <div className="header-actions">
                <button className="btn-icon" onClick={handleGoBack} title="Voltar">
                  <ArrowLeft size={16} />
                </button>
                <button className="btn-icon" onClick={handleGoForward} title="Avançar">
                  <ArrowRight size={16} />
                </button>
                <button className="btn-icon" onClick={handleReload} title="Recarregar">
                  <RotateCw size={16} />
                </button>
              </div>

              <div className="url-bar-container">
                <form className="url-form" onSubmit={handleUrlSubmit}>
                  <Globe className="url-icon" size={14} />
                  <input
                    type="text"
                    className="url-input"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="Digite um link para navegar..."
                  />
                </form>
              </div>

              <div className="header-badge-container">
                {activeSessionName && (
                  <div className="session-badge" title="Sessão de conta isolada">
                    <span className="session-dot" style={{ backgroundColor: activeShortcut?.color }} />
                    {activeSessionName}
                  </div>
                )}
                <button 
                  className="btn-icon" 
                  onClick={(e) => handleRemoveShortcut(activeShortcutId, e)}
                  title="Excluir Atalho"
                  style={{ color: 'var(--danger-color)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </header>

            {/* Guest WebView Rendering viewports */}
            <div className="view-port">
              {preloadPath && config.shortcuts.map(shortcut => {
                if (!instantiatedShortcuts.includes(shortcut.id)) return null;
                const isHidden = activeShortcutId !== shortcut.id;
                
                return (
                  <webview
                    key={shortcut.id}
                    data-id={shortcut.id}
                    src={shortcut.url}
                    partition={`persist:account_${shortcut.sessionId}`}
                    preload={preloadPath}
                    className={isHidden ? 'hidden-webview' : ''}
                  />
                );
              })}
            </div>
          </>
        ) : (
          /* Homepage Viewport */
          <div className="homepage">
            <div className="logo-container">
              <h1 className="logo-title">Volt Browser</h1>
              <p className="logo-subtitle">Ambiente modular de produtividade e isolamento de contas</p>
            </div>

            {/* Search Engine form */}
            <form className="home-search" onSubmit={handleSearchSubmit}>
              <Search className="home-search-icon" size={20} />
              <input
                type="text"
                className="home-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar no Google ou digitar endereço..."
              />
            </form>

            {/* Quick shortcuts grid */}
            {config.shortcuts.length > 0 && (
              <div className="shortcuts-grid">
                {config.shortcuts.map(shortcut => {
                  const sColor = shortcut.color;
                  return (
                    <div 
                      key={shortcut.id} 
                      className="grid-item"
                      onClick={() => handleShortcutClick(shortcut.id)}
                    >
                      <div 
                        className="grid-icon" 
                        style={{ 
                          backgroundColor: `${sColor}12`, 
                          color: sColor,
                          borderColor: `${sColor}33`
                        }}
                      >
                        {shortcut.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="grid-name">{shortcut.name}</div>
                      <div className="grid-account">
                        {config.sessions.find(s => s.id === shortcut.sessionId)?.name || 'Default'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Shortcut Modal */}
      {showAddShortcutModal && (
        <div className="modal-overlay" onClick={() => setShowAddShortcutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adicionar Novo Atalho</h3>
            </div>
            <form onSubmit={handleAddShortcutSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do site</label>
                <input
                  type="text"
                  className="form-input"
                  value={newShortcutName}
                  onChange={(e) => setNewShortcutName(e.target.value)}
                  placeholder="Ex: Gmail, Analytics"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endereço URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={newShortcutUrl}
                  onChange={(e) => setNewShortcutUrl(e.target.value)}
                  placeholder="Ex: https://gmail.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Conta de Sessão</label>
                <select
                  className="form-select"
                  value={newShortcutSessionId}
                  onChange={(e) => setNewShortcutSessionId(e.target.value)}
                >
                  {config.sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cor do Ícone</label>
                <div className="color-picker">
                  {PREDEFINED_COLORS.map(c => (
                    <div
                      key={c}
                      className={`color-option ${newShortcutColor === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewShortcutColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddShortcutModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Sessions Modal */}
      {showManageSessionsModal && (
        <div className="modal-overlay" onClick={() => setShowManageSessionsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Gerenciar Contas & Sessões</h3>
            </div>
            
            <div className="session-list">
              {config.sessions.map(s => (
                <div key={s.id} className="session-item">
                  <span className="session-item-name">{s.name}</span>
                  {s.id !== 'session_default' && (
                    <button 
                      className="btn-icon" 
                      onClick={() => handleRemoveSession(s.id)}
                      title="Excluir Conta (deleta atalhos vinculados)"
                      style={{ color: 'var(--danger-color)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSessionSubmit}>
              <div className="form-group">
                <label className="form-label">Nova Conta / Cliente</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="Ex: Cliente X, Conta Pessoal"
                  />
                  <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                    <UserPlus size={16} />
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)', marginTop: '20px' }}>
                <ShieldAlert size={18} style={{ color: 'var(--danger-color)', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: '1.2rem' }}>
                  Deletar uma conta/sessão fará com que todos os cookies e logins salvos associados a ela sejam removidos. Os atalhos associados a ela também serão excluídos.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowManageSessionsModal(false)}>
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
