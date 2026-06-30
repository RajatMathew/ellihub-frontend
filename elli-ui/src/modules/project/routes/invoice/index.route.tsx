import { NotFound } from '@/app/components/error/not-found';
import {
  InvoiceDetailPage,
  InvoiceFormPage,
  InvoiceListPage,
} from '@/modules/project/pages/invoice';
import { Route, Routes } from 'react-router-dom';

const InvoiceRoutes = () => {
  return (
    <Routes>
      <Route index element={<InvoiceListPage />} />
      <Route path="create" element={<InvoiceFormPage />} />
      <Route path=":invoiceId" element={<InvoiceDetailPage />} />
      <Route path=":invoiceId/edit" element={<InvoiceFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default InvoiceRoutes;
