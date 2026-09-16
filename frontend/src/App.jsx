import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeLayout from '../layouts/HomeLayout';
import ArchivePage from '../layouts/ArchivePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Today's puzzles */}
        <Route path="/" element={<HomeLayout />} />
        <Route path="/mini" element={<HomeLayout />} />

        {/* Previous Puzzles index, per type */}
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/mini/archive" element={<ArchivePage />} />

        {/* A specific past puzzle, played by date */}
        <Route path="/archive/:date" element={<HomeLayout />} />
        <Route path="/mini/archive/:date" element={<HomeLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
