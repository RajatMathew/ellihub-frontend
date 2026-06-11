import { NotFound } from '@/app/components/error/not-found';
import { CostCodeCategoriesListPage, CostCodesListPage } from '@/modules/catalog/pages';
import { Route, Routes } from 'react-router-dom';

export default function CatalogModuleRoutes() {
  return (
    <Routes>
      <Route path="categories/*" element={<CostCodeCategoriesListPage />} />
      <Route index element={<CostCodesListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
