import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';
import { applyCachedBrandColor, loadSiteIdentity } from './brandTheme.js';

// Color de marca: el último conocido al instante y el de la base de datos en cuanto llega.
applyCachedBrandColor();
loadSiteIdentity().catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

