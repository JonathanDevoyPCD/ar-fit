const printTitle = document.querySelector("#print-title");
const printRegion = document.querySelector("#print-region");
const printDescription = document.querySelector("#print-description");
const printLegs = document.querySelector("#print-legs");
const printCheckpoints = document.querySelector("#print-checkpoints");
const printTransitions = document.querySelector("#print-transitions");

function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("slug") || "").trim();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPrint(bundle) {
  printTitle.textContent = bundle.course.name;
  printRegion.textContent = bundle.course.region || "";
  printDescription.textContent = bundle.course.description || "";

  printLegs.innerHTML = bundle.legs.length
    ? bundle.legs.map((leg) => `<p><strong>Leg ${leg.legIndex}</strong> - ${escapeHtml(leg.name)} (${escapeHtml(leg.discipline)})${leg.targetMinutes ? ` • ${leg.targetMinutes} min` : ""}</p>`).join("")
    : "<p>No legs configured.</p>";

  const legById = new Map(bundle.legs.map((leg) => [leg.id, leg]));
  const ordered = (bundle.checkpoints || []).slice().sort((a, b) => {
    const aIndex = legById.get(a.legId)?.legIndex || 0;
    const bIndex = legById.get(b.legId)?.legIndex || 0;
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    return a.sequence - b.sequence;
  });

  printCheckpoints.innerHTML = ordered.length
    ? ordered.map((point) => {
      const leg = legById.get(point.legId);
      return `
        <tr>
          <td>${leg ? leg.legIndex : "-"}</td>
          <td>${point.sequence}</td>
          <td>${escapeHtml(point.code)}</td>
          <td>${escapeHtml(point.name)}</td>
          <td>${point.latitude}</td>
          <td>${point.longitude}</td>
          <td>${point.radiusM}</td>
        </tr>
      `;
    }).join("")
    : '<tr><td colspan="7">No checkpoints configured.</td></tr>';

  printTransitions.innerHTML = (bundle.transitions || []).length
    ? bundle.transitions.map((transition) => {
      const from = legById.get(transition.fromLegId);
      const to = legById.get(transition.toLegId);
      return `<p><strong>${escapeHtml(transition.discipline)}</strong> - ${escapeHtml(from?.name || "Leg")} → ${escapeHtml(to?.name || "Leg")}</p>`;
    }).join("")
    : "<p>No transitions configured.</p>";
}

async function initializePrintPage() {
  if (!window.ARFIT_API?.isConfigured()) {
    printTitle.textContent = "API Not Configured";
    return;
  }

  const slug = getSlug();
  if (!slug) {
    printTitle.textContent = "Missing Course Slug";
    return;
  }

  try {
    const bundle = await window.ARFIT_API.getPublicCourse(slug);
    renderPrint(bundle);
    window.setTimeout(() => {
      window.print();
    }, 150);
  } catch (error) {
    printTitle.textContent = "Unable To Load Course";
    printDescription.textContent = error.message;
  }
}

void initializePrintPage();
