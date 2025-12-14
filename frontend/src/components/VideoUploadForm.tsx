import React, { useState } from 'react';
import UploadProgress from './UploadProgress';
import styles from './VideoUploadForm.module.scss';

interface VideoUploadFormProps {
  onSubmit: (file: File, prompt: string) => void;
  uploading: boolean;
  progress: number;
}

const VideoUploadForm: React.FC<VideoUploadFormProps> = ({ onSubmit, uploading, progress }) => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('Get all headshot timestamps');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onSubmit(file, prompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.videoUploadForm}>
      <input type="file" accept="video/*" onChange={handleFileChange} disabled={uploading} />
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe how to analyze the video"
        disabled={uploading}
      />
      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Submit'}
      </button>
      {uploading && <UploadProgress progress={progress} />}
    </form>
  );
};

export default VideoUploadForm;
