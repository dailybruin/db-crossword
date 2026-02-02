import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeLayout from '../layouts/HomeLayout';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Both paths render the same layout */}
        <Route path="/" element={<HomeLayout />} />
        <Route path="/mini" element={<HomeLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;