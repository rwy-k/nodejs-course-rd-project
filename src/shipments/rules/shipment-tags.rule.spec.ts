import { SHIPMENT_TAG_HEAVY_CARGO } from '../constants/shipment-tags.constants';
import { applyHeavyCargoTagRule } from './shipment-tags.rule';

describe('applyHeavyCargoTagRule', () => {
  it('adds HEAVY_CARGO only when weight is strictly greater than 50 kg', () => {
    expect(applyHeavyCargoTagRule([], 50)).not.toContain(
      SHIPMENT_TAG_HEAVY_CARGO,
    );
    expect(applyHeavyCargoTagRule([], 50.001)).toContain(
      SHIPMENT_TAG_HEAVY_CARGO,
    );
  });

  it('removes only HEAVY_CARGO and preserves other tags', () => {
    expect(
      applyHeavyCargoTagRule(['PRIORITY', SHIPMENT_TAG_HEAVY_CARGO], 10),
    ).toEqual(['PRIORITY']);
  });
});
