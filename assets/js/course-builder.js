const courseSelect = document.querySelector("#course-select");
const courseForm = document.querySelector("#course-form");
const createCourseButton = document.querySelector("#create-course");
const legForm = document.querySelector("#leg-form");
const checkpointForm = document.querySelector("#checkpoint-form");
const transitionForm = document.querySelector("#transition-form");
const checkpointLegSelect = document.querySelector("#checkpoint-leg");
const fromLegSelect = document.querySelector("#from-leg");
const toLegSelect = document.querySelector("#to-leg");
const accessHeading = document.querySelector("#builder-access");
const accessCopy = document.querySelector("#builder-access-copy");
const feedback = document.querySelector("#builder-feedback");
const summary = document.querySelector("#builder-summary");

const state = {
  session: null,
  courses: [],
  selectedCourseId: "",
  bundle: null,
  map: null,
  layerGroup: null,
};

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setFeedback(message) {
  feedback.textContent = message;
}

function ensureBuilderAccess() {
  if (!window.ARFIT_API?.isConfigured()) {
    throw new Error("API is not configured.");
  }
}

function renderCourseOptions() {
  const options = ['<option value="">Select a course...</option>']
    .concat(state.courses.map((course) => `<option value="${course.id}">${escapeHtml(course.name)} (${escapeHtml(course.status)})</option>`));
  courseSelect.innerHTML = options.join("");
  courseSelect.value = state.selectedCourseId || "";
}

function mapLegOptions(legs) {
  return ['<option value="">Select leg...</option>']
    .concat(legs.map((leg) => `<option value="${leg.id}">Leg ${leg.legIndex} - ${escapeHtml(leg.name)}</option>`))
    .join("");
}

function renderLegSelectors() {
  const legs = state.bundle?.legs || [];
  const optionMarkup = mapLegOptions(legs);
  checkpointLegSelect.innerHTML = optionMarkup;
  fromLegSelect.innerHTML = optionMarkup;
  toLegSelect.innerHTML = optionMarkup;
}

function renderSummary() {
  const bundle = state.bundle;
  if (!bundle) {
    summary.innerHTML = '<div class="empty-slot">Choose or create a course to start building.</div>';
    return;
  }

  summary.innerHTML = `
    <article class="course-summary-card">
      <h3>${escapeHtml(bundle.course.name)}</h3>
      <p>Status: ${escapeHtml(bundle.course.status)} • Slug: ${escapeHtml(bundle.course.slug)}</p>
      <p>${bundle.legs.length} legs • ${bundle.checkpoints.length} checkpoints • ${bundle.transitions.length} transitions</p>
      <a class="ghost-button full-width" href="course.html?slug=${encodeURIComponent(bundle.course.slug)}" target="_blank" rel="noopener">Open Public View</a>
    </article>
  `;
}

function renderMap() {
  if (!state.map) {
    state.map = L.map("builder-map", { scrollWheelZoom: true }).setView([-25.75, 28.19], 9);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(state.map);
    state.layerGroup = L.layerGroup().addTo(state.map);
    state.map.on("click", (event) => {
      checkpointForm.elements.latitude.value = event.latlng.lat.toFixed(6);
      checkpointForm.elements.longitude.value = event.latlng.lng.toFixed(6);
    });
  }

  state.layerGroup.clearLayers();
  const bundle = state.bundle;
  if (!bundle) {
    return;
  }

  const legsById = new Map(bundle.legs.map((leg) => [leg.id, leg]));
  const grouped = new Map();
  const bounds = [];

  bundle.checkpoints.forEach((checkpoint) => {
    if (!grouped.has(checkpoint.legId)) {
      grouped.set(checkpoint.legId, []);
    }
    grouped.get(checkpoint.legId).push(checkpoint);
    const marker = L.circleMarker([checkpoint.latitude, checkpoint.longitude], {
      radius: 6,
      color: "#ff4c2e",
      fillColor: "#ff4c2e",
      fillOpacity: 0.9,
    });
    marker.bindPopup(
      `<strong>${escapeHtml(checkpoint.code)}</strong><br>${escapeHtml(checkpoint.name)}<br>${escapeHtml(legsById.get(checkpoint.legId)?.name || "Leg")}`
    );
    marker.addTo(state.layerGroup);
    bounds.push([checkpoint.latitude, checkpoint.longitude]);
  });

  bundle.legs.forEach((leg) => {
    const points = (grouped.get(leg.id) || []).slice().sort((a, b) => a.sequence - b.sequence);
    if (points.length >= 2) {
      L.polyline(points.map((point) => [point.latitude, point.longitude]), {
        color: "#ff7b2f",
        weight: 3,
      }).addTo(state.layerGroup);
    }
  });

  if (bounds.length) {
    state.map.fitBounds(bounds, { padding: [20, 20] });
  }
}

