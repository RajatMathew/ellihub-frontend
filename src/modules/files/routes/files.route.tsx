import { NotFound } from '@/app/components/error/not-found';
import FilesListPage from '@/modules/files/pages/files-list';
import { Route, Routes } from 'react-router-dom';

const FilesModule = () => {
  return (
    <Routes>
      <Route index element={<FilesListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default FilesModule;
