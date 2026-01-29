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

/**
 * Fetch with exponential backoff retry for handling 429 rate limit errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  onRetry?: (attempt: number, delay: number) => void,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // If not rate limited, return the response
      if (res.status !== 429) {
        return res;
      }

      // Rate limited - calculate backoff delay
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.warn(
        `⏰ Rate limited (429). Attempt ${attempt + 1}/${maxRetries}. Retrying in ${delay}ms...`,
      );

      if (onRetry) {
        onRetry(attempt + 1, delay);
      }

      // Wait before retrying
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      // On fetch error, retry if we haven't exceeded max retries
      if (attempt === maxRetries - 1) {
        throw err;
      }
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`Fetch error, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // All retries exhausted
  throw new Error('Max retries exceeded for rate-limited request');
}

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
      // Step 1: Get signed URL for direct upload to GCS
      console.log('📝 Step 1: Requesting signed upload URL...');

      const signedUrlRes = await fetch(`${API_URL}/generate-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!signedUrlRes.ok) {
        if (signedUrlRes.status === 401 || signedUrlRes.status === 403) {
          console.log('Authentication error, logging out...');
          logout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, gcsUri } = await signedUrlRes.json();
      console.log('✅ Got signed URL, uploading directly to GCS...');

      setProgress(10);

      // Step 2: Upload directly to GCS using signed URL
      console.log('📤 Step 2: Uploading video to GCS...');

      const uploadController = new AbortController();
      const uploadTimeout = setTimeout(() => uploadController.abort(), 10 * 60 * 1000); // 10 minute timeout

      const gcsUploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
        signal: uploadController.signal,
      })
        .then((res) => {
          clearTimeout(uploadTimeout);
          console.log('✅ Upload to GCS completed');
          return res;
        })
        .catch((err) => {
          clearTimeout(uploadTimeout);
          console.error('❌ Fetch error during GCS upload:', err);
          throw err;
        });

      if (!gcsUploadRes.ok) {
        throw new Error(`GCS upload failed: ${gcsUploadRes.statusText}`);
      }

      console.log('✅ Upload complete:', gcsUri);
      setProgress(50);

      // Step 3: Analyze the video (this can take 30-120 seconds)
      console.log('🔍 Step 3: Analyzing video with Gemini...');
      console.log('Request:', { gcsUri, prompt });

      const analyzeController = new AbortController();
      const analyzeTimeout = setTimeout(() => analyzeController.abort(), 5 * 60 * 1000); // 5 minute timeout

      const analyzeRes = await fetchWithRetry(
        `${API_URL}/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ gcsUri, prompt }),
          signal: analyzeController.signal,
        },
        3, // max 3 retries with exponential backoff
        (attempt, delay) => {
          setError(`Retrying analysis (attempt ${attempt}/3). Please wait ${delay / 1000}s...`);
        },
      ).catch((err) => {
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
