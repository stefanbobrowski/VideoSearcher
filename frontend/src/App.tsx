import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import VideoUploadForm from './components/VideoUploadForm';
// import SimpleUpload from './components/SimpleUpload';
import ErrorMessage from './components/ErrorMessage';
import LoaderSpinner from './components/LoaderSpinner';
import VideoPreview from './components/VideoPreview';
import LoginForm from './components/LoginForm';
import QuotaDisplay from './components/QuotaDisplay';
import styles from './App.module.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Debug section for testing API connectivity (Uncomment this and elements when debugging)
// function DebugSection() {
//   const [debugOutput, setDebugOutput] = useState('');

//   const callHealthcheck = async () => {
//     setDebugOutput('Checking backend health...');
//     try {
//       const res = await fetch(`${API_URL}/`);
//       const text = await res.text();
//       setDebugOutput(`✅ ${text}`);
//     } catch (err) {
//       setDebugOutput(`❌ Error: ${err}`);
//     }
//   };

//   const callTestGemini = async () => {
//     setDebugOutput('Testing Gemini AI...');
//     try {
//       const res = await fetch(`${API_URL}/test-gemini`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ prompt: 'Say hello!' }),
//       });
//       const data = await res.json();
//       setDebugOutput(`✅ Gemini: ${data.response || JSON.stringify(data)}`);
//     } catch (err) {
//       setDebugOutput(`❌ Error: ${err}`);
//     }
//   };

//   return (
//     <div className={styles.debugSection}>
//       <h3>🔧 API Connection Test</h3>
//       <button type="button" onClick={callHealthcheck}>
//         Healthcheck
//       </button>
//       <button type="button" onClick={callTestGemini}>
//         Test Gemini
//       </button>
//       <pre>{debugOutput}</pre>
//       <SimpleUpload />
//     </div>
//   );
// }

