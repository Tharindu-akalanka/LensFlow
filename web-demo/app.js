import { measure, groupPhotos, shortlist, selectionReport } from "./core.js";

const $ = (id) => document.getElementById(id);
const state = {
  photos: [],
  groups: [],
  active: null,
  filter: "all",
  group: null,
  view: "grid",
  search: "",
  history: [],
  name: "Your photo review",
  target: 0,
  zoom: 1,
  comparison: null,
};
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const labels = { keep: "Keep", reject: "Rejected", undecided: "Unreviewed" };
const filters = [
  ["all", "▦", "All photographs"],
  ["suggested", "▱", "Suggested picks"],
  ["keep", "⚑", "Keepers"],
  ["reject", "×", "Rejected"],
  ["undecided", "◌", "Unreviewed"],
];
let busy = false;
let serial = 0;

function visiblePhotos() {
  return state.photos.filter(
    (photo) =>
      (!state.group || photo.group === state.group) &&
      (!state.search || photo.name.toLowerCase().includes(state.search)) &&
      (state.filter === "all" || state.filter === "suggested"
        ? state.filter === "all" ||
          (photo.suggested && photo.decision !== "reject")
        : photo.decision === state.filter),
  );
}
function activePhoto() {
  return state.photos.find((photo) => photo.id === state.active);
}
function status(message) {
  $("status-text").textContent = message;
}
function showWorkspace() {
  $("welcome").hidden = true;
  $("workspace").hidden = false;
  render();
}
function updateSuggestions() {
  const ids = new Set(shortlist(state.photos, state.groups, state.target));
  for (const photo of state.photos) photo.suggested = ids.has(photo.id);
}
function regroup() {
  state.groups = groupPhotos(state.photos);
  for (const group of state.groups)
    for (const photo of group.photos) photo.group = group.id;
  updateSuggestions();
}

