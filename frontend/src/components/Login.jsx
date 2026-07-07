import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // State for handling alerts (success/error)
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' }); // Reset previous messages

    if (!isLogin && password !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords do not match" });
      return;
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { username, email, password };
      const res = await axios.post(`${backendUrl}${endpoint}`, payload);
      
      // The register endpoint does not return a token.
      if (!isLogin && res.status === 201) {
          setMessage({ type: 'success', text: 'Registration successful! Please sign in.' });
          setIsLogin(true);
          // Clear sensitive fields
          setPassword('');
          setConfirmPassword('');
          return;
      }
      
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        navigate('/');
      }
    } catch (error) {
      // Catch backend errors perfectly and show them in the UI
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Authentication failed. Please check your network and credentials.';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
      background: 'radial-gradient(circle at center, #1a1a2e 0%, #16213e 100%)'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        width: '350px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Custom Alert Message */}
        {message.text && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: message.type === 'error' ? 'rgba(255, 75, 75, 0.1)' : 'rgba(76, 175, 80, 0.1)',
            border: `1px solid ${message.type === 'error' ? 'rgba(255, 75, 75, 0.5)' : 'rgba(76, 175, 80, 0.5)'}`,
            color: message.type === 'error' ? '#ff4b4b' : '#4CAF50',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: '40px'}}
              required
            />
            <span 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', userSelect: 'none', fontSize: '18px', opacity: 0.8 }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? '🫣' : '👁️'}
            </span>
          </div>

          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: '40px'}}
                required
              />
              <span 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', userSelect: 'none', fontSize: '18px', opacity: 0.8 }}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? '🫣' : '👁️'}
              </span>
            </div>
          )}

          <button type="submit" style={buttonStyle}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: '20px', cursor: 'pointer' }}
           onClick={() => {
             setIsLogin(!isLogin);
             setUsername('');
             setPassword('');
             setConfirmPassword('');
             setMessage({ type: '', text: '' }); // Clear message on toggle
           }}>
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </p>
      </div>
    </div>
  );
};

const inputStyle = {
  padding: '12px 15px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(0,0,0,0.2)',
  color: 'white',
  fontSize: '16px',
  outline: 'none'
};

const buttonStyle = {
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(45deg, #00C9FF, #92FE9D)',
  color: '#111',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

export default Login;
