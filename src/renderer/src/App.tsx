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
  ShieldAlert,
  Check,
  X,
  ExternalLink,
  Lock,
  Chrome
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
  const [newSessionColor, setNewSessionColor] = useState<string>(PREDEFINED_COLORS[0]);
  const [newSessionAutoLoginGoogle, setNewSessionAutoLoginGoogle] = useState<boolean>(false);
  const [manageSessionsModalView, setManageSessionsModalView] = useState<'grid' | 'add'>('grid');

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

    const newSessionId = `session_${Date.now()}`;
    const newSession: SessionConfig = {
      id: newSessionId,
      name: newSessionName.trim(),
      color: newSessionColor
    };

    let updatedShortcuts = [...config.shortcuts];
    let targetActiveShortcutId: string | null = null;

    if (newSessionAutoLoginGoogle) {
      const googleShortcutId = `google_login_${Date.now()}`;
      const googleShortcut: ShortcutConfig = {
        id: googleShortcutId,
        name: `Google Login`,
        url: 'https://accounts.google.com/',
        sessionId: newSessionId,
        color: newSessionColor
      };
      updatedShortcuts.push(googleShortcut);
      targetActiveShortcutId = googleShortcutId;
    }

    const updatedConfig = {
      ...config,
      sessions: [...config.sessions, newSession],
      shortcuts: updatedShortcuts
    };

    setConfig(updatedConfig);
    await window.electronAPI.saveConfig(updatedConfig);
    
    // Reset Form
    setNewSessionName('');
    setNewSessionColor(PREDEFINED_COLORS[0]);
    setNewSessionAutoLoginGoogle(false);
    setManageSessionsModalView('grid');
    setShowManageSessionsModal(false);

    // Navigate to Google Login if checked
    if (targetActiveShortcutId) {
      setActiveShortcutId(targetActiveShortcutId);
      if (!instantiatedShortcuts.includes(targetActiveShortcutId)) {
        setInstantiatedShortcuts(prev => [...prev, targetActiveShortcutId]);
      }
    }
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

  // Switch to clicked session shortcut or prompt shortcut addition
  const handleSessionCardClick = (sessionId: string) => {
    const sessionShortcuts = config.shortcuts.filter(s => s.sessionId === sessionId);
    setShowManageSessionsModal(false);
    setManageSessionsModalView('grid');
    
    if (sessionShortcuts.length > 0) {
      const firstShortcut = sessionShortcuts[0];
      setActiveShortcutId(firstShortcut.id);
      if (!instantiatedShortcuts.includes(firstShortcut.id)) {
        setInstantiatedShortcuts(prev => [...prev, firstShortcut.id]);
      }
    } else {
      // No shortcuts found, open Add Shortcut Modal with this session pre-selected
      setNewShortcutSessionId(sessionId);
      setShowAddShortcutModal(true);
    }
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
        <div className="modal-overlay" onClick={() => { setShowManageSessionsModal(false); setManageSessionsModalView('grid'); }}>
          <div 
            className={`modal-content ${manageSessionsModalView === 'grid' ? 'modal-large' : ''}`} 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            {/* Close Button in header */}
            <button 
              className="btn-icon" 
              onClick={() => { setShowManageSessionsModal(false); setManageSessionsModalView('grid'); }}
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20 }}
              title="Fechar"
            >
              <X size={18} />
            </button>

            {manageSessionsModalView === 'grid' ? (
              <div className="profile-dashboard">
                <div className="modal-header" style={{ marginBottom: '4px' }}>
                  <h3 className="modal-title">Gerenciar Perfis & Ambientes</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Cada perfil opera em um ambiente 100% isolado de cookies, logins e sessões.
                </p>

                <div className="profile-grid">
                  {config.sessions.map(s => {
                    const sColor = s.color || (s.id === 'session_default' ? '#6366f1' : PREDEFINED_COLORS[0]);
                    const shortcutsCount = config.shortcuts.filter(sh => sh.sessionId === s.id).length;
                    
                    return (
                      <div 
                        key={s.id} 
                        className="profile-card"
                        style={{ 
                          '--theme-color': sColor,
                          '--theme-color-glow': `${sColor}26`
                        } as React.CSSProperties}
                        onClick={() => handleSessionCardClick(s.id)}
                      >
                        <div className="profile-avatar-wrapper">
                          <div 
                            className="profile-avatar"
                            style={{ 
                              background: `linear-gradient(135deg, ${sColor}, ${sColor}88)`
                            }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <div className="profile-card-name" title={s.name}>
                          {s.name}
                        </div>

                        <div className="profile-card-desc">
                          {s.id === 'session_default' ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--accent-color)', fontWeight: 600 }}>
                              <Lock size={12} /> Principal
                            </span>
                          ) : (
                            shortcutsCount === 1 ? '1 atalho' : `${shortcutsCount} atalhos`
                          )}
                        </div>

                        <div className="profile-card-actions">
                          {s.id !== 'session_default' && (
                            <button 
                              className="btn-icon action-delete" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSession(s.id);
                              }}
                              title="Excluir Perfil (apaga atalhos vinculados)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button 
                            className="btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionCardClick(s.id);
                            }}
                            title="Abrir ambiente"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Profile Card */}
                  <div 
                    className="profile-card profile-card-add"
                    onClick={() => setManageSessionsModalView('add')}
                  >
                    <Plus size={24} className="profile-add-icon" />
                    <div className="profile-card-name" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      Criar Perfil
                    </div>
                    <div className="profile-card-desc" style={{ marginBottom: 0 }}>
                      Nova sandbox
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: 0 }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { setShowManageSessionsModal(false); setManageSessionsModalView('grid'); }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <div className="add-profile-view">
                <div className="modal-header">
                  <h3 className="modal-title">Adicionar Novo Perfil</h3>
                </div>

                <form onSubmit={handleAddSessionSubmit}>
                  <div className="form-group">
                    <label className="form-label">Nome do Perfil / Cliente</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="Ex: Cliente XPTO, Conta Trabalho"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cor de Identificação</label>
                    <div className="color-picker">
                      {PREDEFINED_COLORS.map(c => (
                        <div
                          key={c}
                          className={`color-option ${newSessionColor === c ? 'selected' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewSessionColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: '20px 0' }}>
                    <label className="checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={newSessionAutoLoginGoogle}
                        onChange={(e) => setNewSessionAutoLoginGoogle(e.target.checked)}
                      />
                      <span className="custom-checkbox">
                        {newSessionAutoLoginGoogle && <Check size={12} />}
                      </span>
                      <span className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Chrome size={14} style={{ color: '#ea4335' }} /> Fazer login no Google imediatamente
                      </span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)', marginBottom: '20px' }}>
                    <ShieldAlert size={18} style={{ color: 'var(--danger-color)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: '1.2rem' }}>
                      A exclusão de um perfil remove permanentemente todos os cookies, logins salvos e atalhos vinculados a ele.
                    </p>
                  </div>

                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setManageSessionsModalView('grid');
                        setNewSessionName('');
                        setNewSessionColor(PREDEFINED_COLORS[0]);
                        setNewSessionAutoLoginGoogle(false);
                      }}
                    >
                      Voltar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Criar Perfil
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