function render() {
  const visible = visiblePhotos();
  if (!visible.some((photo) => photo.id === state.active))
    state.active = visible[0]?.id || null;
  const reviewed = state.photos.filter(
    (photo) => photo.decision !== "undecided",
  ).length;
  $("project-title").textContent = state.name;
  $("photo-total").textContent = `${state.photos.length} photos`;
  $("shown-count").textContent = `${visible.length} shown`;
  $("review-progress").max = Math.max(1, state.photos.length);
  $("review-progress").value = reviewed;
  $("review-count").textContent =
    `${reviewed} of ${state.photos.length} reviewed · ${state.photos.length - reviewed} remaining`;
  $("next-unreviewed").disabled = reviewed === state.photos.length;
  $("group-total").textContent = state.groups.length;
  $("sample-notice").hidden = !state.photos.some((photo) => photo.sample);
  $("undo-button").disabled = !state.history.length;
  $("export-button").disabled = !state.photos.length;
  for (const id of [
    "keep-button",
    "reject-button",
    "clear-button",
    "compare-button",
  ])
    $(id).disabled = !state.active;
  $("active-name").textContent =
    activePhoto()?.name || "No photograph selected";
  $("filters").innerHTML = filters
    .map(([key, icon, label]) => {
      const count =
        key === "all"
          ? state.photos.length
          : key === "suggested"
            ? state.photos.filter(
                (photo) => photo.suggested && photo.decision !== "reject",
              ).length
            : state.photos.filter((photo) => photo.decision === key).length;
      return `<button class="filter ${state.filter === key && !state.group ? "active" : ""}" data-filter="${key}" aria-pressed="${state.filter === key && !state.group}"><span aria-hidden="true">${icon}</span>${label}<span class="count">${count}</span></button>`;
    })
    .join("");
  $("groups").innerHTML = state.groups
    .map(
      (group, index) =>
        `<button class="group-button ${state.group === group.id ? "active" : ""}" data-group="${group.id}" aria-pressed="${state.group === group.id}"><img src="${group.photos[0].preview}" alt=""><span><strong>Group ${index + 1}</strong><small>${group.photos.length} frame${group.photos.length === 1 ? "" : "s"}</small></span></button>`,
    )
    .join("");
  $("grid-button").setAttribute("aria-pressed", String(state.view === "grid"));
  $("compare-button").setAttribute(
    "aria-pressed",
    String(state.view === "compare"),
  );
  $("empty-filter").hidden = !!visible.length;
  $("photo-grid").hidden = state.view !== "grid" || !visible.length;
  $("compare-view").hidden = state.view !== "compare" || !visible.length;
  $("photo-grid").innerHTML = visible
    .map(
      (photo, index) =>
        `<button class="photo-tile ${photo.decision} ${photo.suggested ? "suggested" : ""} ${state.active === photo.id ? "active" : ""}" data-photo="${photo.id}" aria-label="${escape(photo.name)}, ${labels[photo.decision]}${photo.suggested ? ", suggested" : ""}" aria-pressed="${state.active === photo.id}"><span class="tile-top"><span>${index + 1}</span><span class="pick ${photo.analysis.warnings.length ? "warning" : ""}">${photo.decision === "keep" ? "✓ Your keep" : photo.decision === "reject" ? "× Rejected" : photo.suggested ? (photo.analysis.warnings.length ? "△ Review pick" : "✓ Suggested") : ""}</span></span><span class="tile-image"><img src="${photo.preview}" alt="${escape(photo.name)}" loading="lazy" decoding="async"></span><strong class="tile-name">${escape(photo.name)}</strong><span class="tile-bottom"><span>Group ${state.groups.findIndex((group) => group.id === photo.group) + 1}</span><span class="decision-${photo.decision}">${labels[photo.decision]}</span></span></button>`,
    )
    .join("");
  if (state.view === "compare" && visible.length) renderComparison();
  renderInspector();
  const suggestions = state.photos.filter((photo) => photo.suggested).length;
  $("shortlist-summary").textContent =
    `${suggestions} suggested${state.target ? ` / ${state.target} requested` : ""} · ${state.groups.length} similar-frame groups.${state.target > suggestions ? ` ${state.target - suggestions} more requested than available non-rejected photos.` : ""}`;
  if ($("preview-dialog").open) updatePreview();
}

function renderInspector() {
  const photo = activePhoto();
  if (!photo) {
    $("photo-details").innerHTML =
      '<div class="panel-content"><p>Select a photograph to see its details.</p></div>';
    return;
  }
  const group = state.groups.find((group) => group.id === photo.group);
  $("photo-details").innerHTML =
    `<div class="panel-content"><img class="detail-photo" src="${photo.preview}" alt="${escape(photo.name)}"><strong class="detail-filename">${escape(photo.name)}</strong><span class="detail-size">${photo.width} × ${photo.height}${photo.sample ? " · Sample variant" : ""}</span><hr class="detail-divider"><div class="metric"><span>Your decision</span><strong class="decision-${photo.decision}">${labels[photo.decision]}</strong></div><div class="metric"><span>Focus detail</span><strong>${photo.analysis.focus.toFixed(0)}</strong></div><div class="metric"><span>Deep shadows</span><strong>${(photo.analysis.darkFraction * 100).toFixed(1)}%</strong></div><div class="metric"><span>Clipped highlights</span><strong>${(photo.analysis.lightFraction * 100).toFixed(1)}%</strong></div>${photo.analysis.warnings.length ? photo.analysis.warnings.map((hint) => `<div class="quality-hint">${escape(hint)}</div>`).join("") : '<div class="quality-hint quality-clear">No strong focus/exposure warning in this preview.</div>'}<small>Preview measurements are hints, not a judgement of artistic quality. Faces and eyes are not analysed in this demo.</small><hr class="detail-divider"><h3>Similar frames · ${group?.photos.length || 1}</h3><button id="inspect-compare" ${group?.photos.length > 1 ? "" : "disabled"}>Compare this group →</button></div>`;
}

