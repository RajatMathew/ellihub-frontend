import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';

export function getGCTypeName(gc: GeneralContractorDetail) {
  return gc.gcType?.label ?? gc.gcType?.name ?? 'Unknown';
}

export function getGCTypeCode(gc: GeneralContractorDetail) {
  return gc.gcType?.code ?? undefined;
}
