import FilesListPage from '@/modules/files/pages/files-list';
import { Route, Routes } from 'react-router-dom';

const FilesModule = () => {
  return (
    <Routes>
      <Route index element={<FilesListPage />} />
    </Routes>
  );
};

export default FilesModule;
