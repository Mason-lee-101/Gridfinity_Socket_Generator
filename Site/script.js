const state = {
  fileName: "",
  rows: [],
  warnings: [],
};

const driveOrder = ["1/4", "3/8", "1/2"];
const typeOrder = ["standard", "impact"];
const repoHeightOrder = ["deep", "standard"];

const fileInput = document.querySelector("#csvFile");
const dropZone = document.querySelector("#dropZone");
const output = document.querySelector("#output");
const outputMode = document.querySelector("#outputMode");
const metricSuffix = document.querySelector("#metricSuffix");
const darkMode = document.querySelector("#darkMode");
const downloadBtn = document.querySelector("#downloadBtn");
const stats = document.querySelector("#stats");
const previewBody = document.querySelector("#previewBody");
const previewCount = document.querySelector("#previewCount");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanes = document.querySelectorAll(".tab-pane");
const toolOutputs = document.querySelectorAll(".tool-output");
const converterSection = document.querySelector(".converter-section");
const layoutInput = document.querySelector("#layoutInput");
const layoutSvg = document.querySelector("#layoutSvg");
const layoutStats = document.querySelector("#layoutStats");
const layoutReplacement = document.querySelector("#layoutReplacement");
const previewGenerator = document.querySelector("#previewGenerator");
const previewLayout = document.querySelector("#previewLayout");
const previewAlignment = document.querySelector("#previewAlignment");
const previewControls = [
  previewGenerator,
  previewLayout,
  previewAlignment,
  document.querySelector("#previewBed"),
  document.querySelector("#previewHeight"),
  document.querySelector("#previewMarginX"),
  document.querySelector("#previewMarginY"),
  document.querySelector("#previewFit"),
  document.querySelector("#previewLabelSize"),
  document.querySelector("#previewLabelDepth"),
  document.querySelector("#previewLabelRotation"),
  document.querySelector("#previewGrid"),
  document.querySelector("#previewBaseH"),
  document.querySelector("#previewBaseProfileH"),
  document.querySelector("#previewBaseTop"),
  document.querySelector("#previewBaseBottom"),
  document.querySelector("#previewBaseRTop"),
  document.querySelector("#previewBaseRBottom"),
  document.querySelector("#previewLengthClearance"),
  document.querySelector("#previewRecess"),
  document.querySelector("#previewHoleDepth"),
  document.querySelector("#previewLabelHoleGap"),
  document.querySelector("#previewLabelSocketGap"),
  document.querySelector("#previewLabelCollision"),
  document.querySelector("#previewCradleScale"),
  document.querySelector("#previewCradlePocketMargin"),
  document.querySelector("#previewCradlePocketDepth"),
  document.querySelector("#previewFloor"),
  document.querySelector("#previewMagnetD"),
  document.querySelector("#previewMagnetH"),
  document.querySelector("#previewScrewD"),
  document.querySelector("#previewScrewH"),
  document.querySelector("#previewHoleFromEdge"),
  document.querySelector("#previewTapered"),
  document.querySelector("#previewMagnets"),
  document.querySelector("#previewLabels"),
  document.querySelector("#previewScrews"),
  document.querySelector("#previewLabelInsideVertical"),
  document.querySelector("#previewLabelInsideHorizontal"),
];

initTheme();
initLayoutPreview();

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) readFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) readFile(file);
});

