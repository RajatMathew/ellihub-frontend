import { Route, Routes } from 'react-router-dom';

import { ContactDetailPage, ContactFormPage, ContactsListPage } from '@/modules/directory/pages';

const ContactsRoutes = () => {
  return (
    <Routes>
      <Route index element={<ContactsListPage />} />
      <Route path="create" element={<ContactFormPage />} />
      <Route path=":id" element={<ContactDetailPage />} />
      <Route path=":id/edit" element={<ContactFormPage />} />
    </Routes>
  );
};

export default ContactsRoutes;
