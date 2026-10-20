import { NotFound } from '@/app/components/error/not-found';
import { PdfEditorPage } from '@/modules/pdf-editor/pages';
import { Route, Routes } from 'react-router-dom';

/**
 * One screen, at `/app/pdf`.
 *
 * The editor keeps its own state -- which file is open, where every slot sits
 * -- in the page rather than in the URL, so there is nothing here for a second
 * route to address. A file is reopened from browser storage, not from a link.
 */
const PdfEditorRoutes = () => {
  return (
    <Routes>
      <Route index element={<PdfEditorPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default PdfEditorRoutes;
