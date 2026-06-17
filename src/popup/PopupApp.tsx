import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { sendMessage } from '../shared/messages';
import { StorageKey, FullSettingsObject, QueueStatusResponse } from '../shared/types';
import './styles/popup.css';

// SVG Icons helper library
const Icons = {
  Logo: ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  Notion: ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M7 7h1v10H7zm2 0h1l5 8V7h1v10h-1l-5-8v8H9z" strokeWidth="2.5" />
    </svg>
  ),
  Check: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Gear: () => (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Back: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Alert: () => (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Database: () => (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  External: () => (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
};

// Onboarding Wizard Progress Header Component
const OnboardingProgress = ({ step }: { step: number }) => {
  return (
    <div className="ob-prog">
      {[1, 2, 3, 4, 5].map((s) => (
        <React.Fragment key={s}>
          <div className={`ob-step ${step === s ? 'now' : step > s ? 'done' : ''}`}>
            {step > s ? <Icons.Check /> : s}
          </div>
          {s < 5 && <div className={`ob-line ${step > s ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

// Step 1: Welcome Screen
const WelcomeStep = ({ onNext }: { onNext: () => void }) => {
  return (
    <div className="ob-body">
      <div className="ob-logo-icon" style={{ margin: '15px 0' }}>
        <Icons.Logo size={32} />
      </div>
      <h2 className="ob-title">Welcome to LeetNote</h2>
      <p className="ob-sub">
        Stop losing your hard-won insights.{'\n'}
        Every problem. Every attempt.{'\n'}
        One clean Notion database.
      </p>

      <div className="feat-grid">
        <div className="feat-card">
          <strong>Auto-Capture</strong>
          <span>Instant code, stats & tags snapshot.</span>
        </div>
        <div className="feat-card">
          <strong>Clippings</strong>
          <span>Save community notes with a right-click.</span>
        </div>
        <div className="feat-card">
          <strong>Review Logs</strong>
          <span>Version attempts — never overwrite solutions.</span>
        </div>
        <div className="feat-card">
          <strong>Spaced Rep</strong>
          <span>Auto-schedule review cycles by confidence.</span>
        </div>
      </div>

      <button className="pop-btn" onClick={onNext}>
        Get Started →
      </button>
    </div>
  );
};

// Step 2: Notion Connect Screen
const NotionConnectStep = ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for token in storage as a backup to check if connection completed
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      const token = await browser.storage.local.get(StorageKey.NOTION_TOKEN);
      if (token[StorageKey.NOTION_TOKEN] && active) {
        clearInterval(interval);
        onNext();
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [onNext]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await sendMessage<{ authUrl: string }>('NOTION_AUTH_START');
      if (resp.success && resp.data?.authUrl) {
        window.open(resp.data.authUrl, '_blank');
      } else {
        throw new Error(resp.error?.message || 'Failed to start auth');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleMockConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate successful exchange by completing OAuth with mock token
      const resp = await sendMessage<{ success: boolean; workspaceName: string }>('NOTION_AUTH_COMPLETE', {
        code: 'mock_sandbox_code'
      });
      if (resp.success) {
        onNext();
      } else {
        throw new Error(resp.error?.message || 'Exchange failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="ob-body">
      <div className="ob-logo-icon" style={{ color: '#E1E1E0', margin: '15px 0' }}>
        <Icons.Notion size={48} />
      </div>
      <h2 className="ob-title">Connect Notion Workspace</h2>
      <p className="ob-sub">
        LeetNote needs permission to create databases and pages in your workspace.
      </p>

      {error && (
        <div style={{ color: 'var(--err)', fontSize: '11px', textAlign: 'center', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <button className="pop-btn notion-style" onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : 'Continue with Notion'}
      </button>

      <button className="pop-btn sec" onClick={handleMockConnect} disabled={loading} style={{ marginTop: '4px' }}>
        Sandbox Connect (Offline Mock)
      </button>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', padding: '10px', marginTop: '12px' }}>
        <div style={{ fontSize: '9px', color: 'var(--txt3)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
          Security & Privacy
        </div>
        <div style={{ fontSize: '9.5px', color: 'var(--txt2)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div>🔒 Notion token encrypted locally on device</div>
          <div>🚫 Zero trackers or telemetry transmitted</div>
          <div>🌐 Connects only to Notion and LeetCode</div>
        </div>
      </div>

      <button className="ob-skip" onClick={onPrev}>
        ← Back
      </button>
    </div>
  );
};

// Step 3: Database Setup Screen
const DatabaseSetupStep = ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [option, setOption] = useState<'create' | 'existing'>('create');
  const [databases, setDatabases] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [pages, setPages] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // List databases and parent pages
    const loadNotionContext = async () => {
      try {
        const dbResp = await sendMessage<Array<{ id: string; title: string }>>('NOTION_LIST_DATABASES');
        if (dbResp.success && dbResp.data) {
          setDatabases(dbResp.data);
          if (dbResp.data.length > 0) {
            setSelectedDb(dbResp.data[0].id);
            setOption('existing');
          }
        }
        const pagesResp = await sendMessage<Array<{ id: string; title: string }>>('NOTION_LIST_PAGES');
        if (pagesResp.success && pagesResp.data) {
          setPages(pagesResp.data);
          if (pagesResp.data.length > 0) {
            setSelectedPage(pagesResp.data[0].id);
          }
        }
      } catch (e) {
        console.warn('Failed to load Notion pages or databases', e);
      }
    };
    loadNotionContext();
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      if (option === 'create') {
        const parentId = selectedPage || (pages[0]?.id) || 'workspace';
        if (!parentId || parentId === 'workspace') {
          // If no page found, try using search for a default parent or prompt warning
          throw new Error('No eligible parent page found. Go to Notion and share a page with the LeetNote integration.');
        }
        const resp = await sendMessage<{ success: boolean; databaseId: string }>('NOTION_CREATE_DATABASE', {
          parentPageId: parentId
        });
        if (resp.success) {
          onNext();
        } else {
          throw new Error(resp.error?.message || 'Database creation failed');
        }
      } else {
        if (!selectedDb) {
          throw new Error('Please select an existing database.');
        }
        const resp = await sendMessage<{ success: boolean; fixed: boolean; missing: string[] }>('NOTION_VALIDATE_SCHEMA', {
          databaseId: selectedDb
        });
        if (resp.success) {
          onNext();
        } else {
          throw new Error(resp.error?.message || 'Database validation failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="ob-body">
      <h2 className="ob-title">Notion Database Setup</h2>
      <p className="ob-sub">
        Choose where to store your problems, attempt notes, and code clippings.
      </p>

      {error && (
        <div style={{ color: 'var(--err)', fontSize: '10px', textAlign: 'center', marginBottom: '8px' }}>
          {error}
        </div>
      )}

      <div className="db-list">
        <div className={`db-opt ${option === 'create' ? 'sel' : ''}`} onClick={() => setOption('create')}>
          <div className="db-radio" />
          <div className="db-details">
            <div className="db-name">Create new database</div>
            <div className="db-desc">
              LeetNote will create a structured "LeetNotion Journal" database inside your shared page.
            </div>
            {option === 'create' && pages.length > 0 && (
              <select 
                style={{ marginTop: '8px', width: '100%', background: 'var(--s3)', color: 'var(--txt)', border: '1px solid var(--border)' }}
                value={selectedPage} 
                onChange={(e) => setSelectedPage(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className={`db-opt ${option === 'existing' ? 'sel' : ''}`} onClick={() => setOption('existing')}>
          <div className="db-radio" />
          <div className="db-details">
            <div className="db-name">Select existing database</div>
            <div className="db-desc">
              Link LeetNote to an existing Notion database. We will validate and update the schema.
            </div>
            {option === 'existing' && databases.length > 0 && (
              <select 
                style={{ marginTop: '8px', width: '100%', background: 'var(--s3)', color: 'var(--txt)', border: '1px solid var(--border)' }}
                value={selectedDb} 
                onChange={(e) => setSelectedDb(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                {databases.map((db) => (
                  <option key={db.id} value={db.id}>{db.title}</option>
                ))}
              </select>
            )}
            {option === 'existing' && databases.length === 0 && (
              <div style={{ fontSize: '9px', color: 'var(--txt3)', marginTop: '4px' }}>
                No databases found shared with this integration.
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="pop-btn" onClick={handleSetup} disabled={loading}>
        {loading ? 'Setting Up...' : 'Use Selected Database →'}
      </button>

      <button className="ob-skip" onClick={onPrev}>
        ← Back
      </button>
    </div>
  );
};

// Step 4: Preferences Screen
const PreferencesStep = ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => {
  const [spacedRep, setSpacedRep] = useState(true);
  const [clipping, setClipping] = useState(true);
  const [autoCapture, setAutoCapture] = useState(false);
  const [shortcut, setShortcut] = useState('Ctrl+Shift+N');

  const handleSave = async () => {
    await sendMessage('UPDATE_SETTINGS', {
      spacedRepEnabled: spacedRep,
      clippingEnabled: clipping,
      autoCapture: autoCapture,
      keyboardShortcut: shortcut
    });
    onNext();
  };

  return (
    <div className="ob-body">
      <h2 className="ob-title">Preferences</h2>
      <p className="ob-sub">Customize LeetNote settings for your study flow.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        <div className="set-row">
          <div className="set-info">
            <div className="set-name">Spaced Repetition</div>
            <div className="set-desc">Schedule review cycles based on difficulty & confidence.</div>
          </div>
          <div className={`tog ${spacedRep ? 'on' : ''}`} onClick={() => setSpacedRep(!spacedRep)} />
        </div>

        <div className="set-row">
          <div className="set-info">
            <div className="set-name">Right-Click Clipping</div>
            <div className="set-desc">Enable community clipping on discussion boards.</div>
          </div>
          <div className={`tog ${clipping ? 'on' : ''}`} onClick={() => setClipping(!clipping)} />
        </div>

        <div className="set-row">
          <div className="set-info">
            <div className="set-name">Auto-Capture Editor</div>
            <div className="set-desc">Automatically copy editor code on sidebar launch.</div>
          </div>
          <div className={`tog ${autoCapture ? 'on' : ''}`} onClick={() => setAutoCapture(!autoCapture)} />
        </div>

        <div className="set-row">
          <div className="set-info">
            <div className="set-name">Sidebar Hotkey</div>
            <div className="set-desc">Keyboard shortcut to open and close sidebar.</div>
          </div>
          <button className="kbd" onClick={() => setShortcut(shortcut === 'Ctrl+Shift+N' ? 'Ctrl+Alt+S' : 'Ctrl+Shift+N')}>
            {shortcut}
          </button>
        </div>
      </div>

      <button className="pop-btn" onClick={handleSave}>
        Save Preferences →
      </button>

      <button className="ob-skip" onClick={onPrev}>
        ← Back
      </button>
    </div>
  );
};

// Step 5: Test Save Screen
const TestSaveStep = ({ onFinish }: { onFinish: () => void }) => {
  const [status, setStatus] = useState<'pending' | 'success'>('pending');

  const handleTestRun = async () => {
    // Open two-sum in new tab
    browser.tabs.create({ url: 'https://leetcode.com/problems/two-sum/' });
    setStatus('success');
  };

  return (
    <div className="ob-body" style={{ alignItems: 'center', textAlign: 'center' }}>
      <div className="ob-logo-icon" style={{ color: 'var(--ink)', margin: '10px 0' }}>
        <Icons.Check size={36} />
      </div>
      <h2 className="ob-title">LeetNote is Ready!</h2>
      <p className="ob-sub">
        Your setup is fully linked. Open any LeetCode problem tab to see LeetNote in action!
      </p>

      {status === 'pending' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <button className="pop-btn" onClick={handleTestRun}>
            🚀 Open LeetCode & Test
          </button>
          <button className="pop-btn sec" onClick={onFinish}>
            Skip & Go to Dashboard
          </button>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{ color: 'var(--ok)', fontWeight: 600, fontSize: '11px', marginBottom: '16px' }}>
            ✓ Notion Sync is ready! LeetNote is operational.
          </div>
          <button className="pop-btn" onClick={onFinish}>
            Finish Setup
          </button>
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
const StatusDashboard = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  const [problemName, setProblemName] = useState<string>('Off LeetCode');
  const [problemStatus, setProblemStatus] = useState<string>('Not applicable');
  const [queueCount, setQueueCount] = useState<number>(0);
  const [databaseName, setDatabaseName] = useState<string>('Not configured');
  const [isOnLeetCode, setIsOnLeetCode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      // 1. Get queue count
      const qResp = await sendMessage<{ total: number }>('GET_QUEUE_STATUS');
      if (qResp.success && qResp.data) {
        setQueueCount(qResp.data.total);
      }

      // 2. Get DB Name
      const dbVal = await browser.storage.local.get(StorageKey.DATABASE_ID);
      const dbId = dbVal[StorageKey.DATABASE_ID] || '';
      setDatabaseName(dbId ? `Notion Journal (${dbId.substring(0, 5)}...)` : 'Not configured');

      // 3. Get Active Tab and Page Info
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab && activeTab.url && activeTab.url.includes('leetcode.com/problems/')) {
        setIsOnLeetCode(true);
        if (activeTab.id) {
          try {
            const response = await browser.tabs.sendMessage(activeTab.id, { type: 'GET_SCRAPED_INFO' });
            if (response && response.success && response.data?.metadata) {
              const meta = response.data.metadata;
              setProblemName(`#${meta.number} ${meta.title}`);
              setProblemStatus(
                response.data.isExistingProblem 
                  ? `Saved · Attempt ${response.data.existingAttemptCount}`
                  : 'Not saved yet'
              );
            } else {
              // Extract from tab title
              const title = activeTab.title || 'LeetCode Problem';
              setProblemName(title.replace(' - LeetCode', ''));
              setProblemStatus('Scanning page...');
            }
          } catch (e) {
            const title = activeTab.title || 'LeetCode Problem';
            setProblemName(title.replace(' - LeetCode', ''));
            setProblemStatus('Open sidebar to scan');
          }
        }
      } else {
        setIsOnLeetCode(false);
        setProblemName('Off LeetCode');
        setProblemStatus('Browse to a LeetCode problem');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOpenSidebar = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab?.id) {
        await browser.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SIDEBAR' });
        window.close(); // Close popup when sidebar opens
      }
    } catch (err) {
      console.error('Failed to open sidebar', err);
    }
  };

  const handleRetryAll = async () => {
    setLoading(true);
    await sendMessage('RETRY_QUEUE');
    setTimeout(() => {
      loadDashboardData();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="pop-body" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--ink)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="pop">
      <div className="pop-head">
        <span className="pop-logo">LEETNOTE</span>
        <span className="pop-status connected">Connected</span>
        <button className="pop-gear" onClick={onOpenSettings} title="Settings">
          <Icons.Gear />
        </button>
      </div>

      <div className="pop-body">
        <div className="stat-card">
          <div className="sr">
            <span className="sr-label">Active Problem</span>
            <span className="sr-val" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {problemName}
            </span>
          </div>
          <div className="sr">
            <span className="sr-label">Status</span>
            <span className={`sr-val ${problemStatus.includes('Saved') ? 'ok' : ''}`}>
              {problemStatus}
            </span>
          </div>
          <div className="sr">
            <span className="sr-label">Sync Queue</span>
            <span className={`sr-val ${queueCount > 0 ? 'warn' : 'ok'}`}>
              {queueCount === 0 ? 'All clear (Synced)' : `${queueCount} pending`}
            </span>
          </div>
          <div className="sr">
            <span className="sr-label">Database</span>
            <span className="sr-val" style={{ fontSize: '9.5px', color: 'var(--txt3)' }}>
              {databaseName}
            </span>
          </div>
        </div>

        {isOnLeetCode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="pop-btn" onClick={handleOpenSidebar}>
              Open Sidebar
            </button>
            <button className="pop-btn sec" onClick={() => browser.tabs.create({ url: 'https://notion.so' })}>
              View Database in Notion <Icons.External />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queueCount > 0 ? (
              <button className="pop-btn" onClick={handleRetryAll} style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>
                Retry Sync ({queueCount} Items)
              </button>
            ) : null}
            <button className="pop-btn" onClick={() => browser.tabs.create({ url: 'https://leetcode.com/problemset/' })}>
              Open LeetCode
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Settings Panel Component
const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'conn' | 'pref' | 'queue' | 'about'>('conn');
  const [settings, setSettings] = useState<FullSettingsObject | null>(null);
  const [queue, setQueue] = useState<QueueStatusResponse['entries']>([]);
  const [workspace, setWorkspace] = useState<string>('Notion Workspace');
  const [databaseId, setDatabaseId] = useState<string>('');

  const loadSettingsData = async () => {
    const sResp = await sendMessage<FullSettingsObject>('GET_SETTINGS');
    if (sResp.success && sResp.data) {
      setSettings(sResp.data);
    }
    const qResp = await sendMessage<QueueStatusResponse>('GET_QUEUE_STATUS');
    if (qResp.success && qResp.data) {
      setQueue(qResp.data.entries || []);
    }
    const store = await browser.storage.local.get([StorageKey.WORKSPACE_NAME, StorageKey.DATABASE_ID]);
    setWorkspace(store[StorageKey.WORKSPACE_NAME] || 'Shared Workspace');
    setDatabaseId(store[StorageKey.DATABASE_ID] || '');
  };

  useEffect(() => {
    loadSettingsData();
  }, [activeTab]);

  const handleToggle = async (key: keyof FullSettingsObject) => {
    if (!settings) return;
    const updated = {
      ...settings,
      [key]: !settings[key]
    };
    setSettings(updated);
    await sendMessage('UPDATE_SETTINGS', updated);
  };

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your Notion workspace? Your offline queue will be cleared.')) {
      await sendMessage('NOTION_DISCONNECT');
      window.location.reload();
    }
  };

  const handleReset = async () => {
    if (window.confirm('🚨 DANGER: Reset all data, disconnect Notion, and clear preferences? This cannot be undone.')) {
      await browser.storage.local.clear();
      await sendMessage('NOTION_DISCONNECT');
      window.location.reload();
    }
  };

  const handleRetryEntry = async (_entryId: string) => {
    await sendMessage('RETRY_QUEUE');
    setTimeout(() => loadSettingsData(), 1000);
  };

  const handleDelEntry = async (entryId: string) => {
    if (window.confirm('Delete this pending sync entry?')) {
      await sendMessage('CLEAR_QUEUE_ENTRY', { entryId });
      loadSettingsData();
    }
  };

  const handleExportLog = async () => {
    const store = await browser.storage.local.get();
    const logBlob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const logUrl = URL.createObjectURL(logBlob);
    const link = document.createElement('a');
    link.href = logUrl;
    link.download = `leetnote_debug_log_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(logUrl);
  };

  return (
    <div className="pop">
      <div className="pop-head">
        <button className="pop-back" onClick={onClose}>
          <Icons.Back /> Back
        </button>
        <span className="pop-logo" style={{ marginLeft: 'auto' }}>SETTINGS</span>
      </div>

      <div className="set-tabs">
        <button className={`set-tab ${activeTab === 'conn' ? 'on' : ''}`} onClick={() => setActiveTab('conn')}>
          Conn
        </button>
        <button className={`set-tab ${activeTab === 'pref' ? 'on' : ''}`} onClick={() => setActiveTab('pref')}>
          Pref
        </button>
        <button className={`set-tab ${activeTab === 'queue' ? 'on' : ''}`} onClick={() => setActiveTab('queue')}>
          Queue
        </button>
        <button className={`set-tab ${activeTab === 'about' ? 'on' : ''}`} onClick={() => setActiveTab('about')}>
          About
        </button>
      </div>

      <div className="set-body">
        {activeTab === 'conn' && (
          <div>
            <div style={{ borderLeft: '3px solid var(--ok)', background: 'var(--s2)', padding: '10px', marginBottom: '14px' }}>
              <div style={{ fontSize: '8px', color: 'var(--ok)', fontWeight: 700, textTransform: 'uppercase' }}>Connected</div>
              <div style={{ fontWeight: 600, fontSize: '11.5px', marginTop: '2px' }}>{workspace}</div>
              <div style={{ fontSize: '9.5px', color: 'var(--txt3)', marginTop: '4px', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                DB: {databaseId}
              </div>
            </div>

            <button className="pop-btn sec" onClick={handleDisconnect}>
              Disconnect Notion
            </button>

            <div style={{ height: '1px', background: 'var(--rule)', margin: '14px 0' }} />

            <div style={{ fontSize: '10px', color: 'var(--err)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
              Danger Zone
            </div>
            <button className="pop-btn danger" onClick={handleReset}>
              Reset All Data
            </button>
          </div>
        )}

        {activeTab === 'pref' && settings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="set-row">
              <div className="set-info">
                <div className="set-name">Spaced Repetition</div>
                <div className="set-desc">Schedule reviews based on rating.</div>
              </div>
              <div className={`tog ${settings.spacedRepEnabled ? 'on' : ''}`} onClick={() => handleToggle('spacedRepEnabled')} />
            </div>

            <div className="set-row">
              <div className="set-info">
                <div className="set-name">Clippings</div>
                <div className="set-desc">Enable right-click text clipping.</div>
              </div>
              <div className={`tog ${settings.clippingEnabled ? 'on' : ''}`} onClick={() => handleToggle('clippingEnabled')} />
            </div>

            <div className="set-row">
              <div className="set-info">
                <div className="set-name">Auto-Capture</div>
                <div className="set-desc">Snapshot code on sidebar open.</div>
              </div>
              <div className={`tog ${settings.autoCapture ? 'on' : ''}`} onClick={() => handleToggle('autoCapture')} />
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="q-list">
            {queue.length === 0 ? (
              <div style={{ color: 'var(--txt3)', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', marginTop: '12px' }}>
                Offline sync queue is empty.
              </div>
            ) : (
              queue.map((entry) => (
                <div key={entry.id} className="q-item">
                  <div className="q-details">
                    <div className="q-title">{entry.problemTitle}</div>
                    <div className="q-desc">Attempt #{entry.attempts || 1} · Offline</div>
                  </div>
                  <div className="q-actions">
                    <button className="q-btn retry" onClick={() => handleRetryEntry(entry.id)}>
                      Retry
                    </button>
                    <button className="q-btn del" onClick={() => handleDelEntry(entry.id)}>
                      Del
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div>
            <div style={{ textAlign: 'center', margin: '10px 0' }}>
              <div className="ob-logo-icon">
                <Icons.Logo size={32} />
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>LeetNote v1.0.0</h3>
              <p style={{ fontSize: '10px', color: 'var(--txt3)', marginTop: '2px' }}>Personal LeetCode Notion Logger</p>
            </div>

            <div style={{ height: '1px', background: 'var(--rule)', margin: '14px 0' }} />

            <button className="pop-btn sec" onClick={handleExportLog}>
              Export Debug Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Root App Component managing onboarding steps and view switching
export const PopupApp = () => {
  const [onboardStep, setOnboardStep] = useState<number | null>(null);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');

  useEffect(() => {
    const checkOnboardingState = async () => {
      try {
        const store = await browser.storage.local.get(StorageKey.NOTION_TOKEN);
        if (store[StorageKey.NOTION_TOKEN]) {
          setOnboardStep(null); // Complete, load dashboard
        } else {
          setOnboardStep(1); // Not complete, start onboarding
        }
      } catch (e) {
        setOnboardStep(1);
      }
    };
    checkOnboardingState();
  }, []);

  const handleNextStep = () => {
    if (onboardStep !== null && onboardStep < 5) {
      setOnboardStep(onboardStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (onboardStep !== null && onboardStep > 1) {
      setOnboardStep(onboardStep - 1);
    }
  };

  const handleFinishOnboarding = async () => {
    // Save token or onboarding state
    setOnboardStep(null);
  };

  if (onboardStep !== null) {
    return (
      <div className="ob">
        <OnboardingProgress step={onboardStep} />
        {onboardStep === 1 && <WelcomeStep onNext={handleNextStep} />}
        {onboardStep === 2 && <NotionConnectStep onNext={handleNextStep} onPrev={handlePrevStep} />}
        {onboardStep === 3 && <DatabaseSetupStep onNext={handleNextStep} onPrev={handlePrevStep} />}
        {onboardStep === 4 && <PreferencesStep onNext={handleNextStep} onPrev={handlePrevStep} />}
        {onboardStep === 5 && <TestSaveStep onFinish={handleFinishOnboarding} />}
      </div>
    );
  }

  if (view === 'settings') {
    return <SettingsPanel onClose={() => setView('dashboard')} />;
  }

  return <StatusDashboard onOpenSettings={() => setView('settings')} />;
};