[outputMode, metricSuffix].forEach((control) => {
  control.addEventListener("change", render);
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

darkMode.addEventListener("change", () => {
  setTheme(darkMode.checked ? "dark" : "light");
});

downloadBtn.addEventListener("click", () => {
  if (!output.value.trim()) return;
  const baseName = state.fileName.replace(/\.[^.]+$/, "") || "socket_arrays";
  const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${baseName}_socket_arrays.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    state.fileName = file.name;
    try {
      const table = parseCsv(String(reader.result));
      const parsed = parseSocketRows(table);
      state.rows = parsed.rows;
      state.warnings = parsed.warnings;
    } catch (error) {
      state.rows = [];
      state.warnings = [error.message];
    }
    render();
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "") || rows.length === 0) rows.push(row);
  return rows;
}

function parseSocketRows(table) {
  if (!table.length) return { rows: [], warnings: ["The CSV is empty."] };

  const header = table[0].map(normalizeHeader);
  const warnings = [];
  const rows = header.includes("socket label") || header.includes("drive size")
    ? parseTemplateRows(table, header, warnings)
    : parseBlockRows(table, warnings);

  return {
    rows: rows.filter((row) => row.label && row.drive && row.socketType && row.height && Number.isFinite(row.bottomDiameter)),
    warnings,
  };
}

function parseTemplateRows(table, header, warnings) {
  const indexes = {
    label: findHeader(header, ["socket label", "size"]),
    system: findHeader(header, ["system"]),
    socketType: findHeader(header, ["socket type", "type"]),
    drive: findHeader(header, ["drive size", "socket size"]),
    height: findHeader(header, ["socket height", "socket len", "height"]),
    bottomDiameter: findHeader(header, ["bottom diameter mm", "bottom size in mm"]),
    bottomLength: findHeader(header, ["bottom length mm", "bottom length"]),
    topDiameter: findHeader(header, ["top diameter mm", "top size in mm"]),
    topLength: findHeader(header, ["top length mm", "top length"]),
  };

  if (indexes.label < 0 || indexes.drive < 0 || indexes.bottomDiameter < 0) {
    warnings.push("Could not find the expected template headers.");
  }

  return table.slice(1).map((cells, sourceIndex) => normalizeSocketRow({
    label: cell(cells, indexes.label),
    system: cell(cells, indexes.system),
    socketType: cell(cells, indexes.socketType),
    drive: cell(cells, indexes.drive),
    height: cell(cells, indexes.height),
    bottomDiameter: cell(cells, indexes.bottomDiameter),
    bottomLength: cell(cells, indexes.bottomLength),
    topDiameter: cell(cells, indexes.topDiameter),
    topLength: cell(cells, indexes.topLength),
    sourceIndex: sourceIndex + 2,
  }));
}

function parseBlockRows(table, warnings) {
  const header = table[0].map(normalizeHeader);
  const blockStarts = [];

  header.forEach((heading, index) => {
    if (heading === "size" && normalizeHeader(table[0][index + 1]) === "system") {
      blockStarts.push(index);
    }
  });

  if (!blockStarts.length) {
    warnings.push("Could not find socket columns in the CSV.");
    return [];
  }

  const rows = [];
  table.slice(1).forEach((cells, sourceIndex) => {
    blockStarts.forEach((start) => {
      rows.push(normalizeSocketRow({
        label: cells[start],
        system: cells[start + 1],
        socketType: cells[start + 2],
        drive: cells[start + 4],
        height: cells[start + 5],
        topDiameter: cells[start + 6],
        bottomDiameter: cells[start + 7],
        sourceIndex: sourceIndex + 2,
      }));
    });
  });
  return rows;
}

function normalizeSocketRow(row) {
  const system = clean(row.system).toLowerCase();
  const rawLabel = clean(row.label);
  const label = formatLabel(rawLabel, system);
  const bottomDiameter = parseNumber(row.bottomDiameter);
  const topDiameter = parseNumber(row.topDiameter);

  return {
    label,
    rawLabel,
    system,
    socketType: clean(row.socketType).toLowerCase(),
    drive: clean(row.drive).replaceAll("\\", "/").replace(/\s+/g, ""),
    height: clean(row.height).toLowerCase(),
    bottomDiameter,
    bottomLength: parseNumber(row.bottomLength),
    topDiameter,
    topLength: parseNumber(row.topLength),
    largestDiameter: Math.max(bottomDiameter || 0, topDiameter || 0),
    sourceIndex: row.sourceIndex,
  };
}

function render() {
  state.rows.forEach((row) => {
    row.label = formatLabel(row.rawLabel, row.system);
  });
  output.value = buildOutput();
  renderStats();
  renderPreview();
  if (state.rows.length && !layoutInput.dataset.edited) {
    layoutInput.value = buildLayoutSeed();
    renderLayout();
  }
}

function buildOutput() {
  if (!state.rows.length) {
    return state.warnings.length ? `// ${state.warnings.join("\n// ")}\n` : "";
  }

  const drives = orderedValues(state.rows.map((row) => row.drive), driveOrder);
  const types = orderedValues(state.rows.map((row) => row.socketType), typeOrder);
  const heights = orderedValues(state.rows.map((row) => row.height), repoHeightOrder);
  const lines = [
    `// Socket diameter arrays generated from "${state.fileName}".`,
    `// Format: ${formatDescription()}`,
    "// Entries are grouped by drive, socket type, and socket height.",
    "// Entries inside each group are sorted largest to smallest by socket label.",
    "",
  ];

  drives.forEach((drive) => {
    types.forEach((socketType) => {
      heights.forEach((height) => {
        const group = state.rows
          .filter((row) => row.drive === drive && row.socketType === socketType && row.height === height)
          .sort(compareSocketLabels)
          .map(formatEntry)
          .filter(Boolean);

        if (!group.length) return;

        lines.push(`// ${drive} drive - ${socketType} sockets - ${height} height`);
        lines.push("socket_diams = [");
        lines.push(`    [${group.map((entry) => `"${entry}"`).join(", ")}]`);
        lines.push("];");
        lines.push("");
      });
    });
  });

  if (state.warnings.length) {
    lines.push("// Warnings:");
    state.warnings.forEach((warning) => lines.push(`// ${warning}`));
  }

  return lines.join("\n").trimEnd() + "\n";
}

function formatEntry(row) {
  const mode = outputMode.value;
  const label = row.label;

  if (mode === "vertical") {
    return `${formatNumber(row.largestDiameter)}/${label}`;
  }

  if (mode === "verticalTapered") {
    const top = Number.isFinite(row.topDiameter) ? row.topDiameter : row.bottomDiameter;
    return `${formatNumber(row.bottomDiameter)}/${formatNumber(top)}/${label}`;
  }

  if (mode === "horizontal") {
    const length = Number.isFinite(row.bottomLength) ? row.bottomLength : row.topLength;
    if (!Number.isFinite(length)) return "";
    return `${formatNumber(row.largestDiameter)}/${formatNumber(length)}/${label}`;
  }

  const topDiameter = Number.isFinite(row.topDiameter) ? row.topDiameter : row.bottomDiameter;
  const bottomLength = row.bottomLength;
  const topLength = row.topLength;
  if (!Number.isFinite(bottomLength) || !Number.isFinite(topLength)) return "";
  return `${formatNumber(row.bottomDiameter)}/${formatNumber(bottomLength)}/${formatNumber(topDiameter)}/${formatNumber(topLength)}/${label}`;
}

function renderStats() {
  const groups = new Set(state.rows.map((row) => `${row.drive}|${row.socketType}|${row.height}`)).size;
  const missingHorizontal = state.rows.filter((row) => !Number.isFinite(row.bottomLength) && !Number.isFinite(row.topLength)).length;
  const parts = state.rows.length
    ? [
      pill(`${state.rows.length} sockets`),
      pill(`${groups} groups`),
      pill(state.fileName),
    ]
    : ["<span>No file loaded</span>"];

  if (outputMode.value.startsWith("horizontal") && missingHorizontal) {
    parts.push(pill(`${missingHorizontal} rows without length`, true));
  }

  state.warnings.forEach((warning) => parts.push(pill(warning, true)));
  stats.innerHTML = parts.join("");
}

function renderPreview() {
  previewCount.textContent = `${state.rows.length} ${state.rows.length === 1 ? "row" : "rows"}`;
  if (!state.rows.length) {
    previewBody.innerHTML = `<tr><td colspan="8" class="empty">${state.warnings[0] || "Upload a CSV to preview parsed sockets."}</td></tr>`;
    return;
  }

  previewBody.innerHTML = state.rows.slice(0, 200).map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${escapeHtml(row.system)}</td>
      <td>${escapeHtml(row.drive)}</td>
      <td>${escapeHtml(row.socketType)}</td>
      <td>${escapeHtml(row.height)}</td>
      <td>${formatNumber(row.bottomDiameter)}</td>
      <td>${Number.isFinite(row.topDiameter) ? formatNumber(row.topDiameter) : ""}</td>
      <td>${Number.isFinite(row.bottomLength) ? formatNumber(row.bottomLength) : ""}</td>
    </tr>
  `).join("");
}

function orderedValues(values, preferred) {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.sort((a, b) => {
    const aIndex = preferred.indexOf(a);
    const bIndex = preferred.indexOf(b);
    if (aIndex >= 0 || bIndex >= 0) {
      return (aIndex >= 0 ? aIndex : 999) - (bIndex >= 0 ? bIndex : 999);
    }
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function compareSocketLabels(a, b) {
  return labelValue(b.label) - labelValue(a.label) || b.label.localeCompare(a.label, undefined, { numeric: true });
}

function labelValue(label) {
  let text = label.toLowerCase().replace("mm", "").replace(/^h/, "").replace(/^tt/, "").trim();
  text = text.replace(/\s*\/\s*/g, "/");
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDescription() {
  return {
    vertical: "\"largest diameter/label\"",
    verticalTapered: "\"bottom diameter/top diameter/label\"",
    horizontal: "\"largest diameter/length/label\"",
    horizontalTapered: "\"bottom diameter/bottom length/top diameter/top length/label\"",
  }[outputMode.value];
}

function formatLabel(value, system) {
  const cleaned = clean(value).replaceAll("\\", "/").replace(/\s*\/\s*/g, "/").replace(/^(\d+)\/(\d+)$/, "$1/$2");
  if (!cleaned) return "";
  if (metricSuffix.checked && system === "metric" && /^(\d+(\.\d+)?)$/.test(cleaned)) {
    return `${cleaned}mm`;
  }
  return cleaned;
}

function findHeader(header, names) {
  return header.findIndex((heading) => names.includes(heading));
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function cell(cells, index) {
  return index >= 0 ? cells[index] : "";
}

function clean(value) {
  return String(value ?? "").replace(/\uFEFF/g, "").trim();
}

function parseNumber(value) {
  const text = clean(value).replace(/[^\d.-]/g, "");
  if (!text) return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(3)));
}

function pill(text, warn = false) {
  return `<span class="pill${warn ? " warn" : ""}">${escapeHtml(text)}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

function initTheme() {
  const savedTheme = readTheme();
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (systemPrefersDark ? "dark" : "light"));
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  darkMode.checked = theme === "dark";
  try {
    localStorage.setItem("socket-array-theme", theme);
  } catch (error) {
    // The toggle still works even if local storage is unavailable.
  }
}

function readTheme() {
  try {
    return localStorage.getItem("socket-array-theme");
  } catch (error) {
    return "";
  }
}

function initLayoutPreview() {
  layoutInput.value = `socket_diams = [
    ["43.97/32mm", "43.82/31mm", "42.76/30mm", "41.94/29mm"],
    ["38.5/27mm", "37.01/26mm", "35.86/25mm", "34.2/24mm"]
];`;

  layoutInput.addEventListener("input", () => {
    layoutInput.dataset.edited = "true";
    renderLayout();
  });

  previewControls.forEach((control) => {
    control.addEventListener("input", renderLayout);
    control.addEventListener("change", () => {
      if (
        control === previewGenerator ||
        control === document.querySelector("#previewLabels") ||
        control === document.querySelector("#previewMagnets") ||
        control === document.querySelector("#previewScrews")
      ) {
        syncGeneratorControls();
      }
      renderLayout();
    });
  });

  syncGeneratorControls();
  renderLayout();
}

function setActiveTab(tab) {
  tabButtons.forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  tabPanes.forEach((pane) => pane.classList.toggle("active", pane.id === `${tab}Pane`));
  toolOutputs.forEach((pane) => pane.classList.toggle("active", pane.id === `${tab}Output`));
  converterSection.classList.toggle("active", tab === "converter");

  if (tab === "layout") renderLayout();
}

function syncGeneratorControls() {
  const generator = previewGenerator.value;
  const vertical = generator === "vertical";
  const labelsEnabled = document.querySelector("#previewLabels").checked;
  const magnetsEnabled = document.querySelector("#previewMagnets").checked;
  const screwsEnabled = document.querySelector("#previewScrews").checked;
  document.querySelectorAll(".vertical-only").forEach((element) => {
    element.hidden = !vertical;
  });
  document.querySelectorAll(".horizontal-only").forEach((element) => {
    element.hidden = vertical;
  });
  document.querySelectorAll(".labels-only").forEach((element) => {
    element.hidden = element.hidden || !labelsEnabled;
  });
  document.querySelector(".hardware-section").hidden = !magnetsEnabled && !screwsEnabled;
  document.querySelectorAll(".magnet-only").forEach((element) => {
    element.hidden = !magnetsEnabled;
  });
  document.querySelectorAll(".screw-only").forEach((element) => {
    element.hidden = !screwsEnabled;
  });
  document.querySelectorAll(".hardware-only").forEach((element) => {
    element.hidden = !magnetsEnabled && !screwsEnabled;
  });

  const currentLayout = previewLayout.value;
  previewLayout.innerHTML = vertical
    ? `<option value="compact">compact</option><option value="grid">grid</option><option value="stagger">stagger</option><option value="free">free</option>`
    : `<option value="grid">grid</option><option value="free">free</option><option value="compact">compact</option>`;
  previewLayout.value = [...previewLayout.options].some((option) => option.value === currentLayout)
    ? currentLayout
    : (vertical ? "compact" : "grid");

  document.querySelector("#previewMarginX").value = vertical ? "3" : "2";
}

function buildLayoutSeed() {
  const firstGroup = [];
  const groupKey = state.rows
    .map((row) => `${row.drive}|${row.socketType}|${row.height}`)
    .sort()[0];

  state.rows
    .filter((row) => `${row.drive}|${row.socketType}|${row.height}` === groupKey)
    .sort(compareSocketLabels)
    .slice(0, 12)
    .forEach((row) => firstGroup.push(`"${formatEntry(row)}"`));

  const midpoint = Math.ceil(firstGroup.length / 2);
  return `socket_diams = [
    [${firstGroup.slice(0, midpoint).join(", ")}],
    [${firstGroup.slice(midpoint).join(", ")}]
];`;
}

function renderLayout() {
  const parsed = parseSocketArray(layoutInput.value);
  const settings = layoutSettings();

  if (!parsed.rows.length) {
    layoutSvg.innerHTML = "";
    layoutStats.innerHTML = pill(parsed.warning || "No socket rows found", true);
    layoutReplacement.value = "";
    return;
  }

  const model = buildLayoutModel(parsed.rows, settings);
  drawLayout(model, settings);
  layoutReplacement.value = buildReplacementOutput(settings);

  const bedWarning = model.bodyX > settings.bedX || model.bodyY > settings.bedY
    ? pill(`larger than ${settings.bedX}x${settings.bedY} bed`, true)
    : "";
  layoutStats.innerHTML = [
    pill(`${model.socketCount} sockets`),
    pill(`${model.baseCols} x ${model.baseRows} Gridfinity`),
    pill(`${formatNumber(model.bodyX)} x ${formatNumber(model.bodyY)} mm`),
    bedWarning,
  ].filter(Boolean).join("");
}

function layoutSettings() {
  const bed = clean(document.querySelector("#previewBed").value).toLowerCase().split("x");
  return {
    generator: previewGenerator.value,
    socketLayout: previewLayout.value,
    alignment: previewAlignment.value,
    bedX: parseNumber(bed[0]) || 250,
    bedY: parseNumber(bed[1]) || 250,
    height: numberValue("#previewHeight", 2),
    marginX: numberValue("#previewMarginX", 3),
    marginY: numberValue("#previewMarginY", 2),
    fitClearance: numberValue("#previewFit", 0.6),
    labelSize: numberValue("#previewLabelSize", 5),
    labelDepth: numberValue("#previewLabelDepth", 0.7),
    labelRotation: numberValue("#previewLabelRotation", 0),
    grid: numberValue("#previewGrid", 42),
    baseH: numberValue("#previewBaseH", 7),
    baseProfileH: numberValue("#previewBaseProfileH", 4.75),
    baseTop: numberValue("#previewBaseTop", 41.5),
    baseBottom: numberValue("#previewBaseBottom", 35.6),
    baseRTop: numberValue("#previewBaseRTop", 3.75),
    baseRBottom: numberValue("#previewBaseRBottom", 0.8),
    lengthClearance: numberValue("#previewLengthClearance", 1),
    recessFraction: numberValue("#previewRecess", 0.4),
    holeDepth: numberValue("#previewHoleDepth", 25),
    labelHoleGap: numberValue("#previewLabelHoleGap", 3),
    labelSocketGap: numberValue("#previewLabelSocketGap", 3),
    labelCollision: numberValue("#previewLabelCollision", 0.5),
    cradleScale: numberValue("#previewCradleScale", 0.75),
    cradlePocketMargin: numberValue("#previewCradlePocketMargin", 3),
    cradlePocketDepth: numberValue("#previewCradlePocketDepth", 1.2),
    floorThickness: numberValue("#previewFloor", 3),
    magnetD: numberValue("#previewMagnetD", 6.2),
    magnetH: numberValue("#previewMagnetH", 2.2),
    screwD: numberValue("#previewScrewD", 3.2),
    screwH: numberValue("#previewScrewH", 7),
    holeFromEdge: numberValue("#previewHoleFromEdge", 8),
    tapered: document.querySelector("#previewTapered").checked,
    magnets: document.querySelector("#previewMagnets").checked,
    labels: document.querySelector("#previewLabels").checked,
    screws: document.querySelector("#previewScrews").checked,
    labelInsideVertical: document.querySelector("#previewLabels").checked && document.querySelector("#previewLabelInsideVertical").checked,
    labelInsideHorizontal: document.querySelector("#previewLabels").checked && document.querySelector("#previewLabelInsideHorizontal").checked,
  };
}

function parseSocketArray(text) {
  const source = text.includes("socket_diams")
    ? text.slice(text.indexOf("socket_diams"))
    : text;
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start < 0 || end <= start) return { rows: [], warning: "Could not find socket_diams rows." };

  const rows = [];
  let depth = 0;
  let rowStart = -1;
  const body = source.slice(start, end + 1);

  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === "[") {
      depth += 1;
      if (depth === 2) rowStart = i + 1;
    } else if (body[i] === "]") {
      if (depth === 2 && rowStart >= 0) {
        rows.push(parseSocketEntryRow(body.slice(rowStart, i)));
        rowStart = -1;
      }
      depth -= 1;
    }
  }

  return { rows: rows.filter((row) => row.length), warning: "" };
}

