import React, { useState } from 'react';
import axios from 'axios';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const ADMIN_PASSWORD = 'admin123'; // Static password

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setMessage('');
    } else {
      setMessage('Incorrect password!');
    }
  };

  // Start Voting
  const startVoting = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/start-voting`);
      setMessage(response.data.message);
    } catch (error) {
      setMessage('Error starting voting');
    }
  };

  // Stop Voting
  const stopVoting = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/stop-voting`);
      setMessage(response.data.message);
    } catch (error) {
      setMessage('Error stopping voting');
    }
  };

  // Clear all votes and IPs
  const clearVotes = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/clear-votes`);
      setMessage(response.data.message);
    } catch (error) {
      setMessage('Error clearing votes');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login w-full h-screen bg-white flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-2xl font-bold mb-4 bg-white">Admin Login</h1>
        <input
          className="border border-gray-300 p-2 rounded w-full max-w-sm mb-4 text-black bg-transparent"
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          onClick={handleLogin}
        >
          Login
        </button>
        {message && <p className="text-red-500 mt-4">{message}</p>}
      </div>
    );
  }

  return (
    <div className="admin-panel w-full h-screen bg-white text-black flex flex-col justify-center items-center px-4">
      <h1 className="text-3xl font-bold mb-6 bg-white">Admin Panel</h1>
      <div className="flex flex-col gap-4 w-full max-w-sm bg-white">
        <button
          onClick={startVoting}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Start Voting
        </button>
        <button
          onClick={stopVoting}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Stop Voting
        </button>
        <button
          onClick={clearVotes}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear All Votes and IPs
        </button>
      </div>
      {message && <p className="mt-4 text-lg bg-white">{message}</p>}
    </div>
  );
};

export default AdminPanel;
