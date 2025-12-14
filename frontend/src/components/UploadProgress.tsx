import React from 'react';
import styles from './UploadProgress.module.scss';

interface UploadProgressProps {
  progress: number; // 0-100
}

const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
  return (
    <div className={styles.uploadProgress}>
      <progress value={progress} max={100} />
      <span>{progress}%</span>
    </div>
  );
};

export default UploadProgress;