async function loadSession() {
  const response = await window.ARFIT_API.getSession();
  state.session = response.session;
  const user = state.session?.user;
  if (!user) {
    accessHeading.textContent = "Sign In Required";
    accessCopy.textContent = "Sign in as an organizer to create and manage virtual courses.";
    throw new Error("Sign in required.");
  }
  if (!user.isOrganizer) {
    accessHeading.textContent = "Organizer Access Required";
    accessCopy.textContent = "Your account does not have organizer access yet.";
    throw new Error("Organizer access required.");
  }

  accessHeading.textContent = "Organizer Active";
  accessCopy.textContent = `Signed in as ${user.username || user.email}.`;
}

async function loadCourses() {
  const response = await window.ARFIT_API.getMyCourses();
  state.courses = Array.isArray(response.courses) ? response.courses : [];
  renderCourseOptions();
}

async function loadSelectedCourse() {
  if (!state.selectedCourseId) {
    state.bundle = null;
    renderLegSelectors();
    renderSummary();
    renderMap();
    return;
  }

  const response = await window.ARFIT_API.getCourse(state.selectedCourseId);
  state.bundle = response;
  courseForm.elements.name.value = response.course.name || "";
  courseForm.elements.region.value = response.course.region || "";
  courseForm.elements.slug.value = response.course.slug || "";
  courseForm.elements.description.value = response.course.description || "";
  courseForm.elements.status.value = response.course.status || "draft";
  renderLegSelectors();
  renderSummary();
  renderMap();
}

async function handleCreateCourse() {
  const name = String(courseForm.elements.name.value || "").trim();
  const region = String(courseForm.elements.region.value || "").trim();
  const slug = String(courseForm.elements.slug.value || "").trim();
  const description = String(courseForm.elements.description.value || "").trim();
  if (!name) {
    setFeedback("Course name is required.");
    return;
  }

  const response = await window.ARFIT_API.createCourse({ name, region, slug, description });
  setFeedback(`Course "${response.course.name}" created.`);
  await loadCourses();
  state.selectedCourseId = response.course.id;
  renderCourseOptions();
  await loadSelectedCourse();
}

async function handleSaveCourse(event) {
  event.preventDefault();
  if (!state.selectedCourseId) {
    setFeedback("Create or select a course first.");
    return;
  }
  const payload = {
    name: String(courseForm.elements.name.value || "").trim(),
    region: String(courseForm.elements.region.value || "").trim(),
    slug: String(courseForm.elements.slug.value || "").trim(),
    description: String(courseForm.elements.description.value || "").trim(),
    status: String(courseForm.elements.status.value || "draft"),
  };
  await window.ARFIT_API.updateCourse(state.selectedCourseId, payload);
  setFeedback("Course metadata updated.");
  await loadCourses();
  await loadSelectedCourse();
}

