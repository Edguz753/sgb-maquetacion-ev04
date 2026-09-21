import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/authcontext';
import App from './app';
import ErrorBoundary from './components/errorboundary';
import './styles.css';

// En el despliegue demo (GitHub Pages) la app cuelga de /sgb-maquetacion-ev04/;
// __BASE__ lo define Vite (vite.config.ts `base`) en cada build.
declare const __BASE__: string;
const routerBasename = typeof __BASE__ !== 'undefined' ? __BASE__ : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <AuthProvider>
        <ErrorBoundary>
            <App />
          </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
