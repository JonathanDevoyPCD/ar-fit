const courseTitle = document.querySelector("#course-title");
const courseDescription = document.querySelector("#course-description");
const courseLegs = document.querySelector("#course-legs");
const courseTransitions = document.querySelector("#course-transitions");
const geoJsonLink = document.querySelector("#download-geojson");
const gpxLink = document.querySelector("#download-gpx");
const printLink = document.querySelector("#print-course");

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("slug") || "").trim();
}

function groupCheckpointsByLeg(checkpoints) {
  const grouped = new Map();
  checkpoints.forEach((checkpoint) => {
    if (!grouped.has(checkpoint.legId)) {
      grouped.set(checkpoint.legId, []);
    }
    grouped.get(checkpoint.legId).push(checkpoint);
  });
  return grouped;
}

function renderLegs(legs, checkpoints) {
  const grouped = groupCheckpointsByLeg(checkpoints);
  if (!legs.length) {
    courseLegs.innerHTML = '<div class="empty-slot">No legs configured.</div>';
    return;
  }

  courseLegs.innerHTML = legs.map((leg) => {
    const points = (grouped.get(leg.id) || []).sort((a, b) => a.sequence - b.sequence);
    return `
      <article class="course-leg-card">
        <h3>Leg ${leg.legIndex}: ${escapeHtml(leg.name)}</h3>
        <p><strong>${escapeHtml(leg.discipline)}</strong>${leg.targetMinutes ? ` • Target ${leg.targetMinutes} min` : ""}</p>
        <ul class="clean-list">
          ${points.length
            ? points.map((point) => `<li>${escapeHtml(point.code)} - ${escapeHtml(point.name)}</li>`).join("")
            : "<li>No checkpoints yet.</li>"}
        </ul>
      </article>
    `;
  }).join("");
}

function renderTransitions(transitions, legs) {
  const legsById = new Map(legs.map((leg) => [leg.id, leg]));
  if (!transitions.length) {
    courseTransitions.innerHTML = '<div class="empty-slot">No transitions configured.</div>';
    return;
  }

  courseTransitions.innerHTML = transitions.map((transition) => {
    const from = legsById.get(transition.fromLegId);
    const to = legsById.get(transition.toLegId);
    return `
      <article class="course-transition-card">
        <h3>${escapeHtml(transition.discipline)} transition</h3>
        <p>${escapeHtml(from?.name || "Leg")} → ${escapeHtml(to?.name || "Leg")}</p>
        ${transition.notes ? `<p>${escapeHtml(transition.notes)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderMap(bundle) {
  const map = L.map("course-map", { scrollWheelZoom: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const colorByDiscipline = {
    bike: "#ff4c2e",
    hike: "#ff7b2f",
    kayak: "#5cc2ff",
    run: "#ffd166",
    trek: "#8ec07c",
    other: "#cfada5",
  };

  const checkpointsByLeg = groupCheckpointsByLeg(bundle.checkpoints);
  const bounds = [];

  bundle.legs.forEach((leg) => {
    const points = (checkpointsByLeg.get(leg.id) || [])
      .slice()
      .sort((a, b) => a.sequence - b.sequence);

    const latLngs = points.map((point) => {
      bounds.push([point.latitude, point.longitude]);
      L.circleMarker([point.latitude, point.longitude], {
        radius: 7,
        color: colorByDiscipline[leg.discipline] || "#ff4c2e",
        fillColor: colorByDiscipline[leg.discipline] || "#ff4c2e",
        fillOpacity: 0.9,
      }).bindPopup(`<strong>${escapeHtml(point.code)}</strong><br>${escapeHtml(point.name)}<br>Leg ${leg.legIndex}`).addTo(map);
      return [point.latitude, point.longitude];
    });

    if (latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: colorByDiscipline[leg.discipline] || "#ff4c2e",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);
    }
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [24, 24] });
  } else {
    map.setView([-25.75, 28.19], 9);
  }
}

async function initializeCourseDetail() {
  if (!window.ARFIT_API?.isConfigured()) {
    courseDescription.textContent = "API is not configured.";
    return;
  }

  const slug = getSlug();
  if (!slug) {
    courseDescription.textContent = "Missing course slug.";
    return;
  }

  geoJsonLink.href = `${window.ARFIT_API.getBaseUrl()}/courses/public/${encodeURIComponent(slug)}/export.geojson`;
  gpxLink.href = `${window.ARFIT_API.getBaseUrl()}/courses/public/${encodeURIComponent(slug)}/export.gpx`;
  printLink.href = `course-print.html?slug=${encodeURIComponent(slug)}`;

  try {
    const bundle = await window.ARFIT_API.getPublicCourse(slug);
    courseTitle.textContent = bundle.course.name;
    courseDescription.textContent = bundle.course.description || "No description provided.";
    renderLegs(bundle.legs || [], bundle.checkpoints || []);
    renderTransitions(bundle.transitions || [], bundle.legs || []);
    renderMap(bundle);
  } catch (error) {
    courseDescription.textContent = error.message;
    courseLegs.innerHTML = "";
    courseTransitions.innerHTML = "";
  }
}

void initializeCourseDetail();
