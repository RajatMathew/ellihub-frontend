import { NotFound } from '@/app/components/error/not-found';
import { DepartmentDetailPage, DepartmentFormPage, DepartmentListPage } from '@/modules/hr/pages';
import { Route, Routes } from 'react-router-dom';

const DepartmentsRoutes = () => {
  return (
    <Routes>
      <Route index element={<DepartmentListPage />} />
      <Route path="create" element={<DepartmentFormPage />} />
      <Route path=":id" element={<DepartmentDetailPage />} />
      <Route path=":id/edit" element={<DepartmentFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default DepartmentsRoutes;
