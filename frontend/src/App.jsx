import { Routes, Route } from 'react-router-dom';
import HUD from './components/HUD';
import StreakModal from './components/StreakModal';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Games from './pages/Games';
import GamePage from './pages/GamePage';
import Leaderboard from './pages/Leaderboard';
import Shop from './pages/Shop';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

export default function App() {
  const { loading, streakPopup, clearStreakPopup } = useAuth();

  if (loading) {
    return (
      <div className="app-shell">
        <p className="subtitle" style={{ paddingTop: 40 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <HUD />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <StreakModal data={streakPopup} onClose={clearStreakPopup} />
    </div>
  );
}
