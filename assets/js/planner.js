const STORAGE_KEY = "arfit-week-planner-v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_ITEMS = [
  { day: 0, type: "workout", time: "06:00", title: "Cycle + Gym", notes: "1 hour cycling session and 30 to 45 minutes of gym work later if energy is good." },
  { day: 1, type: "workout", time: "06:00", title: "Run + Core", notes: "1 hour run followed by gentle core training and light lower-body mobility work." },
  { day: 2, type: "workout", time: "06:00", title: "Cycle + HIIT", notes: "1 hour cycle with optional 20 to 30 minute HIIT or upper-body gym work." },
  { day: 3, type: "workout", time: "06:00", title: "Run + Strength", notes: "1 hour run plus light strength work while keeping knee strain controlled." },
  { day: 4, type: "workout", time: "07:00", title: "Recovery Day", notes: "Rest, stretch, walk lightly, and focus on hydration and mobility." },
  { day: 5, type: "workout", time: "07:00", title: "Long Ride", notes: "Long cycle session around 3 hours with steady pacing and proper fueling." },
  { day: 6, type: "workout", time: "08:00", title: "Reset", notes: "Full rest or very light stretching to recover before the next week." },
  { day: 0, type: "meal", time: "12:30", title: "Main Clean Meal", notes: "Keep lunch protein-based with carbs and vegetables." },
  { day: 1, type: "meal", time: "12:30", title: "Main Clean Meal", notes: "Use a simple repeatable meal you can stick to easily." },
  { day: 2, type: "meal", time: "12:30", title: "Main Clean Meal", notes: "Protein, couscous or similar carbs, and vegetables works well here." },
  { day: 3, type: "meal", time: "12:30", title: "Main Clean Meal", notes: "Keep portions supportive of weight loss and evening training." },
  { day: 4, type: "meal", time: "12:30", title: "Recovery Meal Focus", notes: "Keep food simple, hydrate well, and avoid overeating on the lighter day." },
  { day: 5, type: "meal", time: "12:30", title: "Ride Fuel Meal", notes: "Plan your main meal around the long ride so energy stays stable." },
  { day: 6, type: "meal", time: "12:30", title: "Reset Meal Prep", notes: "Use Sunday to keep meals structured and prep for the coming week." },
];

const state = {
  localData: loadLocalPlannerData(),
  weekStart: getStartOfWeek(new Date()),
  expandedDays: createInitialExpandedDays(),
  session: null,
  storageMode: "local",
};

const weekGrid = document.querySelector("#week-grid");
const plannerCalendar = document.querySelector(".planner-calendar");
const weekLabel = document.querySelector("#week-label");
const weekCaption = document.querySelector("#week-caption");
const scoreRing = document.querySelector(".score-ring");
const scoreValue = document.querySelector("#score-value");
const plannedCount = document.querySelector("#planned-count");
const completedCount = document.querySelector("#completed-count");
const skippedCount = document.querySelector("#skipped-count");
const pendingCount = document.querySelector("#pending-count");
const plannerForm = document.querySelector("#planner-form");
const formHeading = document.querySelector("#form-heading");
const cancelEditButton = document.querySelector("#cancel-edit");
const feedback = document.querySelector("#planner-feedback");
const prevWeekButton = document.querySelector("#prev-week");
const nextWeekButton = document.querySelector("#next-week");
const currentWeekButton = document.querySelector("#current-week");
const loadDefaultsButton = document.querySelector("#load-defaults");
const plannerAccountHeading = document.querySelector("#planner-account-heading");
const plannerAccountCopy = document.querySelector("#planner-account-copy");
const plannerAuthLink = document.querySelector("#planner-auth-link");
const importLocalDataButton = document.querySelector("#import-local-data");
let touchStartPoint = null;

const longDateFormatter = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function loadLocalPlannerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveLocalPlannerData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.localData));
}

