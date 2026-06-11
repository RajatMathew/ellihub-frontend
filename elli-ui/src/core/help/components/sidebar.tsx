// src/pages/help/sidebar.ts

import { helpPages } from '@core/help/utils/loadHelp';

export const sidebar = helpPages.map((page) => ({
  text: page.title,
  slug: page.slug,
}));
