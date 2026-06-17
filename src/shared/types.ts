// All Shared Type Definitions for LeetNote

export enum StorageKey {
  NOTION_TOKEN    = 'auth.notion_token_enc',
  DATABASE_ID     = 'auth.database_id',
  WORKSPACE_NAME  = 'auth.workspace_name',
  SHORTCUT        = 'settings.shortcut',
  SPACED_REP      = 'settings.spaced_rep_enabled',
  CLIPPING        = 'settings.clipping_enabled',
  AUTO_CAPTURE    = 'settings.auto_capture',
  SYNC_QUEUE      = 'runtime.sync_queue',
  SESSION_CLIPS   = 'runtime.session_clips',
  SESSION_DRAFT   = 'runtime.session_draft',
  ERROR_LOG       = 'debug.error_log',
  INSTALL_DATE    = 'meta.install_date',
  VERSION         = 'meta.version'
}

export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

export type MessageType =
  | 'SAVE_PROBLEM'
  | 'CHECK_EXISTING_ENTRY'
  | 'GET_QUEUE_STATUS'
  | 'RETRY_QUEUE'
  | 'CLEAR_QUEUE_ENTRY'
  | 'CLIP_ADD'
  | 'CLIP_REMOVE'
  | 'CLIP_LIST'
  | 'SIDEBAR_OPENED'
  | 'SIDEBAR_CLOSED'
  | 'PROBLEM_NAVIGATED'
  | 'NOTION_AUTH_START'
  | 'NOTION_AUTH_COMPLETE'
  | 'NOTION_DISCONNECT'
  | 'NOTION_LIST_PAGES'
  | 'NOTION_LIST_DATABASES'
  | 'NOTION_CREATE_DATABASE'
  | 'NOTION_VALIDATE_SCHEMA'
  | 'TOGGLE_SIDEBAR'
  | 'GET_SCRAPED_INFO'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS';

export interface MessageEnvelope<T = unknown> {
  type: MessageType;
  requestId: string;
  payload: T;
}

export interface ResponseEnvelope<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ProblemMetadata {
  title: string;
  number: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  url: string;
  acceptanceRate: number | null;
}

export interface SolutionDetails {
  code: string;
  language: string;
  timeComplexity: string;
  spaceComplexity: string;
  capturedAt: number;
}

export interface CommunityClip {
  id: string;
  text: string;
  isCode: boolean;
  sourceUrl: string;
  authorHandle: string | null;
  clippedAt: number;
}

export interface SaveProblemPayload {
  metadata: ProblemMetadata;
  solution: SolutionDetails;
  notes: string;
  clips: CommunityClip[];
  confidenceRating: 1 | 2 | 3 | 4 | 5 | null;
}

export interface SaveProblemResponse {
  status: 'synced' | 'queued' | 'failed';
  notionPageId?: string;
  attemptNumber: number;
  queueEntryId?: string;
  warnings: string[];
}

export interface CheckExistingPayload {
  problemNumber: number;
}

export interface CheckExistingResponse {
  exists: boolean;
  notionPageId: string | null;
  attemptCount: number;
  lastAttemptDate: string | null;
  confidenceHistory: Array<{
    attemptNumber: number;
    rating: number | null;
    date: string;
  }>;
}

export interface QueueEntry {
  id: string;
  payload: SaveProblemPayload;
  attempts: number;
  createdAt: number;
  lastAttemptAt: number | null;
  status: 'pending' | 'failed' | 'synced';
  lastError: string | null;
}

export interface QueueStatusResponse {
  totalPending: number;
  totalFailed: number;
  entries: Array<{
    id: string;
    problemTitle: string;
    problemNumber: number;
    createdAt: number;
    attempts: number;
    status: 'pending' | 'failed';
    lastError: string | null;
  }>;
}

export interface ClipAddPayload {
  text: string;
  isCode: boolean;
  sourceUrl: string;
  authorHandle: string | null;
}

export interface ClipAddResponse {
  clipId: string;
  totalClips: number;
  limitReached: boolean;
}

export interface ProblemNavigatedPayload {
  fromSlug: string | null;
  toSlug: string;
  toNumber: number | null;
}

export interface NotionAuthStartResponse {
  authUrl: string;
}

export interface NotionAuthCompletePayload {
  success: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  error: string | null;
}

export interface FullSettingsObject {
  keyboardShortcut: string;
  spacedRepEnabled: boolean;
  clippingEnabled: boolean;
  defaultLanguage: string;
  autoCapture: boolean;
}

export interface UpdateSettingsPayload {
  keyboardShortcut?: string;
  spacedRepEnabled?: boolean;
  clippingEnabled?: boolean;
  defaultLanguage?: string;
  autoCapture?: boolean;
}

export interface UpdateSettingsResponse {
  saved: boolean;
  settings: FullSettingsObject;
}

export interface ScrapeWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ScrapeResult {
  metadata: ProblemMetadata | null;
  code: string;
  language: string;
  warnings: ScrapeWarning[];
  scrapedAt: number;
}

export interface StorageSchema {
  [StorageKey.NOTION_TOKEN]: string;
  [StorageKey.DATABASE_ID]: string;
  [StorageKey.WORKSPACE_NAME]: string;
  [StorageKey.SHORTCUT]: string;
  [StorageKey.SPACED_REP]: boolean;
  [StorageKey.CLIPPING]: boolean;
  [StorageKey.AUTO_CAPTURE]: boolean;
  [StorageKey.SYNC_QUEUE]: QueueEntry[];
  [StorageKey.SESSION_CLIPS]: CommunityClip[];
  [StorageKey.SESSION_DRAFT]: Partial<SaveProblemPayload>;
  [StorageKey.ERROR_LOG]: string[];
  [StorageKey.INSTALL_DATE]: number;
  [StorageKey.VERSION]: string;
}