function parseSocketEntryRow(text) {
  const entries = [];
  const pattern = /"([^"]*)"|'([^']*)'|(^|,)\s*(-?\d+(\.\d+)?)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[1] ?? match[2] ?? match[4];
    if (value === "0" || Number(value) === 0) {
      entries.push({ gap: true });
    } else {
      entries.push(parseSocketEntry(value));
    }
  }
  return entries;
}

function parseSocketEntry(value) {
  const parts = clean(value).split("/");
  return {
    raw: value,
    parts,
    numbers: parts.map(parseNumber),
    label: parts.slice(1).join("/") || parts[0],
    gap: false,
  };
}

function buildLayoutModel(rows, settings) {
  const measuredRows = rows.map((row) => row.map((entry) => measureEntry(entry, settings)));
  const rowWidths = measuredRows.map((row) => rowWidth(row, settings));
  const rowHeights = measuredRows.map((row, r) => rowHeight(measuredRows, r, settings));
  const maxWidth = Math.max(...rowWidths, settings.grid);
  const requiredX = settings.socketLayout === "grid"
    ? Math.max(...measuredRows.map((row) => row.length), 1) * maxEntryWidth(measuredRows, settings)
      + (Math.max(...measuredRows.map((row) => row.length), 1) + 1) * settings.marginX
    : settings.generator === "vertical" && settings.socketLayout === "stagger"
      ? Math.max(...measuredRows.map((row, r) => rowWidth(row, settings) + staggerOffset(measuredRows, r, settings)), settings.grid)
    : maxWidth;
  const requiredY = settings.socketLayout === "grid"
    ? measuredRows.length * maxEntryHeight(measuredRows, settings)
      + (measuredRows.length + 1) * settings.marginY
      + measuredRows.length * labelBand(measuredRows, settings)
    : settings.generator === "vertical" && settings.socketLayout === "stagger"
      ? staggerRequiredY(measuredRows, settings)
    : settings.generator === "horizontal" && settings.socketLayout === "compact"
      ? compactRequiredY(measuredRows, settings)
      : sum(rowHeights) + settings.marginY;
  const baseCols = Math.max(1, Math.ceil((requiredX + 0.5) / settings.grid));
  const baseRows = Math.max(1, Math.ceil((requiredY + 0.5) / settings.grid));
  const bodyX = baseCols * settings.grid - 0.5;
  const bodyY = baseRows * settings.grid - 0.5;
  const sockets = [];

  measuredRows.forEach((row, r) => {
    let cursorX = rowLeft(rowWidths[r], bodyX, settings.alignment)
      + staggerOffset(measuredRows, r, settings);
    const baseY = rowTop(requiredY, bodyY, settings.alignment)
      + socketRowY(measuredRows, rowHeights, r, settings);

    row.forEach((entry, c) => {
      if (settings.socketLayout === "grid") {
        cursorX = rowLeft(requiredX, bodyX, settings.alignment) + c * gridPitchX(measuredRows, settings) + gridPitchX(measuredRows, settings) / 2;
      }

      if (!entry.gap) {
        sockets.push({
          ...entry,
          x: settings.socketLayout === "grid" ? cursorX : cursorX + entry.width / 2,
          y: baseY,
        });
      }

      if (settings.socketLayout !== "grid") cursorX += entry.width + settings.marginX;
    });
  });

  return {
    baseCols,
    baseRows,
    bodyX,
    bodyY,
    sockets,
    socketCount: sockets.length,
  };
}