async function handleSaveLeg(event) {
  event.preventDefault();
  if (!state.selectedCourseId) {
    setFeedback("Select a course first.");
    return;
  }

  const payload = {
    legIndex: Number(legForm.elements.legIndex.value),
    name: String(legForm.elements.name.value || "").trim(),
    discipline: String(legForm.elements.discipline.value || "other"),
    targetMinutes: legForm.elements.targetMinutes.value,
    notes: String(legForm.elements.notes.value || "").trim(),
  };
  await window.ARFIT_API.upsertLeg(state.selectedCourseId, payload);
  setFeedback("Leg saved.");
  legForm.reset();
  await loadSelectedCourse();
}

async function handleSaveCheckpoint(event) {
  event.preventDefault();
  if (!state.selectedCourseId) {
    setFeedback("Select a course first.");
    return;
  }

  const payload = {
    legId: String(checkpointForm.elements.legId.value || ""),
    sequence: Number(checkpointForm.elements.sequence.value),
    code: String(checkpointForm.elements.code.value || "").trim(),
    name: String(checkpointForm.elements.name.value || "").trim(),
    latitude: Number(checkpointForm.elements.latitude.value),
    longitude: Number(checkpointForm.elements.longitude.value),
    radiusM: Number(checkpointForm.elements.radiusM.value || 25),
    notes: String(checkpointForm.elements.notes.value || "").trim(),
  };
  await window.ARFIT_API.upsertCheckpoint(state.selectedCourseId, payload);
  setFeedback("Checkpoint saved.");
  checkpointForm.reset();
  await loadSelectedCourse();
}

async function handleSaveTransition(event) {
  event.preventDefault();
  if (!state.selectedCourseId) {
    setFeedback("Select a course first.");
    return;
  }

  const payload = {
    fromLegId: String(transitionForm.elements.fromLegId.value || ""),
    toLegId: String(transitionForm.elements.toLegId.value || ""),
    discipline: String(transitionForm.elements.discipline.value || "other"),
    notes: String(transitionForm.elements.notes.value || "").trim(),
  };
  await window.ARFIT_API.upsertTransition(state.selectedCourseId, payload);
  setFeedback("Transition saved.");
  transitionForm.reset();
  await loadSelectedCourse();
}

courseSelect.addEventListener("change", async () => {
  state.selectedCourseId = String(courseSelect.value || "");
  setFeedback("");
  try {
    await loadSelectedCourse();
  } catch (error) {
    setFeedback(error.message);
  }
});

createCourseButton.addEventListener("click", () => {
  void (async () => {
    try {
      setFeedback("");
      await handleCreateCourse();
    } catch (error) {
      setFeedback(error.message);
    }
  })();
});

courseForm.addEventListener("submit", (event) => {
  void (async () => {
    try {
      setFeedback("");
      await handleSaveCourse(event);
    } catch (error) {
      setFeedback(error.message);
    }
  })();
});

legForm.addEventListener("submit", (event) => {
  void (async () => {
    try {
      setFeedback("");
      await handleSaveLeg(event);
    } catch (error) {
      setFeedback(error.message);
    }
  })();
});

checkpointForm.addEventListener("submit", (event) => {
  void (async () => {
    try {
      setFeedback("");
      await handleSaveCheckpoint(event);
    } catch (error) {
      setFeedback(error.message);
    }
  })();
});

transitionForm.addEventListener("submit", (event) => {
  void (async () => {
    try {
      setFeedback("");
      await handleSaveTransition(event);
    } catch (error) {
      setFeedback(error.message);
    }
  })();
});

async function initializeBuilder() {
  try {
    ensureBuilderAccess();
    renderMap();
    await loadSession();
    await loadCourses();
    if (state.courses.length) {
      state.selectedCourseId = state.courses[0].id;
      renderCourseOptions();
      await loadSelectedCourse();
    } else {
      renderSummary();
      renderLegSelectors();
    }
  } catch (error) {
    setFeedback(error.message);
    renderMap();
    renderSummary();
  }
}

void initializeBuilder();
