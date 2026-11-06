import test from "node:test";
import assert from "node:assert/strict";
import { measure, groupPhotos, shortlist, selectionReport } from "../core.js";
const photo = (id, hash, score = 5, decision = "undecided") => ({
  id,
  name: `${id}.jpg`,
  width: 800,
  height: 600,
  decision,
  analysis: { hash, score, warnings: [] },
});
test("flat and clipped images produce review hints without NaN", () => {
  const black = new Uint8ClampedArray(16 * 16 * 4);
  const result = measure(black, 16, 16);
  assert.equal(result.focus, 0);
  assert.equal(result.darkFraction, 1);
  assert.ok(result.warnings.includes("Deep shadows"));
  assert.ok(result.warnings.includes("Possible soft focus"));
  assert.equal(result.hash.length, 64);
  assert.ok(Number.isFinite(result.score));
});
test("grouping uses anchors rather than similarity chains", () => {
  const first = Array(64).fill(0),
    middle = first.map((v, i) => (i < 8 ? 1 : 0)),
    last = first.map((v, i) => (i < 16 ? 1 : 0));
  const groups = groupPhotos([
    photo("a", first),
    photo("b", middle),
    photo("c", last),
  ]);
  assert.deepEqual(
    groups.map((group) => group.photos.map((p) => p.id)),
    [["a", "b"], ["c"]],
  );
});
test("shortlist covers groups before extras and never resurrects rejects", () => {
  const photos = [
    photo("a", [], 10),
    photo("b", [], 9),
    photo("c", [], 8),
    photo("d", [], 100, "reject"),
  ];
  const groups = [
    { photos: [photos[0], photos[1], photos[3]] },
    { photos: [photos[2]] },
  ];
  assert.deepEqual(shortlist(photos, groups, 0), ["a", "c"]);
  assert.deepEqual(shortlist(photos, groups, 3), ["a", "c", "b"]);
  assert.deepEqual(shortlist(photos, groups, 10), ["a", "c", "b"]);
  assert.equal(photos[0].decision, "undecided");
});
test("report excludes image payloads and identifies browser heuristics", () => {
  const p = {
    ...photo("private-name", [], 4, "keep"),
    preview: "data:image/jpeg;base64,private",
    suggested: true,
    group: "group-1",
  };
  const report = selectionReport([p], "My shoot");
  assert.equal(report.photos[0].decision, "keep");
  assert.ok(!JSON.stringify(report).includes("base64"));
  assert.match(report.analysis, /not desktop AI/);
});
