import React from 'react';
import styles from './TimelineOverlay.module.scss';

interface TimelineOverlayProps {
  duration: number;
  timestamps: string[];
  onSeek: (seconds: number) => void;
}

function toSeconds(timestamp: string) {
  const [h, m, s] = timestamp.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

const TimelineOverlay: React.FC<TimelineOverlayProps> = ({ duration, timestamps, onSeek }) => {
  return (
    <div className={styles.timeline}>
      {timestamps.map((ts, idx) => {
        const seconds = toSeconds(ts);
        const left = (seconds / duration) * 100;
        return (
          <div
            key={idx}
            className={styles.marker}
            style={{ left: `${left}%` }}
            title={ts}
            onClick={() => onSeek(seconds)}
          />
        );
      })}
    </div>
  );
};

export default TimelineOverlay;
