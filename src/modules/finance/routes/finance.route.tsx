import CheckingRegisterPage from '@/modules/finance/pages/checking-register-page';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function FinanceRoute() {
  return (
    <Routes>
      <Route index element={<Navigate to="checking-register" replace />} />
      <Route path="checking-register" element={<CheckingRegisterPage />} />
      <Route path="*" element={<Navigate to="checking-register" replace />} />
    </Routes>
  );
}
