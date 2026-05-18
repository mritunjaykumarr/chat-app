import { Navigate, Route, Routes } from 'react-router-dom'
import ChatRoom from './pages/ChatRoom.jsx'
import Home from './pages/Home.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomCode" element={<ChatRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
