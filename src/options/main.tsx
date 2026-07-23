import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { OptionsApp } from './OptionsApp';
import '@/styles/global.css';
import './options.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <OptionsApp />
    </StrictMode>,
  );
}
