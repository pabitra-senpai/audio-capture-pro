import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { OptionsApp } from './OptionsApp';
import '@/styles/global.css';
import './options.css';
const rootEl = document.getElementById('root');
if (rootEl) {
    createRoot(rootEl).render(_jsx(StrictMode, { children: _jsx(OptionsApp, {}) }));
}
