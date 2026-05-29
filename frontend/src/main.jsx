import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { io } from 'socket.io-client'

// Connect Socket.IO once — attach to window for global access
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  autoConnect: true
})
window.io = socket

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)