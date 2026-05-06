// Re-export from centralised lookup module
export { lookupApi as appLookupApi } from '@/modules/lookup/api/lookup.api';
export {
  lookupSchema as appLookupSchema,
  type Lookup as AppLookup,
} from '@/modules/lookup/schemas/lookup.schema';
