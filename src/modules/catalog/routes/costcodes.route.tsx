import { Route, Routes } from 'react-router-dom';

import { CostCodeCategoriesListPage, CostCodesListPage } from '@/modules/catalog/pages';

export default function CatalogModuleRoutes() {
  return (
    <Routes>
      <Route path="categories/*" element={<CostCodeCategoriesListPage />} />
      <Route index element={<CostCodesListPage />} />
    </Routes>
  );
}
