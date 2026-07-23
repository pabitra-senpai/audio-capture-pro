import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { PopupApp } from './PopupApp';
import '@/styles/global.css';
import './popup.css';
const rootEl = document.getElementById('root');
if (rootEl) {
    createRoot(rootEl).render(_jsx(StrictMode, { children: _jsx(PopupApp, {}) }));
}