function measureEntry(entry, settings) {
  if (entry.gap) return { ...entry, width: settings.grid / 2, height: settings.grid / 2 };

  const interpreted = interpretEntry(entry, settings);
  const diameter = (Number.isFinite(interpreted.diameter) ? interpreted.diameter : 0) + settings.fitClearance;
  const label = interpreted.label;
  const width = entryWidth({ ...entry, label, diameter }, settings);

  if (settings.generator === "horizontal") {
    const length = Number.isFinite(interpreted.length) ? interpreted.length : diameter;
    return {
      ...entry,
      label,
      diameter,
      length: length + settings.lengthClearance,
      width,
      height: Math.max(length + settings.lengthClearance, diameter),
    };
  }

  return {
    ...entry,
    label,
    diameter,
    width,
    height: diameter,
  };
}

function interpretEntry(entry, settings) {
  const parts = entry.parts || [];
  const numbers = entry.numbers || [];

  if (settings.generator === "horizontal") {
    if (settings.tapered && numbers.length >= 5) {
      return {
        diameter: Math.max(numbers[0], numbers[2]),
        length: numbers[1] + numbers[3],
        label: parts.slice(4).join("/"),
      };
    }

    return {
      diameter: numbers[0],
      length: numbers[1],
      label: parts.slice(2).join("/") || parts.slice(1).join("/") || parts[0],
    };
  }

  if (settings.tapered && numbers.length >= 3) {
    return {
      diameter: Math.max(numbers[0], numbers[1]),
      length: NaN,
      label: parts.slice(2).join("/"),
    };
  }

  return {
    diameter: numbers[0],
    length: NaN,
    label: parts.slice(1).join("/") || parts[0],
  };
}