function renderComparison() {
  const first = activePhoto();
  const group = state.groups.find((group) => group.id === first.group);
  const alternatives = [
    ...(group?.photos || []),
    ...state.photos.filter((photo) => photo.group !== first.group),
  ].filter((photo) => photo.id !== first.id);
  const second =
    alternatives.find((photo) => photo.id === state.comparison) ||
    alternatives[0];
  if (!second) {
    $("compare-view").innerHTML =
      '<div class="empty-filter"><h2>One frame is ready.</h2><p>Add another photograph to compare.</p></div>';
    return;
  }
  state.comparison = second.id;
  $("compare-view").innerHTML =
    `<div class="compare-controls"><span>Compare with</span><select id="comparison-photo" aria-label="Compare with photograph">${alternatives.map((photo) => `<option value="${photo.id}" ${photo.id === second.id ? "selected" : ""}>${escape(photo.name)}</option>`).join("")}</select><label>Zoom <input id="compare-zoom" type="range" min="1" max="3" step=".25" value="${state.zoom}" aria-label="Linked comparison zoom"><span id="zoom-label">${state.zoom}×</span></label></div><div class="compare-panes">${[first, second].map((photo, index) => `<section class="compare-pane ${index === 0 ? "active" : ""}"><header>${escape(photo.name)} · ${labels[photo.decision]}</header><div class="zoom-frame"><div class="zoom-content" style="width:${state.zoom * 100}%;height:${state.zoom * 100}%"><img src="${photo.preview}" alt="${escape(photo.name)}" draggable="false"></div></div></section>`).join("")}</div><p class="compare-note">Linked zoom & pan · Review previews${first.sample ? " · Sample differences are simulated" : ""}</p>`;
  const frames = [...document.querySelectorAll(".zoom-frame")];
  let syncing = false;
  for (const frame of frames) {
    frame.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      const other = frames.find((item) => item !== frame);
      const x =
          frame.scrollLeft / Math.max(1, frame.scrollWidth - frame.clientWidth),
        y =
          frame.scrollTop /
          Math.max(1, frame.scrollHeight - frame.clientHeight);
      other.scrollLeft = x * (other.scrollWidth - other.clientWidth);
      other.scrollTop = y * (other.scrollHeight - other.clientHeight);
      requestAnimationFrame(() => {
        syncing = false;
      });
    });
    let drag = null;
    frame.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      drag = {
        x: event.clientX,
        y: event.clientY,
        left: frame.scrollLeft,
        top: frame.scrollTop,
      };
      frame.setPointerCapture(event.pointerId);
    });
    frame.addEventListener("pointermove", (event) => {
      if (!drag) return;
      frame.scrollLeft = drag.left + drag.x - event.clientX;
      frame.scrollTop = drag.top + drag.y - event.clientY;
    });
    frame.addEventListener("pointerup", () => {
      drag = null;
    });
    frame.addEventListener("pointercancel", () => {
      drag = null;
    });
  }
}

function decide(decision) {
  if (busy) return;
  const photo = activePhoto();
  if (!photo || photo.decision === decision) return;
  state.history.push({ id: photo.id, decision: photo.decision });
  photo.decision = decision;
  updateSuggestions();
  render();
  status(`${photo.name} · ${labels[decision]}. Decision kept in this tab.`);
}
function undo() {
  const previous = state.history.pop();
  const photo =
    previous && state.photos.find((photo) => photo.id === previous.id);
  if (!photo) return;
  photo.decision = previous.decision;
  state.active = photo.id;
  state.filter = "all";
  state.group = null;
  state.search = "";
  $("search").value = "";
  updateSuggestions();
  render();
  status(`Undid decision for ${photo.name}.`);
}
function navigate(direction) {
  const photos = visiblePhotos();
  if (!photos.length) return;
  state.active =
    photos[
      (photos.findIndex((photo) => photo.id === state.active) +
        direction +
        photos.length) %
        photos.length
    ].id;
  render();
  document
    .querySelector(`.photo-tile[data-photo="${state.active}"]`)
    ?.scrollIntoView({ block: "nearest" });
}
function updatePreview() {
  const photo = activePhoto();
  if (!photo) {
    $("preview-dialog").close();
    return;
  }
  $("preview-title").textContent = `${photo.name} · ${labels[photo.decision]}`;
  $("preview-image").src = photo.preview;
  $("preview-image").alt = photo.name;
}
function preview() {
  if (!activePhoto()) return;
  updatePreview();
  $("preview-dialog").showModal();
}