function hasLocalPlannerData() {
  return Object.values(state.localData).some((items) => Array.isArray(items) && items.length);
}

function getStartOfWeek(inputDate) {
  const date = new Date(inputDate);
  date.setHours(0, 0, 0, 0);
  const dayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOffset);
  return date;
}

function createInitialExpandedDays() {
  return {};
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatWeekKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalWeekItems() {
  const key = formatWeekKey(state.weekStart);
  if (!Array.isArray(state.localData[key])) {
    state.localData[key] = [];
  }
  return state.localData[key];
}

function getWeekRangeLabel() {
  const weekEnd = addDays(state.weekStart, 6);
  return `${longDateFormatter.format(state.weekStart)} - ${longDateFormatter.format(weekEnd)}`;
}

function getScore(items) {
  const planned = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const skipped = items.filter((item) => item.status === "skipped").length;
  const pending = planned - completed - skipped;
  const score = planned > 0 ? Math.round((completed / planned) * 100) : 0;
  return { planned, completed, skipped, pending, score };
}

function sortItems(items) {
  return [...items].sort((first, second) => {
    const firstTime = first.time || "99:99";
    const secondTime = second.time || "99:99";
    if (first.day !== second.day) {
      return first.day - second.day;
    }
    if (firstTime !== secondTime) {
      return firstTime.localeCompare(secondTime);
    }
    return first.title.localeCompare(second.title);
  });
}

function formatTimeLabel(time) {
  if (!time) {
    return "Any time";
  }

  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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

function resetForm() {
  plannerForm.reset();
  plannerForm.elements.itemId.value = "";
  plannerForm.elements.type.value = "workout";
  plannerForm.elements.day.value = "0";
  formHeading.textContent = "New Item";
  cancelEditButton.hidden = true;
}

function renderScore(items) {
  const score = getScore(items);
  if (scoreRing) {
    scoreRing.style.setProperty("--score-progress", `${score.score}%`);
  }
  scoreValue.textContent = `${score.score}%`;
  plannedCount.textContent = String(score.planned);
  completedCount.textContent = String(score.completed);
  skippedCount.textContent = String(score.skipped);
  pendingCount.textContent = String(score.pending);
}

function createItemMarkup(item) {
  const safeTitle = escapeHtml(item.title);
  const safeNotes = escapeHtml(item.notes || "");
  const status = item.status || "pending";

  return `
    <article class="planner-item ${status !== "pending" ? `is-${status}` : ""}" data-item-id="${item.id}">
      <div class="planner-item-head">
        <span class="type-pill ${item.type}">${item.type}</span>
        <span class="item-time">${escapeHtml(formatTimeLabel(item.time))}</span>
      </div>
      <div class="planner-item-copy">
        <h3>${safeTitle}</h3>
        ${safeNotes ? `<p>${safeNotes}</p>` : ""}
      </div>
      <div class="status-row">
        <button class="status-button ${status === "completed" ? "active" : ""}" type="button" data-action="status" data-status="completed" aria-pressed="${status === "completed"}">Completed</button>
        <button class="status-button ${status === "skipped" ? "active" : ""}" type="button" data-action="status" data-status="skipped" aria-pressed="${status === "skipped"}">Skipped</button>
        <button class="status-button ${status === "pending" ? "active" : ""}" type="button" data-action="status" data-status="pending" aria-pressed="${status === "pending"}">Reset</button>
      </div>
      <div class="item-action-row">
        <button class="ghost-button small" type="button" data-action="edit">Edit</button>
        <button class="ghost-button small danger" type="button" data-action="delete">Delete</button>
      </div>
    </article>
  `;
}

function setStorageMode(session) {
  state.session = session;
  state.storageMode = session && session.user ? "remote" : "local";
  updatePlannerAccountPanel();
}

async function updateSessionState() {
  if (!window.ARFIT_API || !window.ARFIT_API.isConfigured()) {
    setStorageMode(null);
    return;
  }

  try {
    const { session } = await window.ARFIT_API.getSession();
    setStorageMode(session);
  } catch (error) {
    setStorageMode(null);
  }
}

function updatePlannerAccountPanel() {
  if (!plannerAccountHeading || !plannerAccountCopy || !plannerAuthLink || !importLocalDataButton) {
    return;
  }

  if (!window.ARFIT_API || !window.ARFIT_API.isConfigured()) {
    plannerAccountHeading.textContent = "Backend Not Configured";
    plannerAccountCopy.textContent = "Account sync is ready in code, but the API base is not configured yet. Update assets/js/app-config.js once your backend is running.";
    plannerAuthLink.textContent = "Open Account";
    importLocalDataButton.hidden = true;
    return;
  }

  if (state.storageMode === "remote" && state.session) {
    plannerAccountHeading.textContent = state.session.user.username || "Signed In";
    plannerAccountCopy.textContent = `Planner data is loading from your account for ${state.session.user.email}.`;
    plannerAuthLink.textContent = "Manage Account";
    importLocalDataButton.hidden = !hasLocalPlannerData();
    return;
  }

  plannerAccountHeading.textContent = "Local Mode";
  plannerAccountCopy.textContent = "You are currently using browser-only storage. Sign in to sync planner data to your account.";
  plannerAuthLink.textContent = "Sign In Or Register";
  importLocalDataButton.hidden = true;
}

async function getWeekItems() {
  if (state.storageMode === "remote" && window.ARFIT_API?.isConfigured()) {
    const response = await window.ARFIT_API.getPlannerItems(formatWeekKey(state.weekStart));
    return Array.isArray(response.items) ? response.items : [];
  }

  return getLocalWeekItems();
}

function createLocalId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function renderWeek() {
  let items = [];

  try {
    items = sortItems(await getWeekItems());
  } catch (error) {
    setFeedback(error.message);
    items = sortItems(getLocalWeekItems());
  }

  weekLabel.textContent = getWeekRangeLabel();
  weekCaption.textContent = items.length
    ? `${items.filter((item) => item.status === "completed").length} of ${items.length} items completed this week.`
    : "No items planned yet. Add your own or load the default AR-FIT week.";

  renderScore(items);

  const dayMarkup = DAYS.map((dayName, dayIndex) => {
    const currentDate = addDays(state.weekStart, dayIndex);
    const dayItems = items.filter((item) => Number(item.day) === dayIndex);
    const completedToday = dayItems.filter((item) => item.status === "completed").length;
    const skippedToday = dayItems.filter((item) => item.status === "skipped").length;
    const expanded = Boolean(state.expandedDays[dayIndex]);

    return `
      <section class="day-column ${expanded ? "is-open" : ""}">
        <button class="day-toggle" type="button" data-action="toggle-day" data-day-index="${dayIndex}" aria-expanded="${expanded}">
          <div class="day-toggle-copy">
            <p>${dayName}</p>
            <strong>${escapeHtml(shortDateFormatter.format(currentDate))}</strong>
          </div>
          <div class="day-toggle-meta">
            <span>${completedToday}/${dayItems.length || 0} done</span>
            <small>${skippedToday} skipped</small>
          </div>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="day-panel" ${expanded ? "" : "hidden"}>
          ${
            dayItems.length
              ? dayItems.map((item) => createItemMarkup(item)).join("")
              : '<div class="empty-slot">No items planned yet.</div>'
          }
        </div>
      </section>
    `;
  }).join("");

  weekGrid.innerHTML = dayMarkup;
}

async function getItemById(itemId) {
  const items = await getWeekItems();
  return items.find((item) => item.id === itemId);
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(plannerForm);
  const existingId = String(formData.get("itemId") || "");
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    setFeedback("Add a title before saving this item.");
    return;
  }

  const item = {
    weekStart: formatWeekKey(state.weekStart),
    type: String(formData.get("type") || "workout"),
    day: Number(formData.get("day") || 0),
    time: String(formData.get("time") || ""),
    title,
    notes: String(formData.get("notes") || "").trim(),
    status: "pending",
  };

  try {
    if (state.storageMode === "remote" && window.ARFIT_API?.isConfigured()) {
      if (existingId) {
        const current = await getItemById(existingId);
        await window.ARFIT_API.updatePlannerItem(existingId, {
          ...item,
          status: current?.status || "pending",
        });
        setFeedback("Item updated for this account.");
      } else {
        await window.ARFIT_API.createPlannerItem(item);
        setFeedback("New item added to your account.");
      }
    } else {
      const weekItems = getLocalWeekItems();
      const localItem = {
        id: existingId || createLocalId(),
        ...item,
      };

      const existingIndex = weekItems.findIndex((entry) => entry.id === existingId);
      if (existingIndex >= 0) {
        localItem.status = weekItems[existingIndex].status || "pending";
        weekItems[existingIndex] = localItem;
        setFeedback("Item updated for this browser.");
      } else {
        weekItems.push(localItem);
        setFeedback("New item added to this browser.");
      }

      saveLocalPlannerData();
    }

    resetForm();
    await renderWeek();
  } catch (error) {
    setFeedback(error.message);
  }
}

async function handleWeekGridClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "toggle-day") {
    const dayIndex = Number(button.dataset.dayIndex);
    if (state.expandedDays[dayIndex]) {
      delete state.expandedDays[dayIndex];
    } else {
      state.expandedDays[dayIndex] = true;
    }
    await renderWeek();
    return;
  }

  const itemElement = button.closest(".planner-item");
  if (!itemElement) {
    return;
  }

  try {
    const item = await getItemById(itemElement.dataset.itemId);
    if (!item) {
      return;
    }

    if (action === "edit") {
      plannerForm.elements.itemId.value = item.id;
      plannerForm.elements.type.value = item.type;
      plannerForm.elements.day.value = String(item.day);
      plannerForm.elements.time.value = item.time || "";
      plannerForm.elements.title.value = item.title;
      plannerForm.elements.notes.value = item.notes || "";
      formHeading.textContent = "Edit Item";
      cancelEditButton.hidden = false;
      setFeedback(`Editing "${item.title}".`);
      plannerForm.elements.title.focus();
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(`Delete "${item.title}" from this week?`);
      if (!confirmed) {
        return;
      }

      if (state.storageMode === "remote" && window.ARFIT_API?.isConfigured()) {
        await window.ARFIT_API.deletePlannerItem(item.id);
      } else {
        const weekItems = getLocalWeekItems();
        const itemIndex = weekItems.findIndex((entry) => entry.id === item.id);
        if (itemIndex < 0) {
          return;
        }
        weekItems.splice(itemIndex, 1);
        saveLocalPlannerData();
      }

      if (plannerForm.elements.itemId.value === item.id) {
        resetForm();
      }
      setFeedback(`Deleted "${item.title}".`);
      await renderWeek();
      return;
    }

    if (action === "status") {
      const nextStatus = button.dataset.status || "pending";
      if (state.storageMode === "remote" && window.ARFIT_API?.isConfigured()) {
        await window.ARFIT_API.updatePlannerItem(item.id, { status: nextStatus });
      } else {
        const weekItems = getLocalWeekItems();
        const itemIndex = weekItems.findIndex((entry) => entry.id === item.id);
        if (itemIndex < 0) {
          return;
        }
        weekItems[itemIndex].status = nextStatus;
        saveLocalPlannerData();
      }
      setFeedback(`"${item.title}" marked ${nextStatus}.`);
      await renderWeek();
    }
  } catch (error) {
    setFeedback(error.message);
  }
}

