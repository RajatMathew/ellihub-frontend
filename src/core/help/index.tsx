import { Route, Routes } from 'react-router-dom';

import '@app/styles/globals.css';

import { HelpLayout } from './components/layouts/HelpLayout';
import HelpPage from './pages/HelpPage';

const HelpApp = () => {
  return (
    <Routes>
      <Route element={<HelpLayout />}>
        <Route index element={<HelpPage />} />
        <Route path=":slug" element={<HelpPage />} />
      </Route>
    </Routes>
  );
};

export default HelpApp;
