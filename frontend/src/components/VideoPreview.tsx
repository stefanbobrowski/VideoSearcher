import React, { useEffect, useRef, useState } from 'react';
import TimelineOverlay from './TimelineOverlay';
import styles from './VideoPreview.module.scss';

interface VideoPreviewProps {
  file: File;
  timestamps?: string[];
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ file, timestamps = [] }) => {
  const [url, setUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (seconds: number) => {
    if (videoRef.current && Number.isFinite(seconds) && seconds >= 0 && seconds <= duration) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    } else {
      console.warn('Invalid seek time:', seconds);
    }
  };

  return (
    <div className={styles.videoPreview}>
      <div style={{ position: 'relative', width: '100%' }}>
        <video
          ref={videoRef}
          src={url || undefined}
          controls
          onLoadedMetadata={handleLoadedMetadata}
          style={{ width: '100%', display: 'block', borderRadius: 8 }}
        />
        {duration > 0 && timestamps.length > 0 && (
          <TimelineOverlay duration={duration} timestamps={timestamps} onSeek={handleSeek} />
        )}
      </div>
    </div>
  );
};

export default VideoPreview;
