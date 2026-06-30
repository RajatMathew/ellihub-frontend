import { Navigate } from 'react-router-dom';

export function NavigateTo({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}