async function createPhoto(source, name, sample = false, variant = 0) {
  const image = await createImageBitmap(source);
  try {
    if (!image.width || !image.height || image.width * image.height > 100000000)
      throw Error("Image dimensions are too large");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw Error("Image processing is unavailable in this browser");
    context.filter =
      variant === 1 ? "blur(4px)" : variant === 2 ? "brightness(1.9)" : "none";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.88);
    const analysisCanvas = document.createElement("canvas");
    const analysisScale = 256 / Math.max(canvas.width, canvas.height);
    analysisCanvas.width = Math.max(
      3,
      Math.round(canvas.width * analysisScale),
    );
    analysisCanvas.height = Math.max(
      3,
      Math.round(canvas.height * analysisScale),
    );
    const analysisContext = analysisCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    analysisContext.drawImage(
      canvas,
      0,
      0,
      analysisCanvas.width,
      analysisCanvas.height,
    );
    const pixels = analysisContext.getImageData(
      0,
      0,
      analysisCanvas.width,
      analysisCanvas.height,
    );
    return {
      id: `photo-${++serial}`,
      name,
      preview,
      width: image.width,
      height: image.height,
      analysis: measure(pixels.data, pixels.width, pixels.height),
      decision: "undecided",
      suggested: false,
      sample,
    };
  } finally {
    image.close();
  }
}
function startLoading(total) {
  busy = true;
  $("load-progress").value = 0;
  $("load-progress").max = total;
  $("loading-dialog").showModal();
}
function finishLoading() {
  busy = false;
  $("loading-dialog").close();
}
function loaded(index, total) {
  $("load-progress").value = index;
  $("load-status").textContent = `${index} of ${total} photos prepared`;
}

