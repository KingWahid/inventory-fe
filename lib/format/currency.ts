const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Consistent IDR display for inventory prices (API: double). */
export function formatIdr(amount: number): string {
  return idrFormatter.format(amount);
}
