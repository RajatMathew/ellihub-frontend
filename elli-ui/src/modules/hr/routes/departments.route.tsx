import { DepartmentDetailPage, DepartmentFormPage, DepartmentListPage } from '@/modules/hr/pages';
import { Route, Routes } from 'react-router-dom';

const DepartmentsRoutes = () => {
  return (
    <Routes>
      <Route index element={<DepartmentListPage />} />
      <Route path="create" element={<DepartmentFormPage />} />
      <Route path=":id" element={<DepartmentDetailPage />} />
      <Route path=":id/edit" element={<DepartmentFormPage />} />
    </Routes>
  );
};

export default DepartmentsRoutes;
