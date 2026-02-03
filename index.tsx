
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Providers } from './provider/provider';
import { Toaster } from 'react-hot-toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // <React.StrictMode>
  <Providers>
    <App />
    <Toaster />
  </Providers>
  // </React.StrictMode>
);
