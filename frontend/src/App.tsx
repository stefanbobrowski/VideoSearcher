import { useState } from 'react';
import VideoUploadForm from './components/VideoUploadForm';
import ResultsDisplay from './components/ResultsDisplay';
import ErrorMessage from './components/ErrorMessage';
import LoaderSpinner from './components/LoaderSpinner';
import VideoPreview from './components/VideoPreview';

// Debug section for manual API calls
function DebugSection() {
  const [debugOutput, setDebugOutput] = useState('');
  const [uploading, setUploading] = useState(false);

  // Healthcheck
  const callHealthcheck = async () => {
    setDebugOutput('Calling / ...');
    try {
      const res = await fetch('http://localhost:8080/');
      const text = await res.text();
      setDebugOutput(`GET /: ${text}`);
    } catch (err) {
      setDebugOutput('Error: ' + err);
    }
  };

  // Upload (uses a hardcoded small blob)
  const callUpload = async () => {
    setDebugOutput('Calling /upload ...');
    setUploading(true);
    try {
      const formData = new FormData();
      // Create a dummy file (empty mp4)
      const blob = new Blob([new Uint8Array([0, 0, 0, 0])], { type: 'video/mp4' });
      formData.append('video', blob, 'debug.mp4');
      const res = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      setDebugOutput(`POST /upload: ${text}`);
    } catch (err) {
      setDebugOutput('Error: ' + err);
    }
    setUploading(false);
  };

  // Analyze (uses dummy data)
  const callAnalyze = async () => {
    setDebugOutput('Calling /analyze ...');
    try {
      const res = await fetch('http://localhost:8080/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcsUri: 'gs://video-searcher-uploads/debug.mp4',
          prompt: 'Test prompt',
        }),
      });
      const text = await res.text();
      setDebugOutput(`POST /analyze: ${text}`);
    } catch (err) {
      setDebugOutput('Error: ' + err);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #aaa',
        padding: 16,
        marginBottom: 24,
        width: '100%',
        maxWidth: 600,
      }}
    >
      <h3>Debug API Endpoints</h3>
      <button onClick={callHealthcheck} style={{ marginRight: 8 }}>
        GET / (healthcheck)
      </button>
      <button onClick={callUpload} style={{ marginRight: 8 }} disabled={uploading}>
        POST /upload
      </button>
      <button onClick={callAnalyze}>POST /analyze</button>
      <pre
        style={{
          background: '#f5f5f5',
          color: '#c300ffff',
          marginTop: 12,
          padding: 8,
          minHeight: 40,
        }}
      >
        {debugOutput}
      </pre>
    </div>
  );
}

function App() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Placeholder for actual upload logic
  const handleUpload = (file: File, prompt: string) => {
    setUploading(true);
    setProgress(0);
    setError('');
    setResults([]);
    setLoading(true);
    setFile(file);
    // Simulate upload progress and result
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setTimeout(() => {
            setLoading(false);
            // Simulate success or error
            if (file.name.endsWith('.mp4')) {
              setResults(['00:00:10', '00:01:23', '00:02:45']);
            } else {
              setError('Unsupported file type. Please upload an MP4 video.');
            }
          }, 800);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    // Here you would actually upload the file and send the prompt to the backend
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}
    >
      <DebugSection />
      <h1>Video Searcher</h1>
      <p>
        Upload a video, provide a prompt, let us search the video and find the relevant moments for
        you.
      </p>
      <p>Returns timestamps of all relevant moments in the video.</p>
      <VideoUploadForm onSubmit={handleUpload} uploading={uploading} progress={progress} />
      <ErrorMessage message={error} />
      {loading && <LoaderSpinner />}
      {file && <VideoPreview file={file} timestamps={results} />}
      <ResultsDisplay results={results} />
    </div>
  );
}

export default App;
