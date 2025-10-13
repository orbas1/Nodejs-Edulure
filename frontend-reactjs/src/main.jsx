import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { RuntimeConfigProvider } from './context/RuntimeConfigContext.jsx';
import { DashboardProvider } from './context/DashboardContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RuntimeConfigProvider>
          <RealtimeProvider>
            <DashboardProvider>
              <App />
            </DashboardProvider>
          </RealtimeProvider>
        </RuntimeConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
