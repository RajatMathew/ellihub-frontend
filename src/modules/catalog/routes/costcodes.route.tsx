import { Route, Routes } from 'react-router-dom';

import { CostCodesListPage } from '../pages';
import CostCodeCategoriesListPage from '../pages/categories';

export default function CatalogueModule() {
  return (
    <Routes>
      <Route path="categories/*" element={<CostCodeCategoriesListPage />} />
      <Route index path="/" element={<CostCodesListPage />} />
    </Routes>
  );
}