function drawLayout(model, settings) {
  const pad = 12;
  const viewX = Math.max(model.bodyX, settings.bedX) + pad * 2;
  const viewY = Math.max(model.bodyY, settings.bedY) + pad * 2;
  layoutSvg.setAttribute("viewBox", `0 0 ${viewX} ${viewY}`);
  layoutSvg.style.aspectRatio = `${viewX} / ${viewY}`;
  layoutSvg.innerHTML = "";

  const body = svgNode("rect", {
    class: "grid-body",
    x: pad,
    y: pad,
    width: model.bodyX,
    height: model.bodyY,
    rx: 3,
  });
  layoutSvg.append(body);

  for (let y = 0; y < model.baseRows; y += 1) {
    for (let x = 0; x < model.baseCols; x += 1) {
      layoutSvg.append(svgNode("rect", {
        class: "grid-cell",
        x: pad + x * settings.grid,
        y: pad + y * settings.grid,
        width: settings.grid,
        height: settings.grid,
      }));

      if (settings.magnets || settings.screws) {
        drawCellHardware(pad + x * settings.grid, pad + y * settings.grid, settings);
      }
    }
  }

  layoutSvg.append(svgNode("rect", {
    class: "bed-outline",
    x: pad,
    y: pad,
    width: settings.bedX,
    height: settings.bedY,
    rx: 1.5,
  }));
  layoutSvg.append(svgNode("text", {
    class: "bed-label",
    x: pad + 2,
    y: pad - 3,
  }, `bed ${formatNumber(settings.bedX)}x${formatNumber(settings.bedY)}`));

  model.sockets.forEach((socket) => {
    const x = pad + socket.x;
    const y = pad + socket.y;
    if (settings.generator === "horizontal") {
      layoutSvg.append(svgNode("rect", {
        class: "socket-shape",
        x: x - socket.width / 2,
        y: y - socket.height / 2,
        width: socket.width,
        height: socket.height,
        rx: Math.min(socket.width / 2, 8),
      }));
    } else {
      layoutSvg.append(svgNode("circle", {
        class: "socket-shape",
        cx: x,
        cy: y,
        r: socket.diameter / 2,
      }));
    }

    if (settings.labels && socket.label) {
      const label = labelPlacement(socket, settings);
      layoutSvg.append(svgNode("text", {
        class: `socket-label${label.inside ? " socket-label-inside" : ""}`,
        x: label.x,
        y: label.y,
        transform: label.transform,
        "font-size": label.fontSize,
      }, socket.label));
    }
  });
}

