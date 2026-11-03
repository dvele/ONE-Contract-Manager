/**
 * The three Delivery Models of the Master EF agreement, keyed by the stored
 * `projects.on_site_selection` codes. Branch on these helpers, not on the raw
 * codes: the codes are stored values that predate FOB, and the rules for what
 * is shipped and billed live here alone.
 */

export type DeliveryModel = 'FOB' | 'CRC' | 'CMOS';

/** An unrecognized or missing code is treated as CRC. */
export function toDeliveryModel(raw: string | null | undefined): DeliveryModel {
  const code = (raw ?? '').trim().toUpperCase();
  return code === 'FOB' || code === 'CMOS' ? code : 'CRC';
}

export const DELIVERY_MODEL_LABELS: Record<DeliveryModel, string> = {
  FOB: 'FOB Factory',
  CRC: 'Delivered to Site',
  CMOS: 'Dvele GC',
};

/** FOB is picked up at the factory, so no delivery is billed. */
export function billsShipping(m: DeliveryModel): boolean {
  return m !== 'FOB';
}

/** Only Dvele GC bills on-site work; under Delivered to Site the Buyer's GC does it unbilled. */
export function billsOnsite(m: DeliveryModel): boolean {
  return m === 'CMOS';
}
