import {
  HEAVY_CARGO_WEIGHT_THRESHOLD_KG,
  SHIPMENT_TAG_HEAVY_CARGO,
} from '../constants/shipment-tags.constants';

export function applyHeavyCargoTagRule(
  existingTags: string[],
  weightKg: number,
): string[] {
  const next = new Set(
    existingTags.filter((t) => t !== SHIPMENT_TAG_HEAVY_CARGO),
  );
  if (weightKg > HEAVY_CARGO_WEIGHT_THRESHOLD_KG) {
    next.add(SHIPMENT_TAG_HEAVY_CARGO);
  }
  return [...next];
}
