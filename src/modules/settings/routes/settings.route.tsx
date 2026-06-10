import { PermissionRoute } from '@/app/components/access/permission-route';
import { Forbidden } from '@/app/components/error/forbidden';
import { NotFound } from '@/app/components/error/not-found';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { useAccess } from '@/app/contexts/access-context';
import QuickBooksIntegrationPage from '@/modules/integrations/pages/quickbooks-integration-page';
import MembersPage from '@/modules/settings/pages/members-page';
import TemplateSettingsPage from '@/modules/settings/pages/template-settings-page';
import { Navigate, Route, Routes } from 'react-router-dom';

function SettingsIndex() {
  const { can, isLoading } = useAccess();

  if (isLoading) return <ModuleLoader />;
  if (can('user', 'manage-permissions')) return <Navigate to="members" replace />;
  if (can('template', 'read')) return <Navigate to="templates" replace />;
  if (can('integration', 'read')) return <Navigate to="integrations" replace />;
  return <Forbidden />;
}

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<SettingsIndex />} />
      <Route
        path="members"
        element={
          <PermissionRoute resource="user" action="manage-permissions">
            <MembersPage />
          </PermissionRoute>
        }
      />
      <Route
        path="templates"
        element={
          <PermissionRoute resource="template" action="read">
            <TemplateSettingsPage />
          </PermissionRoute>
        }
      />
      <Route
        path="integrations"
        element={
          <PermissionRoute resource="integration" action="read">
            <QuickBooksIntegrationPage />
          </PermissionRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
