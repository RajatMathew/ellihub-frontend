import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import './main.css';

import FrameWork from '.';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrameWork />
  </StrictMode>
);
