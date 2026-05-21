import React, { useState } from 'react';
import './App.css';
import Login from './Login';
import SignUp from './SignUp';
import { LogOut, LayoutDashboard, Settings, User, Bell } from 'lucide-react';

// Simple Dashboard component for logged-in state
const Dashboard = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <LayoutDashboard size={20} />
          </div>
          <span className="font-bold text-xl text-gray-800">DevCollab</span>
        </div>
        <div className="flex items-center space-x-6">
          <button className="text-gray-500 hover:text-gray-700">
            <Bell size={20} />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Settings size={20} />
          </button>
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold border border-blue-200">
            JD
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Projects</h3>
              <p className="text-3xl font-bold text-blue-600">12</p>
              <p className="text-sm text-gray-500 mt-2">Active development</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Tasks</h3>
              <p className="text-3xl font-bold text-green-600">45</p>
              <p className="text-sm text-gray-500 mt-2">Completed this week</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Team Members</h3>
              <p className="text-3xl font-bold text-purple-600">8</p>
              <p className="text-sm text-gray-500 mt-2">Online now</p>
            </div>
          </div>

          <div className="mt-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col items-center justify-center text-gray-400">
            <User size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Welcome to your Dashboard</p>
            <p className="text-sm">Start by creating a new project or inviting your team.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleLogin = (credentials) => {
    console.log('Logging in with:', credentials);
    setIsLoggedIn(true);
    setIsSigningUp(false);
  };

  const handleSignUp = (userData) => {
    console.log('Signing up with:', userData);
    setIsLoggedIn(true);
    setIsSigningUp(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const toggleAuthMode = () => {
    setIsSigningUp(!isSigningUp);
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="App">
      {isSigningUp ? (
        <SignUp onSignUp={handleSignUp} onSwitchToLogin={toggleAuthMode} />
      ) : (
        <Login onLogin={handleLogin} onSwitchToSignUp={toggleAuthMode} />
      )}
    </div>
  );
}

export default App;
