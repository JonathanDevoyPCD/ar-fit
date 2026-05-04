const courseList = document.querySelector("#course-list");
const feedback = document.querySelector("#courses-feedback");

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

function renderCourses(courses) {
  if (!courses.length) {
    courseList.innerHTML = '<div class="empty-slot">No public courses published yet.</div>';
    return;
  }

  courseList.innerHTML = courses.map((course) => `
    <article class="course-card">
      <div>
        <p class="eyebrow">${escapeHtml(course.region || "Open Region")}</p>
        <h3>${escapeHtml(course.name)}</h3>
        <p>${escapeHtml(course.description || "No description provided yet.")}</p>
      </div>
      <div class="course-meta">
        <span>${Number(course.legCount || 0)} legs</span>
        <span>${Number(course.checkpointCount || 0)} checkpoints</span>
        <span>By ${escapeHtml(course.ownerUsername || "Organizer")}</span>
      </div>
      <a class="primary-button" href="course.html?slug=${encodeURIComponent(course.slug)}">Open Course</a>
    </article>
  `).join("");
}

async function initializeCoursesPage() {
  if (!window.ARFIT_API?.isConfigured()) {
    setFeedback("API is not configured.");
    return;
  }

  setFeedback("Loading public courses...");

  try {
    const response = await window.ARFIT_API.getPublicCourses();
    renderCourses(Array.isArray(response.courses) ? response.courses : []);
    setFeedback("");
  } catch (error) {
    setFeedback(error.message);
  }
}

void initializeCoursesPage();
