import React, { useState } from 'react';
import axios from 'axios';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD; // Use environment variable

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setMessage('');
    } else {
      setMessage('Incorrect password!');
    }
  };

  const handleAction = async (action) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/${action}`);
      setMessage(response.data.message);
    } catch (error) {
      setMessage(`Error performing action: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  

  if (!isAuthenticated) {
    return (
      <div className="admin-login w-full h-screen bg-gray-100 flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
        <input
          className="border border-gray-300 p-2 rounded w-full max-w-sm mb-4"
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
    <div className="admin-panel w-full h-screen bg-gray-100 text-black flex flex-col justify-center items-center px-4">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => handleAction('start-voting')}
          className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        >
          Start Voting
        </button>
        <button
          onClick={() => handleAction('stop-voting')}
          className={`bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        >
          Stop Voting
        </button>
        <button
          onClick={() => handleAction('clear-votes')}
          className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        >
          Clear All Votes and IPs
        </button>
      </div>
      {message && <p className="mt-4 text-lg bg-white">{message}</p>}
    </div>
  );
};

export default AdminPanel;
