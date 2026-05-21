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
    </Routes>
  );
};

export default InvoiceRoutes;