async function changeWeek(offset) {
  state.weekStart = addDays(state.weekStart, offset * 7);
  state.expandedDays = createInitialExpandedDays();
  resetForm();
  setFeedback("");
  await renderWeek();
}

async function loadDefaultWeek() {
  try {
    const currentItems = await getWeekItems();
    if (currentItems.length) {
      const confirmed = window.confirm("This week already has items. Add the default AR-FIT items anyway?");
      if (!confirmed) {
        return;
      }
    }

    let addedCount = 0;

    if (state.storageMode === "remote" && window.ARFIT_API?.isConfigured()) {
      for (const template of DEFAULT_ITEMS) {
        const alreadyExists = currentItems.some((item) => (
          Number(item.day) === template.day &&
          item.type === template.type &&
          item.title.toLowerCase() === template.title.toLowerCase() &&
          (item.time || "") === (template.time || "")
        ));

        if (!alreadyExists) {
          await window.ARFIT_API.createPlannerItem({
            weekStart: formatWeekKey(state.weekStart),
            ...template,
            status: "pending",
          });
          addedCount += 1;
        }
      }
    } else {
      const weekItems = getLocalWeekItems();
      DEFAULT_ITEMS.forEach((template) => {
        const alreadyExists = weekItems.some((item) => (
          Number(item.day) === template.day &&
          item.type === template.type &&
          item.title.toLowerCase() === template.title.toLowerCase() &&
          (item.time || "") === (template.time || "")
        ));

        if (!alreadyExists) {
          weekItems.push({
            id: createLocalId(),
            status: "pending",
            weekStart: formatWeekKey(state.weekStart),
            ...template,
          });
          addedCount += 1;
        }
      });
      saveLocalPlannerData();
    }

    setFeedback(
      addedCount
        ? `Loaded ${addedCount} default item${addedCount === 1 ? "" : "s"} into this week.`
        : "All default AR-FIT items are already in this week."
    );
    await renderWeek();
  } catch (error) {
    setFeedback(error.message);
  }
}

