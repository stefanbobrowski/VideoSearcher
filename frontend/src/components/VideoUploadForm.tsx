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
  const [prompt, setPrompt] = useState('');
  const [clipPadding, setClipPadding] = useState('1');
  const [maxResults, setMaxResults] = useState('');

  const examplePrompts = [
    'Find all headshots and start the clip before the sniper zooms in, and stop the clip after the headshot icon disappears',
    'Find all explosive kills and include the moment when the grenade is thrown',
    'Identify all weapon pickups and show a few seconds before the player reaches the weapon',
    'Find all double kills or multi-kills and start when the first enemy is spotted',
    'Locate all moments where a player scores or gets points, including the action that led to it',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const triggerFileInput = () => {
    document.getElementById('videoFile')?.click();
  };

  const buildPrompt = () => {
    let parts: string[] = [];

    if (prompt.trim()) {
      parts.push(prompt.trim());
    } else {
      parts.push('Find interesting moments in the video.');
    }

    if (clipPadding) {
      parts.push(`Include ${clipPadding} seconds of padding before and after each event.`);
    }

    if (maxResults) {
      parts.push(`Return at most ${maxResults} results.`);
    }

    parts.push('Provide timestamps in MM:SS format as ranges (start - end).');

    return parts.join(' ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onSubmit(file, buildPrompt());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.videoUploadForm}>
      <div className={styles.limitsInfo}>
        <strong>📋 Upload Limits:</strong>
        <ul>
          <li>
            Max file size: <span>200MB</span>
          </li>
          <li>
            Max video length: <span>10 minutes</span>
          </li>
          <li>
            Daily quota: <span>1 analysis</span>
          </li>
        </ul>
        <p className={styles.privacyNote}>
          🔒 Your video is automatically deleted after analysis for privacy and storage efficiency.
        </p>
      </div>

      <div
        className={`${styles.uploadZone} ${file ? styles.hasFile : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={triggerFileInput}
      >
        <input
          id="videoFile"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        {!file ? (
          <>
            <div className={styles.uploadIcon}>🎬</div>
            <p className={styles.uploadText}>
              <strong>Click to upload</strong> or drag and drop
            </p>
            <p className={styles.uploadHint}>MP4, MOV, AVI, or WebM (max 200MB)</p>
          </>
        ) : (
          <>
            <div className={styles.uploadIcon}>✓</div>
            <p className={styles.uploadText}>
              <strong>{file.name}</strong>
            </p>
            <p className={styles.uploadHint}>
              {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to change
            </p>
          </>
        )}
      </div>

      <label className={styles.label}>
        Describe What to Find <span className={styles.required}>*</span>
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., Find all headshots and start the clip before the sniper zooms in..."
        disabled={uploading}
        rows={5}
        className={styles.textarea}
      />
      <details className={styles.details}>
        <summary>💡 Example prompts</summary>
        <ul>
          {examplePrompts.map((example, idx) => (
            <li key={idx} onClick={() => setPrompt(example)}>
              {example}
            </li>
          ))}
        </ul>
      </details>

      <label className={styles.label}>
        Clip Settings <span className={styles.optional}>(optional)</span>
      </label>
      <div className={styles.clipSettings}>
        <div className={styles.inputGroup}>
          <label className={styles.smallLabel}>Padding (seconds)</label>
          <input
            type="number"
            min="0"
            max="30"
            step="0.5"
            value={clipPadding}
            onChange={(e) => setClipPadding(e.target.value)}
            placeholder="1"
            disabled={uploading}
            title="Extra seconds before/after each event (max 30 seconds)"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.smallLabel}>Max results</label>
          <input
            type="number"
            min="1"
            max="50"
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value)}
            placeholder="All"
            disabled={uploading}
            title="Maximum number of clips to find (max 50)"
          />
        </div>
      </div>

      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Analyzing video (may take 30-120 seconds)...' : 'Upload & Analyze'}
      </button>
      {uploading && <UploadProgress progress={progress} />}
    </form>
  );
};

export default VideoUploadForm;
