import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { UserProvider } from "./context/user";
import { QueueProvider } from './context/QueueContext';
import {AnalyticsProvider }from './context/AnalyticsProvider';
import SessionOverlay from './components/SessionOverlay';
import {AudioProvider} from './context/AudioContext';
import { AdProvider } from './context/AdContext.tsx';
import App from './App.tsx'
import '@google/model-viewer';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <AudioProvider>
        <AdProvider>
          <AnalyticsProvider>
            <QueueProvider>
              <SessionOverlay />              
                <App />
            </QueueProvider>
          </AnalyticsProvider>
        </AdProvider>
      </AudioProvider>
    </UserProvider>
  </StrictMode>,
)
