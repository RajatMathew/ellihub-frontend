import { Route, Routes } from 'react-router-dom';

import FilesListPage from '../pages/files-list';

const FilesModule = () => {
  return (
    <Routes>
      <Route index element={<FilesListPage />} />
    </Routes>
  );
};

export default FilesModule;
