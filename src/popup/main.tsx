import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { PopupApp } from './PopupApp';
import '@/styles/global.css';
import './popup.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <PopupApp />
    </StrictMode>,
  );
}