async function loadSample() {
  if (state.photos.length) {
    showWorkspace();
    return;
  }
  startLoading(9);
  try {
    const sources = [
      ["alpine.jpg", "Alpine"],
      ["forest.jpg", "Forest"],
      ["lake.jpg", "Lakeside"],
    ];
    const photos = [];
    for (const [asset, label] of sources) {
      const response = await fetch(`assets/${asset}`);
      if (!response.ok)
        throw Error(
          "Sample photos could not be loaded. You can import your own instead.",
        );
      const blob = await response.blob();
      for (let variant = 0; variant < 3; variant++) {
        photos.push(
          await createPhoto(
            blob,
            `${label}_${String(variant + 1).padStart(2, "0")}.jpg`,
            true,
            variant,
          ),
        );
        loaded(photos.length, 9);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    state.photos = photos;
    state.name = "Weekend in the hills";
    regroup();
    state.active = photos[0].id;
    showWorkspace();
    status(
      "Sample shoot ready. Start with Suggested picks or compare a group.",
    );
  } catch (error) {
    showError(error.message);
  } finally {
    finishLoading();
  }
}

async function importFiles(files) {
  if (!files.length || busy) return;
  const available = 100 - state.photos.length;
  if (!available) {
    status("This demo holds up to 100 photos. Clear the shoot to start again.");
    return;
  }
  const chosen = [...files].slice(0, available),
    failures = [];
  let added = 0;
  startLoading(chosen.length);
  try {
    for (const [index, file] of chosen.entries()) {
      try {
        if (
          !/\.(jpe?g|png|webp)$/i.test(file.name) ||
          file.size > 20 * 1024 * 1024
        )
          throw Error("Use JPEG, PNG or WebP files up to 20 MB each");
        state.photos.push(await createPhoto(file, file.name));
        added++;
      } catch (error) {
        failures.push(`${file.name}: ${error.message}`);
      }
      loaded(index + 1, chosen.length);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    regroup();
    if (state.photos.length) {
      state.active ||= state.photos[0].id;
      showWorkspace();
    }
    status(
      `${added} photo${added === 1 ? "" : "s"} added.${failures.length ? ` ${failures.length} could not be read.` : ""}${files.length > available ? " Only the first 100 photos fit in this demo." : ""}`,
    );
    if (failures.length)
      showError(
        `${added} photos added. ${failures.slice(0, 3).join(" · ")}${failures.length > 3 ? ` · ${failures.length - 3} more failed.` : ""}`,
      );
  } finally {
    finishLoading();
    $("file-input").value = "";
  }
}
function showError(message) {
  status(message);
  let notice = $("error-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "error-notice";
    notice.className = "error-notice";
    notice.setAttribute("role", "alert");
    document.body.append(notice);
  }
  notice.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Dismiss";
  close.addEventListener("click", () => notice.remove());
  notice.append(close);
}

$("sample-button").addEventListener("click", () => void loadSample());
for (const id of ["welcome-import", "import-button"])
  $(id).addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener(
  "change",
  (event) => void importFiles(event.target.files),
);
$("home-button").textContent = "← Overview";
$("home-button").addEventListener("click", () => {
  $("workspace").hidden = true;
  $("welcome").hidden = false;
  $("sample-button").textContent = state.photos.length
    ? "Resume your shoot →"
    : "Explore a sample shoot →";
});
for (const id of ["about-button", "help-button"])
  $(id).addEventListener("click", () => $("about-dialog").showModal());
for (const button of document.querySelectorAll("[data-close]"))
  button.addEventListener("click", () => button.closest("dialog").close());
$("loading-dialog").addEventListener("cancel", (event) =>
  event.preventDefault(),
);
$("reset-button").addEventListener("click", () =>
  $("confirm-dialog").showModal(),
);
$("confirm-clear").addEventListener("click", () => {
  state.photos = [];
  state.groups = [];
  state.history = [];
  state.active = null;
  state.group = null;
  state.filter = "all";
  state.search = "";
  state.view = "grid";
  state.comparison = null;
  state.zoom = 1;
  state.target = 0;
  $("search").value = "";
  $("target").value = "0";
  $("confirm-dialog").close();
  $("workspace").hidden = true;
  $("welcome").hidden = false;
  $("sample-button").textContent = "Explore a sample shoot →";
  $("error-notice")?.remove();
  render();
  status("Shoot cleared. Your original files are untouched.");
});
$("filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  state.group = null;
  render();
});
$("groups").addEventListener("click", (event) => {
  const button = event.target.closest("[data-group]");
  if (!button) return;
  state.group = button.dataset.group;
  state.filter = "all";
  state.view = "grid";
  state.comparison = null;
  state.zoom = 1;
  render();
});
$("photo-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-photo]");
  if (!button) return;
  state.active = button.dataset.photo;
  render();
});
$("photo-grid").addEventListener("dblclick", (event) => {
  const button = event.target.closest("[data-photo]");
  if (!button) return;
  state.active = button.dataset.photo;
  preview();
});
$("grid-button").addEventListener("click", () => {
  state.view = "grid";
  render();
});
$("compare-button").addEventListener("click", () => {
  state.view = "compare";
  state.zoom = 1;
  render();
});
$("photo-details").addEventListener("click", (event) => {
  if (!event.target.closest("#inspect-compare")) return;
  state.view = "compare";
  state.comparison = null;
  state.zoom = 1;
  render();
});
$("compare-view").addEventListener("change", (event) => {
  if (event.target.id === "comparison-photo") {
    state.comparison = event.target.value;
    renderComparison();
  }
});
$("compare-view").addEventListener("input", (event) => {
  if (event.target.id !== "compare-zoom") return;
  state.zoom = Number(event.target.value);
  $("zoom-label").textContent = `${state.zoom}×`;
  for (const content of document.querySelectorAll(".zoom-content")) {
    content.style.width = `${state.zoom * 100}%`;
    content.style.height = `${state.zoom * 100}%`;
  }
});
$("search").addEventListener("input", (event) => {
  state.search = event.target.value.toLowerCase();
  render();
});
$("show-all").addEventListener("click", () => {
  state.filter = "all";
  state.group = null;
  state.search = "";
  $("search").value = "";
  render();
});
for (const [id, decision] of [
  ["keep-button", "keep"],
  ["reject-button", "reject"],
  ["clear-button", "undecided"],
])
  $(id).addEventListener("click", () => decide(decision));
