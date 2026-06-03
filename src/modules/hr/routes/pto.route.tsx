import { lazy } from 'react';

import { NotFound } from '@/app/components/error/not-found';
import { Route, Routes } from 'react-router-dom';

const PTOListPage = lazy(() => import('@/modules/hr/pages/pto/pto-list'));
const PTOFormPage = lazy(() => import('@/modules/hr/pages/pto/pto-form'));
const PTODetailPage = lazy(() => import('@/modules/hr/pages/pto/pto-detail'));

export default function PTORoute() {
  return (
    <Routes>
      <Route path="" element={<PTOListPage />} />
      <Route path="create" element={<PTOFormPage />} />
      <Route path=":id" element={<PTODetailPage />} />
      <Route path=":id/edit" element={<PTOFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
