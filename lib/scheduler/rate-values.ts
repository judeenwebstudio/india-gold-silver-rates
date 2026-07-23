export type ComparableRateValues = {
  pricePerGram: string | number | { toString(): string };
  pricePerKilogram:
    | string
    | number
    | { toString(): string }
    | null
    | undefined;
};

export function rateValuesAreEqual(
  existing: ComparableRateValues,
  incoming: ComparableRateValues,
) {
  return (
    Number(existing.pricePerGram) === Number(incoming.pricePerGram) &&
    Number(existing.pricePerKilogram ?? 0) ===
      Number(incoming.pricePerKilogram ?? 0)
  );
}
