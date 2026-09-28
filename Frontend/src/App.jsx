// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/index';
import Resources from './pages/resources';
import Transfers from './pages/transfers';
import Calendrier from './pages/calendrier';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/index" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
          <Route path="/calendrier" element={<ProtectedRoute><Calendrier /></ProtectedRoute>} />
          <Route path='*' element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;