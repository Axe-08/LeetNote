// App-wide constants for LeetNote

export const NOTION_API_BASE = 'https://api.notion.com/v1';
export const NOTION_API_VERSION = '2022-06-28';

export const MAX_CLIPS_PER_PROBLEM = 10;
export const MAX_ATTEMPTS_PER_PROBLEM = 20;
export const MAX_QUEUE_ENTRIES = 100;
export const MAX_RETRY_ATTEMPTS = 5;

export const QUEUE_FLUSH_INTERVAL_MINUTES = 2;
export const MIN_SAVE_INTERVAL_MS = 5000;
export const DEBOUNCE_CODE_CAPTURE_MS = 2000;
export const NOTION_RATE_LIMIT_DELAY_MS = 400;
export const NOTION_429_BACKOFF_MS = 10000;

export const SIDEBAR_WIDTH_DEFAULT = 360;
export const SIDEBAR_WIDTH_MIN = 280;
export const SIDEBAR_WIDTH_MAX = 480;
export const SIDEBAR_ANIMATION_MS = 180;

export const TOAST_AUTO_DISMISS_MS = 4000;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_TOASTS_VISIBLE = 3;

export const ERROR_LOG_MAX_ENTRIES = 50;
export const DEFAULT_KEYBOARD_SHORTCUT = 'Ctrl+Shift+N';

export const SPACED_REP_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,   // review tomorrow
  2: 3,   // review in 3 days
  3: 7,   // review in 7 days
  4: 14,  // review in 14 days
  5: 30   // review in 30 days
};

export const LANGUAGE_MAP: Record<string, string> = {
  python3: 'python',
  python: 'python',
  java: 'java',
  cpp: 'c++',
  c: 'c',
  csharp: 'c#',
  javascript: 'javascript',
  typescript: 'typescript',
  golang: 'go',
  go: 'go',
  rust: 'rust',
  kotlin: 'kotlin',
  swift: 'swift',
  php: 'php',
  ruby: 'ruby',
  scala: 'scala',
  typescriptreact: 'typescript',
  javascriptreact: 'javascript'
};