function labelPlacement(socket, settings) {
  const inside = settings.generator === "vertical"
    ? settings.labelInsideVertical
    : settings.labelInsideHorizontal;
  const x = socket.x + 12;
  const y = socket.y + 12;

  if (inside) {
    return {
      x,
      y,
      transform: `rotate(${settings.labelRotation} ${x} ${y})`,
      fontSize: insideLabelSize(socket, settings),
      inside: true,
    };
  }

  const socketBottom = settings.generator === "horizontal"
    ? y + socket.height / 2
    : y + socket.diameter / 2;
  const gap = settings.generator === "horizontal" ? settings.labelSocketGap : settings.labelHoleGap;
  const labelY = socketBottom + gap + settings.labelSize * 0.55;

  return {
    x,
    y: labelY,
    transform: `rotate(${settings.labelRotation} ${x} ${labelY})`,
    fontSize: settings.labelSize,
    inside: false,
  };
}

function insideLabelSize(socket, settings) {
  const available = settings.generator === "horizontal"
    ? Math.min(socket.width, socket.height)
    : socket.diameter;
  const labelLength = Math.max(socket.label.length, 1);
  return Math.max(2.4, Math.min(settings.labelSize, available / Math.max(labelLength * 0.55, 1.8)));
}

function drawCellHardware(x, y, settings) {
  const offset = settings.holeFromEdge;
  const centers = [
    [x + offset, y + offset],
    [x + settings.grid - offset, y + offset],
    [x + offset, y + settings.grid - offset],
    [x + settings.grid - offset, y + settings.grid - offset],
  ];

  centers.forEach(([cx, cy]) => {
    if (settings.magnets) layoutSvg.append(svgNode("circle", { class: "magnet-hole", cx, cy, r: settings.magnetD / 2 }));
    if (settings.screws) layoutSvg.append(svgNode("circle", { class: "screw-hole", cx, cy, r: settings.screwD / 2 }));
  });
}

function svgNode(name, attrs, text = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text) node.textContent = text;
  return node;
}

function gridPitchX(rows, settings) {
  return maxEntryWidth(rows, settings) + settings.marginX;
}

function gridPitchY(rows, settings) {
  return maxEntryHeight(rows, settings) + settings.marginY + labelBand(rows, settings);
}

function maxEntryWidth(rows, settings) {
  const widths = rows.flat().filter((entry) => !entry.gap).map((entry) => entry.width);
  return Math.max(...widths, 0);
}

function maxEntryHeight(rows, settings) {
  const heights = rows.flat().filter((entry) => !entry.gap).map((entry) => entry.height);
  return Math.max(...heights, 0);
}

function rowWidth(row, settings) {
  const active = row.filter((entry) => !entry.gap);
  return sum(active.map((entry) => entry.width)) + settings.marginX * (active.length + 1);
}

function rowMaxHeight(row, settings) {
  const heights = row.filter((entry) => !entry.gap).map((entry) => entry.height);
  return Math.max(...heights, 0);
}

function rowHeight(rows, index, settings) {
  const row = rows[index];
  const height = rowMaxHeight(row, settings);
  if (settings.generator === "vertical" && settings.socketLayout === "compact") {
    const outsideLabels = outsideLabelEnabled(settings);
    const lastRowLabelSpace = settings.labelHoleGap + rowLabelHeight(row, settings);
    return index === rows.length - 1 && outsideLabels
      ? height + Math.max(settings.marginY, lastRowLabelSpace)
      : Math.max(height + settings.marginY, verticalCompactLabelStep(rows, index, settings));
  }
  return height + settings.marginY + labelBand(rows, settings);
}

function rowLabelHeight(row, settings) {
  const heights = row.filter((entry) => !entry.gap).map((entry) => labelHeight(entry, settings));
  return Math.max(...heights, 0);
}

function verticalCompactLabelStep(rows, rowIndex, settings) {
  if (!outsideLabelEnabled(settings) || rowIndex >= rows.length - 1) return 0;
  const clearances = [];
  rows[rowIndex].forEach((entry, labelC) => {
    if (entry.gap) return;
    rows[rowIndex + 1].forEach((nextEntry, holeC) => {
      if (nextEntry.gap || !verticalLabelOverlapsHole(rows, rowIndex, labelC, holeC, settings)) return;
      clearances.push(verticalCompactLabelClearance(rows, rowIndex, labelC, holeC, settings));
    });
  });
  return clearances.length ? Math.max(...clearances) : 0;
}

function verticalLabelOverlapsHole(rows, rowIndex, labelC, holeC, settings) {
  return Math.abs(
    verticalCompactSocketX(rows, rowIndex, labelC, settings)
      - verticalCompactSocketX(rows, rowIndex + 1, holeC, settings)
  ) < labelWidth(rows[rowIndex][labelC], settings) / 2
    + rows[rowIndex + 1][holeC].diameter / 2
    + settings.labelCollision;
}

function verticalCompactLabelClearance(rows, rowIndex, labelC, holeC, settings) {
  return verticalCompactHoleTop(rows, rowIndex + 1, holeC, settings)
    - verticalCompactLabelBottom(rows, rowIndex, labelC, settings)
    + settings.labelCollision;
}

function verticalCompactSocketX(rows, rowIndex, c, settings) {
  return compactRowLeft(rowWidth(rows[rowIndex], settings), settings.alignment)
    + settings.marginX
    + widthsBefore(rows[rowIndex], c, settings)
    + rows[rowIndex][c].diameter / 2;
}

function verticalCompactSocketYFromRowTop(rows, rowIndex, c, settings) {
  const diameter = rows[rowIndex][c].diameter;
  if (settings.alignment.startsWith("top")) return -diameter / 2;
  if (settings.alignment.startsWith("bottom")) return -rowMaxHeight(rows[rowIndex], settings) + diameter / 2;
  return -rowMaxHeight(rows[rowIndex], settings) / 2;
}

function verticalCompactLabelBottom(rows, rowIndex, c, settings) {
  return verticalCompactSocketYFromRowTop(rows, rowIndex, c, settings)
    - rows[rowIndex][c].diameter / 2
    - settings.labelHoleGap
    - labelHeight(rows[rowIndex][c], settings);
}

function verticalCompactHoleTop(rows, rowIndex, c, settings) {
  return verticalCompactSocketYFromRowTop(rows, rowIndex, c, settings)
    + rows[rowIndex][c].diameter / 2;
}