function App() {
  const { isAuthenticated, token, refreshQuota, setAuthFromCallback, logout } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysisText, setAnalysisText] = useState<string>('');

  // Handle OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('token');
    const email = params.get('email');
    const errorParam = params.get('error');

    if (errorParam) {
      console.error('OAuth error:', errorParam);
      setError(`Authentication failed: ${errorParam}`);
      // Clear URL params
      window.history.replaceState({}, document.title, '/');
      return;
    }

    if (authToken && email) {
      setAuthFromCallback(authToken, email);
      // Clear URL params
      window.history.replaceState({}, document.title, '/');
    }
  }, [setAuthFromCallback]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Placeholder for actual upload logic
  const handleUpload = async (file: File, prompt: string) => {
    console.log('🚀 Starting upload process...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      prompt,
    });
    console.log('API_URL:', API_URL);

    setUploading(true);
    setProgress(0);
    setError('');
    setResults([]);
    setAnalysisText('');
    setLoading(true);
    setFile(file);

    try {
      // Step 1: Upload the video file
      console.log('📤 Step 1: Uploading video to GCS...');
      const formData = new FormData();
      formData.append('video', file);

      console.log('Sending POST to:', `${API_URL}/upload`);
      console.log('FormData size:', file.size, 'bytes');
      console.log('File type:', file.type);
      console.log('File name:', file.name);
      console.log('About to call fetch...');

      const uploadController = new AbortController();
      const uploadTimeout = setTimeout(() => uploadController.abort(), 5 * 60 * 1000); // 5 minute timeout

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: uploadController.signal,
      })
        .then((res) => {
          clearTimeout(uploadTimeout);
          console.log('✅ Fetch completed, got response');
          return res;
        })
        .catch((err) => {
          clearTimeout(uploadTimeout);
          console.error('❌ Fetch error during upload:', err);
          console.error('Error name:', err.name);
          console.error('Error message:', err.message);
          throw err;
        });

      console.log('Upload response status:', uploadRes.status);

      if (!uploadRes.ok) {
        // Auto-logout on auth errors
        if (uploadRes.status === 401 || uploadRes.status === 403) {
          console.log('Authentication error during upload, logging out...');
          logout();
          throw new Error('Session expired. Please log in again.');
        }
        const errorText = await uploadRes.text();
        console.error('Upload failed with:', errorText);
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      const uploadData = await uploadRes.json();
      const gcsUri = uploadData.gcsUri;
      console.log('✅ Upload complete:', gcsUri);

      setProgress(50);

      // Step 2: Analyze the video (this can take 30-120 seconds)
      console.log('🔍 Step 2: Analyzing video with Gemini...');
      console.log('Request:', { gcsUri, prompt });

      const analyzeController = new AbortController();
      const analyzeTimeout = setTimeout(() => analyzeController.abort(), 5 * 60 * 1000); // 5 minute timeout

      const analyzeRes = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gcsUri, prompt }),
        signal: analyzeController.signal,
      }).catch((err) => {
        clearTimeout(analyzeTimeout);
        console.error('Fetch error during analysis:', err);
        throw err;
      });

      clearTimeout(analyzeTimeout);

      console.log('📥 Analysis response status:', analyzeRes.status);

      if (!analyzeRes.ok) {
        // Auto-logout on auth errors
        if (analyzeRes.status === 401 || analyzeRes.status === 403) {
          console.log('Authentication error during analysis, logging out...');
          logout();
          throw new Error('Session expired. Please log in again.');
        }
        // Check for rate limiting (429)
        if (analyzeRes.status === 429) {
          throw new Error(
            '⏰ Rate limit exceeded. Google Vertex AI has too many requests. Please wait 1-2 minutes and try again.',
          );
        }

        const errorText = await analyzeRes.text();
        console.error('Analysis failed:', errorText);
        throw new Error(`Analysis failed: ${analyzeRes.statusText} - ${errorText}`);
      }

      const analyzeData = await analyzeRes.json();
      console.log('✅ Analysis complete:', analyzeData);

      // Refresh quota after successful analysis
      await refreshQuota();

      setProgress(100);
      setUploading(false);
      setLoading(false);

      if (analyzeData.analysisText) {
        setAnalysisText(analyzeData.analysisText);
      } else {
        setAnalysisText('No analysisText returned.');
      }

      if (analyzeData.timestamps && Array.isArray(analyzeData.timestamps)) {
        setResults(analyzeData.timestamps);
      } else {
        setResults(['Analysis complete - check console for details']);
        console.log('Analysis results:', analyzeData);
      }
    } catch (err: any) {
      console.error('❌ Error during upload/analysis:', err);
      setUploading(false);
      setLoading(false);

      // Try to extract analysisText from error response if available
      if (err?.response) {
        try {
          const errorData = await err.response.json();
          if (errorData.analysisText) {
            setAnalysisText(errorData.analysisText);
          }
        } catch {}
      }

      if (
        err.name === 'TimeoutError' ||
        err.name === 'AbortError' ||
        err.message?.includes('signal timed out')
      ) {
        setError(
          'Request timed out after 5 minutes. Please try a shorter video or simpler prompt.',
        );
      } else {
        setError(err.message || 'An error occurred during upload or analysis');
      }
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1>
          <i>🎬</i> Video Searcher
        </h1>
        <p>Upload a video and let AI find the exact moments you're looking for.</p>
        <p>Get precise timestamps for headshots, kills, scores, and more.</p>
      </div>

      <QuotaDisplay />

      <div className={styles.mainContainer}>
        <VideoUploadForm onSubmit={handleUpload} uploading={uploading} progress={progress} />

        <section>
          <ErrorMessage message={error} />
          {analysisText && (
            <div className={styles.analysisText}>
              <strong>🤖 AI Analysis</strong>
              <div>{analysisText}</div>
            </div>
          )}
          {loading && <LoaderSpinner />}

          {file && <VideoPreview file={file} timestamps={results} />}
        </section>
      </div>

      <footer>
        <p>
          © 2025 Video Searcher | Built by{' '}
          <a href="https://stefanbobrowski.com" target="_blank" rel="noopener noreferrer">
            Stefan Bobrowski
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
