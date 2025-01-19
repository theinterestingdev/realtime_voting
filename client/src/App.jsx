import React from 'react'
import './App.css'

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminPanel from './components/AdminPanel'
import Voting from './components/voting';

  
const App = () => {
  return (
    <Router>
      <div className="container w-full h-[100vh] flex items-center justify-center">
        <Routes>
          <Route path="/" element={<Voting />} />
  
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App