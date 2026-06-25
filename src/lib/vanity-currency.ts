/** Chiroyli raqam narxlari — to'g'ridan-to'g'ri USD */

/** @deprecated Endi narxlar to'g'ridan-to'g'ri USD da, konversiya shart emas */
export function toVanityUsdPrice(usd: number): number {
  return usd;
}

export function formatVanityPrice(priceUsd: number): string {
  return `$${priceUsd.toLocaleString("en-US")}`;
}
