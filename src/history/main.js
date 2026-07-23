import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { HistoryApp } from './HistoryApp';
import '@/styles/global.css';
import './history.css';
const rootEl = document.getElementById('root');
if (rootEl) {
    createRoot(rootEl).render(_jsx(StrictMode, { children: _jsx(HistoryApp, {}) }));
}
