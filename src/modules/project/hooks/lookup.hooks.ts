// Re-export from centralised lookup module
export {
  useLookupsQuery,
  useLookupDetailQuery,
} from '@/modules/lookup/hooks';
export { lookupKeys } from '@/modules/lookup/constants/lookup.keys';

// Project-specific convenience hook
import { useLookupsQuery } from '@/modules/lookup/hooks';

export const useDivisionsQuery = () => useLookupsQuery('PROJECT_DIVISION');
export const useProjectContractTypesQuery = () => useLookupsQuery('PROJECT_CONTRACT_TYPE');
