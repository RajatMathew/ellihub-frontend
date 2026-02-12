import { Route, Routes } from 'react-router-dom';

const ContactsRoutes = () => {
  return (
    <Routes>
      <Route path="*" element={<div>Contacts Home Page (to be implemented)</div>} />
    </Routes>
  );
};

export default ContactsRoutes;
