export async function loadSparkMask(url, n) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  const m = Math.round(n * 0.03);
  g.drawImage(img, m, m, n - 2 * m, n - 2 * m);
  const px = g.getImageData(0, 0, n, n).data;
  const mask = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) mask[i] = px[i * 4 + 3] > 110 ? 1 : 0;
  return mask;
}
