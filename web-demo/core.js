// Lightweight browser review hints. These are not the desktop model pipeline.
export function measure(pixels, width, height) {
  const gray = new Float32Array(width * height);
  let dark = 0,
    light = 0;
  for (let i = 0; i < gray.length; i++) {
    const value =
      0.2126 * pixels[i * 4] +
      0.7152 * pixels[i * 4 + 1] +
      0.0722 * pixels[i * 4 + 2];
    gray[i] = value;
    if (value < 12) dark++;
    if (value > 245) light++;
  }
  let sum = 0,
    squares = 0,
    count = 0;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const laplacian =
        4 * gray[i] -
        gray[i - 1] -
        gray[i + 1] -
        gray[i - width] -
        gray[i + width];
      sum += laplacian;
      squares += laplacian * laplacian;
      count++;
    }
  const focus = count ? Math.max(0, squares / count - (sum / count) ** 2) : 0;
  const darkFraction = dark / gray.length,
    lightFraction = light / gray.length;
  const warnings = [];
  if (focus < 65) warnings.push("Possible soft focus");
  if (darkFraction > 0.35) warnings.push("Deep shadows");
  if (lightFraction > 0.2) warnings.push("Clipped highlights");
  const hash = [];
  const cells = [];
  for (let row = 0; row < 8; row++)
    for (let column = 0; column < 9; column++) {
      let total = 0,
        samples = 0;
      const left = Math.floor((column * width) / 9),
        right = Math.max(left + 1, Math.floor(((column + 1) * width) / 9));
      const top = Math.floor((row * height) / 8),
        bottom = Math.max(top + 1, Math.floor(((row + 1) * height) / 8));
      for (let y = top; y < Math.min(height, bottom); y++)
        for (let x = left; x < Math.min(width, right); x++) {
          total += gray[y * width + x];
          samples++;
        }
      cells.push(total / Math.max(1, samples));
    }
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      hash.push(cells[y * 9 + x] > cells[y * 9 + x + 1] ? 1 : 0);
    }
  return {
    focus,
    darkFraction,
    lightFraction,
    hash,
    warnings,
    score: Math.log1p(focus) - 3 * (darkFraction + lightFraction),
  };
}

export function groupPhotos(photos) {
  const groups = [];
  for (const photo of photos) {
    const match = groups.find((group) => {
      const anchor = group.photos[0];
      const ratio = photo.width / photo.height,
        other = anchor.width / anchor.height;
      const distance = photo.analysis.hash.reduce(
        (n, bit, i) => n + (bit !== anchor.analysis.hash[i] ? 1 : 0),
        0,
      );
      return Math.abs(ratio - other) < 0.1 && distance <= 8;
    });
    if (match) match.photos.push(photo);
    else groups.push({ id: `group-${groups.length + 1}`, photos: [photo] });
  }
  return groups;
}

export function shortlist(photos, groups, target = 0) {
  const ranked = groups.map((group) =>
    group.photos
      .filter((photo) => photo.decision !== "reject")
      .sort(
        (a, b) =>
          a.analysis.warnings.length - b.analysis.warnings.length ||
          b.analysis.score - a.analysis.score ||
          a.id.localeCompare(b.id),
      ),
  );
  const result = [];
  const limit = target === 0 ? ranked.length : target;
  for (let round = 0; result.length < limit; round++) {
    const candidates = ranked.map((group) => group[round]).filter(Boolean);
    if (!candidates.length) break;
    candidates.sort(
      (a, b) =>
        a.analysis.warnings.length - b.analysis.warnings.length ||
        b.analysis.score - a.analysis.score ||
        a.id.localeCompare(b.id),
    );
    for (const photo of candidates)
      if (result.length < limit) result.push(photo.id);
    if (target === 0) break;
  }
  return result;
}

export function selectionReport(photos, name) {
  return {
    product: "SnapSort browser demo",
    project: name,
    exported_at: new Date().toISOString(),
    analysis:
      "Browser sharpness, exposure and perceptual-hash heuristics; not desktop AI",
    photos: photos.map((photo) => ({
      name: photo.name,
      decision: photo.decision,
      suggested: photo.suggested,
      group: photo.group,
      focus_hint: photo.analysis.warnings,
      width: photo.width,
      height: photo.height,
    })),
  };
}
