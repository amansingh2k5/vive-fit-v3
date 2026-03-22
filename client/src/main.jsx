import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:   '#1e293b',
              color:        '#e2e8f0',
              border:       '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily:   "'DM Sans', sans-serif",
              fontSize:     '14px',
            },
            success: { iconTheme: { primary: '#adff2f', secondary: '#0f172a' } },
            error:   { iconTheme: { primary: '#ff007f', secondary: '#fff'    } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
