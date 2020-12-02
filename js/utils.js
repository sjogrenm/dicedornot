// sort array ascending
export const asc = (arr) => arr.sort((a, b) => a - b);

export const sum = (arr) => arr.reduce((a, b) => a + b, 0);

export const mean = (arr) => sum(arr) / arr.length;

// sample standard deviation
export const std = (arr) => {
  const mu = mean(arr);
  const diffArr = arr.map((a) => (a - mu) ** 2);
  return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

export const quantile = (arr, q) => {
  const sorted = asc(arr);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base];
  } else {
    return sorted[base];
  }
};

export function weightedQuantile(arr, q, valueKey, weightKey) {
  valueKey = valueKey || "value";
  weightKey = weightKey || "weight";
  const sorted = arr.sort((a, b) => a[valueKey] - b[valueKey]);
  const totalWeight = arr.reduce((acc, v) => acc + v[weightKey], 0);
  var i = 0;
  while (q > 1e-8 && i < sorted.length) {
    q -= sorted[i][weightKey] / totalWeight;
    if (q > 1e-8) {
      i++;
    }
  }
  return sorted[i][valueKey];
}
