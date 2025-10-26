export function usdToAtomic(amountUsd: number, decimals: number): bigint {
  const factor = 10 ** decimals;
  const atomic = Math.round(amountUsd * factor);
  return BigInt(atomic);
}

export function atomicToUsd(amountAtomic: bigint, decimals: number): number {
  const factor = 10 ** decimals;
  return Number(amountAtomic) / factor;
}
