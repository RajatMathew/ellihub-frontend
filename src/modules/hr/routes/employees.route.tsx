import { Route, Routes } from 'react-router-dom';

import { EmployeeDetailPage, EmployeeFormPage, EmployeeListPage } from '../pages';

const EmployeesRoutes = () => {
  return (
    <Routes>
      <Route index element={<EmployeeListPage />} />
      <Route path="create" element={<EmployeeFormPage />} />
      <Route path=":id" element={<EmployeeDetailPage />} />
      <Route path=":id/edit" element={<EmployeeFormPage />} />
    </Routes>
  );
};

export default EmployeesRoutes;
