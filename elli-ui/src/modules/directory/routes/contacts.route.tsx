import { NotFound } from '@/app/components/error/not-found';
import { ContactDetailPage, ContactFormPage, ContactsListPage } from '@/modules/directory/pages';
import { Route, Routes } from 'react-router-dom';

const ContactsRoutes = () => {
  return (
    <Routes>
      <Route index element={<ContactsListPage />} />
      <Route path="create" element={<ContactFormPage />} />
      <Route path=":id" element={<ContactDetailPage />} />
      <Route path=":id/edit" element={<ContactFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ContactsRoutes;