function socketRowY(rows, rowHeights, index, settings) {
  if (settings.socketLayout === "grid") {
    return settings.marginY + maxEntryHeight(rows, settings) / 2
      + index * gridPitchY(rows, settings);
  }

  if (settings.generator === "horizontal" && settings.socketLayout === "compact") {
    return settings.marginY + rowMaxHeight(rows[0], settings) / 2
      + compactStepsBefore(rows, index, settings);
  }

  if (settings.generator === "vertical" && settings.socketLayout === "stagger") {
    return settings.marginY + rowMaxHeight(rows[0], settings) / 2
      + staggerStepsBefore(rows, index, settings);
  }

  return settings.marginY + sum(rowHeights.slice(0, index))
    + rowMaxHeight(rows[index], settings) / 2;
}

function staggerOffset(rows, index, settings) {
  return settings.generator === "vertical" && settings.socketLayout === "stagger" && index % 2 === 1
    ? gridPitchX(rows, settings) / 2
    : 0;
}

function staggerRequiredY(rows, settings) {
  if (!rows.length) return 0;
  return settings.marginY
    + rowMaxHeight(rows[0], settings) / 2
    + staggerStepsBefore(rows, rows.length - 1, settings)
    + rowMaxHeight(rows[rows.length - 1], settings) / 2
    + settings.marginY;
}

function staggerStepsBefore(rows, index, settings) {
  let total = 0;
  for (let r = 0; r < index; r += 1) {
    total += staggerPairStep(rows, r, settings);
  }
  return total;
}

function staggerPairStep(rows, rowIndex, settings) {
  if (rowIndex >= rows.length - 1) return 0;
  if (outsideLabelEnabled(settings)) {
    return rowMaxHeight(rows[rowIndex], settings) / 2
      + rowMaxHeight(rows[rowIndex + 1], settings) / 2
      + labelBand(rows, settings)
      + settings.marginY;
  }

  const clearances = [];
  rows[rowIndex].forEach((entry, c) => {
    if (entry.gap) return;
    rows[rowIndex + 1].forEach((nextEntry, nextC) => {
      if (nextEntry.gap) return;
      clearances.push(staggerPairClearance(rows, rowIndex, c, nextC, settings));
    });
  });

  return clearances.length
    ? Math.max(...clearances)
    : rowMaxHeight(rows[rowIndex], settings) / 2
      + rowMaxHeight(rows[rowIndex + 1], settings) / 2
      + settings.marginY;
}

function staggerPairClearance(rows, rowIndex, c, nextC, settings) {
  const a = rows[rowIndex][c].diameter;
  const b = rows[rowIndex + 1][nextC].diameter;
  const minCenter = a / 2 + b / 2 + settings.marginY;
  const dx = Math.abs(
    staggerSocketLocalX(rows, rowIndex, c, settings)
      - staggerSocketLocalX(rows, rowIndex + 1, nextC, settings)
  );
  return dx >= minCenter ? 0 : Math.sqrt(minCenter * minCenter - dx * dx);
}

function staggerSocketLocalX(rows, rowIndex, c, settings) {
  return staggerOffset(rows, rowIndex, settings)
    + settings.marginX
    + widthsBefore(rows[rowIndex], c, settings)
    + rows[rowIndex][c].width / 2;
}

function compactRequiredY(rows, settings) {
  if (!rows.length) return 0;
  return settings.marginY
    + rowMaxHeight(rows[0], settings) / 2
    + compactStepsBefore(rows, rows.length - 1, settings)
    + rowMaxHeight(rows[rows.length - 1], settings) / 2
    + settings.marginY
    + labelBand(rows, settings);
}

function compactStepsBefore(rows, index, settings) {
  let total = 0;
  for (let r = 0; r < index; r += 1) {
    total += compactPairStep(rows, r, settings);
  }
  return total;
}

function compactPairStep(rows, rowIndex, settings) {
  if (rowIndex >= rows.length - 1) return 0;
  if (outsideLabelEnabled(settings)) {
    return rowMaxHeight(rows[rowIndex], settings) / 2
      + rowMaxHeight(rows[rowIndex + 1], settings) / 2
      + labelBand(rows, settings)
      + settings.marginY;
  }

  const clearances = [];
  rows[rowIndex].forEach((entry, c) => {
    if (entry.gap) return;
    rows[rowIndex + 1].forEach((nextEntry, nextC) => {
      if (nextEntry.gap) return;
      clearances.push(compactPairClearance(rows, rowIndex, c, nextC, settings));
    });
  });

  return clearances.length
    ? Math.max(...clearances)
    : rowMaxHeight(rows[rowIndex], settings) / 2
      + rowMaxHeight(rows[rowIndex + 1], settings) / 2
      + settings.marginY;
}

function compactPairClearance(rows, rowIndex, c, nextC, settings) {
  return compactCradlesOverlapX(rows, rowIndex, c, nextC, settings)
    ? rows[rowIndex][c].height / 2
      + rows[rowIndex + 1][nextC].height / 2
      + settings.marginY
    : 0;
}

function compactCradlesOverlapX(rows, rowIndex, c, nextC, settings) {
  return Math.abs(
    compactSocketLocalX(rows, rowIndex, c, settings)
      - compactSocketLocalX(rows, rowIndex + 1, nextC, settings)
  ) < rows[rowIndex][c].diameter / 2
    + rows[rowIndex + 1][nextC].diameter / 2
    + settings.marginX;
}

function compactSocketLocalX(rows, rowIndex, c, settings) {
  return compactRowLeft(rowWidth(rows[rowIndex], settings), settings.alignment)
    + settings.marginX
    + widthsBefore(rows[rowIndex], c, settings)
    + rows[rowIndex][c].width / 2;
}

function compactRowLeft(width, alignment) {
  if (alignment.endsWith("left")) return 0;
  if (alignment.endsWith("right")) return -width;
  return -width / 2;
}

function widthsBefore(row, index, settings) {
  return sum(row.slice(0, index)
    .filter((entry) => !entry.gap)
    .map((entry) => entry.width + settings.marginX));
}

function outsideLabelEnabled(settings) {
  if (!settings.labels) return false;
  if (settings.generator === "vertical") return !settings.labelInsideVertical;
  return !settings.labelInsideHorizontal;
}

