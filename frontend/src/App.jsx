import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import IDE from './components/IDE';
import Login from './components/Login';
import ProtectedRoutes from './components/ProtectedRoutes';
import './App.css';

// Layout component to include the Navbar on protected pages
const MainLayout = () => {
  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <Outlet />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoutes><MainLayout /></ProtectedRoutes>}>
          <Route path="/" element={<Home />} />
          <Route path="/ide" element={<IDE />} />
          
          {/* Placeholder routes for future development */}
          <Route path="/practice" element={<div style={{padding: '40px', color: 'white', textAlign: 'center'}}><h1>Practice Mode Coming Soon</h1></div>} />
          <Route path="/compete" element={<div style={{padding: '40px', color: 'white', textAlign: 'center'}}><h1>Competition Mode Coming Soon</h1></div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
