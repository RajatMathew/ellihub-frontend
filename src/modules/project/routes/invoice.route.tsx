import { Route, Routes } from 'react-router-dom';

import { InvoiceDetailPage } from '@modules/project/pages/invoice-detail';
import { InvoiceFormPage } from '@modules/project/pages/invoice-form';
import { InvoiceListPage } from '@modules/project/pages/invoice-list';

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
