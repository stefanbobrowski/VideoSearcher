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
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  return (
    <div className={styles.videoPreview}>
      <video
        ref={videoRef}
        src={url}
        controls
        onLoadedMetadata={handleLoadedMetadata}
        width="480"
      />
      {duration > 0 && timestamps.length > 0 && (
        <TimelineOverlay duration={duration} timestamps={timestamps} onSeek={handleSeek} />
      )}
    </div>
  );
};

export default VideoPreview;
