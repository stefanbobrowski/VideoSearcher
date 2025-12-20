import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function SimpleUpload() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setResult('');
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult('');
    setError('');
    const formData = new FormData();
    formData.append('video', file);
    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message);
    }
    setUploading(false);
  };

  return (
    <div style={{ border: '1px solid #aaa', padding: 16, margin: 16, maxWidth: 400 }}>
      <h3>Simple Upload Test</h3>
      <input type="file" accept="video/*" onChange={handleChange} />
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{ marginLeft: 8 }}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {result && <pre style={{ background: '#f5f5f5', marginTop: 12 }}>{result}</pre>}
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
    </div>
  );
}
