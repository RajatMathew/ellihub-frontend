import { NotFound } from '@/app/components/error/not-found';
import { EmployeeDetailPage, EmployeeFormPage, EmployeeListPage } from '@/modules/hr/pages';
import { Route, Routes } from 'react-router-dom';

const EmployeesRoutes = () => {
  return (
    <Routes>
      <Route index element={<EmployeeListPage />} />
      <Route path="create" element={<EmployeeFormPage />} />
      <Route path=":id" element={<EmployeeDetailPage />} />
      <Route path=":id/edit" element={<EmployeeFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default EmployeesRoutes;
