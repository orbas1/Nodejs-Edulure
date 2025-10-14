import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { RuntimeConfigProvider } from './context/RuntimeConfigContext.jsx';
import { DashboardProvider } from './context/DashboardContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import { ServiceHealthProvider } from './context/ServiceHealthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <RuntimeConfigProvider>
            <ServiceHealthProvider>
              <RealtimeProvider>
                <DashboardProvider>
                  <App />
                </DashboardProvider>
              </RealtimeProvider>
            </ServiceHealthProvider>
          </RuntimeConfigProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