function labelBand(rows, settings) {
  if (!outsideLabelEnabled(settings)) return 0;
  if (settings.generator === "vertical" && settings.socketLayout === "compact") return 0;
  const labels = rows.flat().filter((entry) => !entry.gap && entry.label);
  const labelHeight = settings.labelRotation === 90 || settings.labelRotation === 270
    ? Math.max(...labels.map((entry) => labelTextWidth(entry, settings)), 0)
    : settings.labelSize;
  const gap = settings.generator === "vertical" ? settings.labelHoleGap : settings.labelSocketGap;
  return labelHeight + gap;
}

function labelWidth(entry, settings) {
  if (!outsideLabelEnabled(settings) || !entry.label) return 0;
  if (settings.labelRotation === 90 || settings.labelRotation === 270) return settings.labelSize;
  return labelTextWidth(entry, settings);
}

function labelHeight(entry, settings) {
  if (!outsideLabelEnabled(settings) || !entry.label) return 0;
  if (settings.labelRotation === 90 || settings.labelRotation === 270) return labelTextWidth(entry, settings);
  return settings.labelSize;
}

function labelTextWidth(entry, settings) {
  const scale = settings.generator === "horizontal" ? 0.8 : 0.65;
  return String(entry.label || "").length * settings.labelSize * scale;
}

function entryWidth(entry, settings) {
  if (!outsideLabelEnabled(settings)) return entry.diameter;
  return Math.max(entry.diameter, labelWidth(entry, settings) + settings.labelCollision);
}

function rowLeft(rowWidth, bodyX, alignment) {
  if (alignment.endsWith("left")) return 0;
  if (alignment.endsWith("right")) return Math.max(0, bodyX - rowWidth);
  return Math.max(0, (bodyX - rowWidth) / 2);
}

function rowTop(requiredY, bodyY, alignment) {
  if (alignment.startsWith("top")) return 0;
  if (alignment.startsWith("bottom")) return Math.max(0, bodyY - requiredY);
  return Math.max(0, (bodyY - requiredY) / 2);
}

function numberValue(selector, fallback) {
  const value = parseNumber(document.querySelector(selector).value);
  return Number.isFinite(value) ? value : fallback;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function buildReplacementOutput(settings) {
  const lines = [
    layoutInput.value.trim().replace(/;?\s*$/, ";"),
    "",
    "// ---- INPUT ----",
    `$fn = 96;`,
    `Enable_tapered_socket = ${settings.tapered ? 1 : 0};`,
    `Enabled_magnet = ${settings.magnets ? 1 : 0};`,
    `Enabled_labels = ${settings.labels ? 1 : 0};`,
    `Enabled_screw_holes = ${settings.screws ? 1 : 0};`,
    `margin_x = ${formatSettingNumber(settings.marginX)};`,
    `margin_y = ${formatSettingNumber(settings.marginY)};`,
    `bed_size = "${formatNumber(settings.bedX)}X${formatNumber(settings.bedY)}";`,
    `height = ${formatSettingNumber(settings.height)};`,
    `Alignment = "${settings.alignment}";`,
    `socket_layout = "${settings.socketLayout}";`,
    "",
    "// ---- Label SETTINGS ----",
  ];

  if (settings.generator === "vertical") {
    lines.push(`Label_in_socket_hole = ${settings.labelInsideVertical ? 1 : 0};`);
  } else {
    lines.push(`Label_in_socket_cradle = ${settings.labelInsideHorizontal ? 1 : 0};`);
  }

  lines.push(
    `label_rotation = ${formatSettingNumber(settings.labelRotation)};`,
    settings.generator === "horizontal" ? `label_cradle_scale = ${formatSettingNumber(settings.cradleScale)};` : "",
    settings.generator === "horizontal" ? `label_cradle_pocket_margin = ${formatSettingNumber(settings.cradlePocketMargin)};` : "",
    settings.generator === "horizontal" ? `label_cradle_pocket_depth = ${formatSettingNumber(settings.cradlePocketDepth)};` : "",
    `label_size = ${formatSettingNumber(settings.labelSize)};`,
    `label_depth = ${formatSettingNumber(settings.labelDepth)};`,
    settings.generator === "vertical" ? `label_hole_gap = ${formatSettingNumber(settings.labelHoleGap)};` : `label_socket_gap = ${formatSettingNumber(settings.labelSocketGap)};`,
    `label_collision_clearance = ${formatSettingNumber(settings.labelCollision)};`,
    "",
    settings.generator === "vertical" ? "// ---- SOCKET SETTINGS ----" : "// ---- SOCKET CRADLE SETTINGS ----",
    `fit_clearance = ${formatSettingNumber(settings.fitClearance)};`,
    settings.generator === "horizontal" ? `length_clearance = ${formatSettingNumber(settings.lengthClearance)};` : "",
    settings.generator === "horizontal" ? `recess_fraction = ${formatSettingNumber(settings.recessFraction)};` : "",
    settings.generator === "vertical" ? `hole_depth = ${formatSettingNumber(settings.holeDepth)};` : "",
    `floor_thickness = ${formatSettingNumber(settings.floorThickness)};`,
    "",
    "// ---- GRIDFINITY BASE ----",
    `grid = ${formatSettingNumber(settings.grid)};`,
    `base_h = ${formatSettingNumber(settings.baseH)};`,
    `base_profile_h = ${formatSettingNumber(settings.baseProfileH)};`,
    `base_bridge_h = base_h - base_profile_h;`,
    `base_top = ${formatSettingNumber(settings.baseTop)};`,
    `base_bottom = ${formatSettingNumber(settings.baseBottom)};`,
    `base_r_top = ${formatSettingNumber(settings.baseRTop)};`,
    `base_r_bottom = ${formatSettingNumber(settings.baseRBottom)};`,
    "",
    "// ---- MAGNETS AND SCREWS ----",
    `magnet_d = ${formatSettingNumber(settings.magnetD)};`,
    `magnet_h = ${formatSettingNumber(settings.magnetH)};`,
    `screw_d = ${formatSettingNumber(settings.screwD)};`,
    `screw_h = ${formatSettingNumber(settings.screwH)};`,
    `hole_from_cell_edge = ${formatSettingNumber(settings.holeFromEdge)};`,
  );

  return lines.filter((line) => line !== "").join("\n");
}

function formatSettingNumber(value) {
  return formatNumber(value);
}
