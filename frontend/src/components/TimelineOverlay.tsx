import React from 'react';
import styles from './TimelineOverlay.module.scss';

interface TimelineOverlayProps {
  duration: number;
  timestamps: string[];
  onSeek: (seconds: number) => void;
}

function toSeconds(timestamp: string) {
  // Accepts MM:SS, HH:MM:SS, or M:SS
  const parts = timestamp.split(':').map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return NaN;
}

function parseTimestampRange(ts: string): { start: number; end: number } | null {
  // Try to parse range format: "MM:SS - MM:SS" or "MM:SS-MM:SS"
  const rangeMatch = ts.match(/([\d:]+)\s*-\s*([\d:]+)/);
  if (rangeMatch) {
    const start = toSeconds(rangeMatch[1].trim());
    const end = toSeconds(rangeMatch[2].trim());
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return { start, end };
    }
  }
  // If not a range, treat as a single timestamp (assume 3 second duration)
  const single = toSeconds(ts);
  if (Number.isFinite(single)) {
    return { start: single, end: single + 3 };
  }
  return null;
}

const TimelineOverlay: React.FC<TimelineOverlayProps> = ({ duration, timestamps, onSeek }) => {
  // Account for video player's timeline padding (typically 3% on each side)
  const TIMELINE_PADDING = 3; // percentage
  const TIMELINE_WIDTH = 94; // percentage of full width

  return (
    <div className={styles.timeline}>
      {timestamps.map((ts, idx) => {
        const range = parseTimestampRange(ts);
        if (!range || range.start < 0 || range.end > duration) return null;

        // Calculate position accounting for timeline padding
        const relativeStart = (range.start / duration) * TIMELINE_WIDTH;
        const relativeWidth = ((range.end - range.start) / duration) * TIMELINE_WIDTH;
        const left = TIMELINE_PADDING + relativeStart;

        return (
          <div
            key={idx}
            className={styles.marker}
            style={{ left: `${left}%`, width: `${relativeWidth}%` }}
            title={ts}
            tabIndex={0}
            role="button"
            aria-label={`Seek to ${ts}`}
            onClick={() => onSeek(range.start)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSeek(range.start)}
          />
        );
      })}
    </div>
  );
};

export default TimelineOverlay;
