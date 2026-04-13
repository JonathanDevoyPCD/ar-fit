const HOME_STORAGE_KEY = "arfit-week-planner-v1";

const homeScoreValue = document.querySelector("#home-score-value");
const homeScoreSummary = document.querySelector("#home-score-summary");
const homeScoreFill = document.querySelector("#home-score-fill");

function getHomeWeekStart(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function formatHomeWeekKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadHomePlannerData() {
  try {
    const raw = localStorage.getItem(HOME_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    return {};
  }
}

function getHomeScore() {
  const data = loadHomePlannerData();
  const weekKey = formatHomeWeekKey(getHomeWeekStart(new Date()));
  const items = Array.isArray(data[weekKey]) ? data[weekKey] : [];
  const planned = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const score = planned > 0 ? Math.round((completed / planned) * 100) : 0;

  return { planned, completed, score };
}

async function getRemoteHomeScore() {
  if (!window.ARFIT_API || !window.ARFIT_API.isConfigured()) {
    return null;
  }

  const { session } = await window.ARFIT_API.getSession();
  if (!session) {
    return null;
  }

  const weekKey = formatHomeWeekKey(getHomeWeekStart(new Date()));
  const response = await window.ARFIT_API.getPlannerItems(weekKey);
  const items = Array.isArray(response.items) ? response.items : [];
  const planned = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const score = planned > 0 ? Math.round((completed / planned) * 100) : 0;

  return { planned, completed, score };
}

async function renderHomeScore() {
  if (!homeScoreValue || !homeScoreSummary || !homeScoreFill) {
    return;
  }

  let summary = getHomeScore();

  try {
    const remoteSummary = await getRemoteHomeScore();
    if (remoteSummary) {
      summary = remoteSummary;
    }
  } catch (error) {
    summary = getHomeScore();
  }

  const { planned, completed, score } = summary;
  homeScoreValue.textContent = `${score}%`;
  homeScoreFill.style.width = `${score}%`;

  if (planned === 0) {
    homeScoreSummary.textContent = "No items planned yet";
    return;
  }

  homeScoreSummary.textContent = `${completed} of ${planned} items completed`;
}

void renderHomeScore();
