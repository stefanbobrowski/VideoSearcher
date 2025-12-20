import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthFromCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/?error=' + error);
      return;
    }

    if (token && email) {
      // Store auth data
      setAuthFromCallback(token, email);
      navigate('/');
    } else {
      navigate('/?error=missing_credentials');
    }
  }, [searchParams, navigate, setAuthFromCallback]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div className="loader" style={{ fontSize: '24px' }}>
        🔐
      </div>
      <p>Completing sign in...</p>
    </div>
  );
};

export default AuthCallback;
