import { PermissionRoute } from '@/app/components/access/permission-route';
import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { useAccess } from '@/app/contexts/access-context';
import CheckingRegisterPage from '@/modules/finance/pages/checking-register-page';
import PaymentConflictsPage from '@/modules/finance/payment-conflicts/pages/payment-conflicts-page';
import { Navigate, Route, Routes } from 'react-router-dom';

function FinanceIndexRedirect() {
  const { can, canAccessCheckingRegister, isLoading } = useAccess();

  if (isLoading) return <ModuleLoader />;
  if (canAccessCheckingRegister) return <Navigate to="checking-register" replace />;
  if (can('quickBooksPaymentConflict', 'read')) {
    return <Navigate to="payment-conflicts" replace />;
  }
  return <Forbidden />;
}

function CheckingRegisterRoute() {
  const { canAccessCheckingRegister, isLoading } = useAccess();

  if (isLoading) return <ModuleLoader />;
  if (!canAccessCheckingRegister) return <Forbidden />;

  return <CheckingRegisterPage />;
}

export default function FinanceRoute() {
  return (
    <Routes>
      <Route index element={<FinanceIndexRedirect />} />
      <Route
        path="checking-register"
        element={
          <CheckingRegisterRoute />
        }
      />
      <Route
        path="payment-conflicts"
        element={
          <PermissionRoute resource="quickBooksPaymentConflict" action="read">
            <PaymentConflictsPage />
          </PermissionRoute>
        }
      />
      <Route path="*" element={<FinanceIndexRedirect />} />
    </Routes>
  );
}
