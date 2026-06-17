import React, { useRef } from 'react';
import { useSidebarStore } from './store';
import { toggleSidebar } from '../content/sidebar-injector';
import {
  IconBack,
  IconClose,
  IconNote,
  IconCode,
  IconClock,
  IconStar,
  IconClip,
  IconSave,
  IconRetry,
  IconCheck,
  IconLayers,
  IconChevronR,
  IconNotion,
  IconQueue
} from './components/Icons';

export const SidebarApp: React.FC = () => {
  const store = useSidebarStore();
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const {
    problemMetadata,
    isExistingProblem,
    existingAttemptCount,
    confidenceHistory,
    notes,
    capturedCode,
    capturedLanguage,
    timeComplexity,
    spaceComplexity,
    confidenceRating,
    clips,
    saveStatus,
    saveError,
    setNotes,
    captureCode,
    setTimeComplexity,
    setSpaceComplexity,
    setConfidenceRating,
    removeClip,
    clearClips,
    save
  } = store;

  // Handle case where no problem is detected/active yet
  if (!problemMetadata) {
    return (
      <div className="sb">
        <div className="sb-head">
          <IconBack onClick={() => toggleSidebar()} />
          <span className="sb-logo">LeetNote</span>
          <span style={{ marginLeft: 'auto' }}>
            <IconClose onClick={() => toggleSidebar()} />
          </span>
        </div>
        <div className="sb-disconnected">
          <IconNotion width={32} height={32} style={{ color: 'var(--txt3)' }} />
          <div className="sb-disc-title">No Problem Detected</div>
          <div className="sb-disc-sub">
            Navigate to a LeetCode problem description page (e.g. /problems/two-sum/) to start tracking.
          </div>
        </div>
      </div>
    );
  }

  const currentAttemptNumber = existingAttemptCount + 1;
  const diffClass =
    problemMetadata.difficulty === 'Easy'
      ? 'e'
      : problemMetadata.difficulty === 'Medium'
      ? 'm'
      : 'h';

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Maps rating score to node styling class
  const getRatingClass = (rating: number | null): string => {
    if (rating === null) return 'past-m';
    if (rating <= 2) return 'past-l';
    if (rating <= 4) return 'past-m';
    return 'past-h';
  };

  // Maps rating score to text label
  const getConfidenceText = (rating: number | null): string => {
    if (rating === null) return 'Rate this attempt';
    switch (rating) {
      case 1:
        return 'Very Low — review in 1 day';
      case 2:
        return 'Low — review in 3 days';
      case 3:
        return 'Medium — review in 7 days';
      case 4:
        return 'Good — review in 14 days';
      case 5:
        return 'Excellent — review in 30 days';
      default:
        return 'Rate this attempt';
    }
  };

  return (
    <div className="sb">
      {/* ── HEADER ── */}
      <div className="sb-head">
        <IconBack onClick={() => toggleSidebar()} />
        <span className="sb-logo">LeetNote</span>
        <div className="sb-prob">
          <span style={{ fontStyle: 'normal', color: 'var(--txt)', fontWeight: 600 }}>
            {problemMetadata.title} #{problemMetadata.number}
          </span>
          <span className={`diff ${diffClass}`}>{problemMetadata.difficulty}</span>
        </div>
        <IconClose onClick={() => toggleSidebar()} style={{ marginLeft: '6px' }} />
      </div>

      {/* ── REVISIT BANNER ── */}
      {isExistingProblem && (
        <div className="sb-banner">
          <IconLayers />
          <span>
            You've solved this before &mdash; saving as <strong>Attempt {currentAttemptNumber}</strong>
          </span>
          <span className="sb-banner-action" onClick={() => notesRef.current?.focus()}>
            Edit <IconChevronR />
          </span>
        </div>
      )}

      {/* ── ATTEMPT RAIL ── */}
      {isExistingProblem && confidenceHistory.length > 0 && (
        <div className="rail">
          <div className="rail-track">
            {confidenceHistory.map((attempt) => (
              <React.Fragment key={attempt.attemptNumber}>
                <div
                  className={`rail-node ${getRatingClass(attempt.rating)}`}
                  title={`Attempt ${attempt.attemptNumber}: Rating ${attempt.rating || 'N/A'}`}
                />
                <div className="rail-seg" />
              </React.Fragment>
            ))}
            <div className="rail-node now" title="Current Attempt" />
          </div>
          <div className="rail-info">
            {confidenceHistory.map((attempt) => (
              <div key={attempt.attemptNumber}>
                <strong>Attempt {attempt.attemptNumber}</strong> &nbsp;&middot;&nbsp;{' '}
                {formatDate(attempt.date)} &nbsp;&middot;&nbsp;{' '}
                {attempt.rating ? `Confidence: ${attempt.rating}/5` : 'No rating'}
              </div>
            ))}
            <div>
              <em>Attempt {currentAttemptNumber}</em> &nbsp;&middot;&nbsp; Now (current session)
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES ── */}
      <div className="sb-sec">
        <div className="sb-sh">
          <IconNote />
          My Notes
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={notesRef}
            className="nb-area"
            placeholder="Use a hash map to store seen values. Single pass O(n)..."
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="cc">{notes.length} / 2000</div>
        </div>
      </div>

      {/* ── SOLUTION CODE ── */}
      <div className="sb-sec">
        <div className="sb-sh">
          <IconCode />
          My Solution
        </div>
        <div className="code-wrap">
          <div className="code-bar">
            <span className="code-lang">{capturedLanguage || 'plain text'}</span>
            {capturedCode && <span className="code-stamp">auto &middot; just now</span>}
            <button className="cap-btn" onClick={() => captureCode()}>
              <IconSave width={11} height={11} />
              Capture
            </button>
          </div>
          {capturedCode ? (
            <div className="code-lines has-code">{capturedCode}</div>
          ) : (
            <div className="code-empty">No solution captured yet. Click Capture to grab.</div>
          )}
        </div>
      </div>

      {/* ── COMPLEXITY ── */}
      <div className="sb-sec">
        <div className="sb-sh">
          <IconClock />
          Complexity
        </div>
        <div className="cplx-row">
          <div className="cplx-box">
            <label>Time</label>
            <input
              type="text"
              className="cplx-input"
              placeholder="O(n)"
              value={timeComplexity}
              onChange={(e) => setTimeComplexity(e.target.value)}
            />
          </div>
          <div className="cplx-box">
            <label>Space</label>
            <input
              type="text"
              className="cplx-input"
              placeholder="O(n)"
              value={spaceComplexity}
              onChange={(e) => setSpaceComplexity(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── CONFIDENCE RATING ── */}
      <div className="sb-sec">
        <div className="sb-sh">
          <IconStar />
          Confidence
        </div>
        <div className="conf-row">
          {([1, 2, 3, 4, 5] as const).map((star) => {
            let starClass = 'empty';
            if (confidenceRating !== null && star <= confidenceRating) {
              if (confidenceRating <= 2) starClass = 'f0';
              else if (confidenceRating <= 4) starClass = 'f1';
              else starClass = 'f2';
            }
            return (
              <button
                key={star}
                className={`cnode ${starClass}`}
                onClick={() => setConfidenceRating(star === confidenceRating ? null : star)}
              >
                {star}
              </button>
            );
          })}
          <span className="conf-lbl">{getConfidenceText(confidenceRating)}</span>
        </div>
      </div>

      {/* ── COMMUNITY CLIPS ── */}
      <div className="sb-sec">
        <div className="sb-sh" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconClip />
            Clips ({clips.length})
          </span>
          {clips.length > 0 && (
            <span
              onClick={() => clearClips()}
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--err)',
                cursor: 'pointer',
                letterSpacing: '0.08em'
              }}
            >
              CLEAR ALL
            </span>
          )}
        </div>
        {clips.length > 0 ? (
          <div className="clips-list">
            {clips.map((clip) => (
              <div key={clip.id} className="clip-row">
                <span className="clip-ico">
                  {clip.isCode ? <IconCode width={12} height={12} /> : <IconClip width={12} height={12} />}
                </span>
                <div className="clip-body">
                  <div className="clip-txt" title={clip.text}>
                    "{clip.text}"
                  </div>
                  <div className="clip-src" title={clip.sourceUrl}>
                    {clip.isCode ? 'code' : 'text'} &middot; {clip.authorHandle || 'anonymous'}
                  </div>
                </div>
                <span className="clip-rm" onClick={() => removeClip(clip.id)}>
                  <IconClose width={11} height={11} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="clip-empty">
            No clippings saved. Use context menu on LeetCode discussions.
          </div>
        )}
      </div>

      {/* ── SAVE/SYNC CONTROL BUTTON ── */}
      {saveStatus === 'saving' && (
        <button className="save-btn saving">
          <IconRetry className="spinner ic" />
          Saving...
        </button>
      )}
      {saveStatus === 'success' && (
        <button className="save-btn ok">
          <IconCheck />
          Saved &mdash; Attempt {currentAttemptNumber}
        </button>
      )}
      {saveStatus === 'queued' && (
        <button className="save-btn queued" onClick={() => save()}>
          <IconQueue />
          Queued &mdash; will sync soon
        </button>
      )}
      {saveStatus === 'error' && (
        <button className="save-btn err" onClick={() => save()} title={saveError || 'Sync failed'}>
          <IconRetry />
          Retry Save
        </button>
      )}
      {saveStatus === 'idle' && (
        <button className="save-btn" onClick={() => save()}>
          <IconSave />
          Save {isExistingProblem ? `as Attempt ${currentAttemptNumber}` : 'to Notion'}
        </button>
      )}
    </div>
  );
};
