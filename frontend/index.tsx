/**
 * Ponto de montagem do frontend React; injeta a aplicação na árvore DOM principal.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Main from './Main';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
