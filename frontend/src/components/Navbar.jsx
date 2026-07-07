import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Assuming user data might be stored later, we show a generic initial for now
  const username = "User"; 
  const initial = username.charAt(0).toUpperCase();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 30px',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <h2 
        style={{ margin: 0, background: 'linear-gradient(45deg, #00C9FF, #92FE9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }} 
        onClick={() => navigate('/')}
      >
        CodeEngine
      </h2>
      <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
        <Link to="/" style={linkStyle}>Home</Link>
        <Link to="/practice" style={linkStyle}>Practice</Link>
        <Link to="/compete" style={linkStyle}>Compete</Link>
        <Link to="/ide" style={linkStyle}>IDE</Link>
        
        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C9FF, #92FE9D)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#111', fontWeight: 'bold', fontSize: '18px',
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,201,255,0.2)', transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Account Menu"
          >
            {initial}
          </div>
          
          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '55px', width: '160px', background: '#1e1e1e',
              border: '1px solid #333', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 101
            }}>
              <div 
                style={dropdownItemStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => { setDropdownOpen(false); /* Add profile nav here */ }}
              >
                Profile
              </div>
              <div 
                style={{...dropdownItemStyle, color: '#ff4b4b', borderTop: '1px solid #333'}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,75,75,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={handleLogout}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const linkStyle = {
  color: '#e0e0e0',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: '500',
  transition: 'color 0.3s ease',
};

const dropdownItemStyle = {
  padding: '12px 16px',
  cursor: 'pointer',
  fontSize: '14px',
  color: '#e0e0e0',
  transition: 'background 0.2s'
};

export default Navbar;