$("undo-button").addEventListener("click", undo);
$("next-unreviewed").addEventListener("click", () => {
  const remaining = state.photos.filter(
    (photo) => photo.decision === "undecided",
  );
  if (!remaining.length) return;
  const index = remaining.findIndex((photo) => photo.id === state.active);
  state.active = remaining[(index + 1) % remaining.length].id;
  state.filter = "undecided";
  state.group = null;
  state.search = "";
  $("search").value = "";
  render();
});
for (const panel of ["photo", "shortlist"])
  $(`${panel}-tab`).addEventListener("click", () => {
    for (const key of ["photo", "shortlist"]) {
      $(`${key}-tab`).setAttribute("aria-pressed", String(key === panel));
      $(`${key}-panel`).hidden = key !== panel;
    }
  });
$("target").addEventListener("input", (event) => {
  const value = event.target.value;
  const number = Number(value);
  $("suggest-button").disabled =
    value.trim() === "" ||
    !Number.isInteger(number) ||
    number < 0 ||
    number > 100;
});
$("suggest-button").addEventListener("click", () => {
  const target = Number($("target").value);
  if (!Number.isInteger(target) || target < 0 || target > 100) return;
  state.target = target;
  updateSuggestions();
  render();
  status(
    "Shortlist updated. Your saved Keep / Reject decisions are unchanged.",
  );
});
$("view-suggestions").addEventListener("click", () => {
  state.filter = "suggested";
  state.group = null;
  state.search = "";
  $("search").value = "";
  state.view = "grid";
  render();
});
$("export-button").addEventListener("click", () => {
  const report = JSON.stringify(
    selectionReport(state.photos, state.name),
    null,
    2,
  );
  const url = URL.createObjectURL(
    new Blob([report], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "snapsort-selection.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  status(
    "Selection report saved. This JSON report contains names and decisions, not photo files.",
  );
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    document.body.classList.contains("show-inspector")
  ) {
    document.body.classList.remove("show-inspector");
    $("tools-button").setAttribute("aria-expanded", "false");
    $("tools-button").focus();
    return;
  }
  if (
    busy ||
    $("about-dialog").open ||
    $("confirm-dialog").open ||
    $("workspace").hidden
  )
    return;
  if (
    event.target instanceof HTMLElement &&
    (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
      event.target.isContentEditable)
  )
    return;
  if (
    event.key === " " &&
    event.target instanceof HTMLElement &&
    event.target.closest("button,a") &&
    !event.target.closest(".photo-tile")
  )
    return;
  if (event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
    }
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    navigate(event.key === "ArrowLeft" ? -1 : 1);
  } else if (event.key === " ") {
    event.preventDefault();
    if ($("preview-dialog").open) $("preview-dialog").close();
    else preview();
  } else if (["k", "r", "u"].includes(event.key.toLowerCase())) {
    event.preventDefault();
    decide({ k: "keep", r: "reject", u: "undecided" }[event.key.toLowerCase()]);
  }
});
$("tools-button").addEventListener("click", () => {
  document.body.classList.add("show-inspector");
  $("tools-button").setAttribute("aria-expanded", "true");
  $("shortlist-tab").click();
  $("close-tools").focus();
});
$("close-tools").addEventListener("click", () => {
  document.body.classList.remove("show-inspector");
  $("tools-button").setAttribute("aria-expanded", "false");
  $("tools-button").focus();
});
render();
