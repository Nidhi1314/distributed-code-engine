import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Welcome to CodeEngine</h1>
      <p style={{ fontSize: '1.2rem', color: '#aaa', maxWidth: '600px', margin: '0 auto 40px auto' }}>
        The ultimate platform for executing code remotely. Practice your algorithms, compete with others, and build projects seamlessly.
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
        <FeatureCard 
          title="Practice" 
          desc="Sharpen your skills with a vast library of coding challenges." 
          onClick={() => navigate('/practice')} 
        />
        <FeatureCard 
          title="Compete" 
          desc="Join weekly contests and climb the global leaderboard." 
          onClick={() => navigate('/compete')} 
        />
        <FeatureCard 
          title="Live IDE" 
          desc="Write, compile, and execute code in multiple languages instantly." 
          onClick={() => navigate('/ide')} 
        />
      </div>
    </div>
  );
};

const FeatureCard = ({ title, desc, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '30px',
      width: '250px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-10px)';
      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 201, 255, 0.15)';
      e.currentTarget.style.borderColor = 'rgba(0, 201, 255, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    }}
  >
    <h3 style={{ color: '#00C9FF', marginTop: 0 }}>{title}</h3>
    <p style={{ color: '#ccc', lineHeight: '1.5', marginBottom: 0 }}>{desc}</p>
  </div>
);

export default Home;