async function handleImportLocalData() {
  if (!window.ARFIT_API?.isConfigured()) {
    setFeedback("Configure your API base before importing local data.");
    return;
  }

  try {
    const response = await window.ARFIT_API.importPlannerData(state.localData);
    setFeedback(`Imported ${response.importedCount} local planner item${response.importedCount === 1 ? "" : "s"} into your account.`);
    await renderWeek();
    updatePlannerAccountPanel();
  } catch (error) {
    setFeedback(error.message);
  }
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartPoint = {
    x: touch.clientX,
    y: touch.clientY,
  };
}

function handleTouchEnd(event) {
  if (!touchStartPoint) {
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartPoint.x;
  const deltaY = touch.clientY - touchStartPoint.y;
  touchStartPoint = null;

  if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) {
    return;
  }

  void changeWeek(deltaX < 0 ? 1 : -1);
}

async function initializePlanner() {
  resetForm();
  await updateSessionState();
  updatePlannerAccountPanel();
  await renderWeek();
}

plannerForm.addEventListener("submit", (event) => { void handleFormSubmit(event); });
weekGrid.addEventListener("click", (event) => { void handleWeekGridClick(event); });
plannerCalendar.addEventListener("touchstart", handleTouchStart, { passive: true });
plannerCalendar.addEventListener("touchend", handleTouchEnd, { passive: true });
cancelEditButton.addEventListener("click", () => {
  resetForm();
  setFeedback("Edit cancelled.");
});
prevWeekButton.addEventListener("click", () => { void changeWeek(-1); });
nextWeekButton.addEventListener("click", () => { void changeWeek(1); });
currentWeekButton.addEventListener("click", () => {
  state.weekStart = getStartOfWeek(new Date());
  state.expandedDays = createInitialExpandedDays();
  resetForm();
  setFeedback("");
  void renderWeek();
});
loadDefaultsButton.addEventListener("click", () => { void loadDefaultWeek(); });
if (importLocalDataButton) {
  importLocalDataButton.addEventListener("click", () => { void handleImportLocalData(); });
}

void initializePlanner();
