import { lazy } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import { Route, Routes } from 'react-router-dom';

const TasksPage = lazy(() => import('@/modules/tasks/pages/tasks-page'));

export default function TasksRoute() {
  return (
    <Routes>
      <Route path="" element={<TasksPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
