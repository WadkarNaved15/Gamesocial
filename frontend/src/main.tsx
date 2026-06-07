import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { UserProvider } from "./context/user";
import { QueueProvider } from './context/QueueContext';
import SessionOverlay from './components/SessionOverlay';
import App from './App.tsx'
import '@google/model-viewer';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <QueueProvider>
        <SessionOverlay />
        <App />
      </QueueProvider>
    </UserProvider>
  </StrictMode>,
)
