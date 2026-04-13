const AUTH_STORAGE_KEY = "arfit-pending-auth";
const LOCAL_PLANNER_KEY = "arfit-week-planner-v1";

const authModeButtons = document.querySelectorAll(".auth-switch-button");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const verifyForm = document.querySelector("#verify-form");
const verifyEmailField = document.querySelector("#verify-email");
const verifyPurposeField = document.querySelector("#verify-purpose");
const authFeedback = document.querySelector("#auth-feedback");
const accountStatusTitle = document.querySelector("#account-status-title");
const accountStatusCopy = document.querySelector("#account-status-copy");
const accountUser = document.querySelector("#account-user");
const accountUsername = document.querySelector("#account-username");
const accountEmail = document.querySelector("#account-email");
const signOutButton = document.querySelector("#sign-out-button");
const accountPlannerLink = document.querySelector("#account-planner-link");
const importLocalButton = document.querySelector("#import-local-auth");

function setAuthFeedback(message, tone = "default") {
  authFeedback.textContent = message;
  authFeedback.dataset.tone = tone;
}

function getPendingAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setPendingAuth(value) {
  if (!value) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

function hasLocalPlannerData() {
  try {
    const raw = localStorage.getItem(LOCAL_PLANNER_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    return Object.values(parsed).some((items) => Array.isArray(items) && items.length);
  } catch (error) {
    return false;
  }
}

function readLocalPlannerData() {
  try {
    const raw = localStorage.getItem(LOCAL_PLANNER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function showMode(mode) {
  registerForm.hidden = mode !== "register";
  loginForm.hidden = mode !== "login";
  verifyForm.hidden = mode !== "verify";

  authModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
}

function populateVerifyStep(pendingAuth) {
  verifyEmailField.textContent = pendingAuth ? pendingAuth.email : "";
  verifyPurposeField.textContent = pendingAuth && pendingAuth.purpose === "register" ? "Registration" : "Login";
}

async function renderAccountState() {
  const apiAvailable = window.ARFIT_API && window.ARFIT_API.isConfigured();
  if (!apiAvailable) {
    accountStatusTitle.textContent = "Backend Not Configured";
    accountStatusCopy.textContent = "Set your API base in assets/js/app-config.js, then connect PostgreSQL and SMTP before account features can work.";
    accountUser.hidden = true;
    signOutButton.hidden = true;
    accountPlannerLink.hidden = true;
    importLocalButton.hidden = true;
    return;
  }

  try {
    const { session } = await window.ARFIT_API.getSession();
    if (!session) {
      accountStatusTitle.textContent = "Sign In Or Register";
      accountStatusCopy.textContent = "Create an account or sign in with your email OTP code to sync planner data across devices.";
      accountUser.hidden = true;
      signOutButton.hidden = true;
      accountPlannerLink.hidden = true;
      importLocalButton.hidden = true;
      return;
    }

    accountStatusTitle.textContent = "Signed In";
    accountStatusCopy.textContent = "Your planner data will now be stored against your account instead of only in this browser.";
    accountUser.hidden = false;
    accountUsername.textContent = session.user.username || "No username";
    accountEmail.textContent = session.user.email;
    signOutButton.hidden = false;
    accountPlannerLink.hidden = false;
    importLocalButton.hidden = !hasLocalPlannerData();
  } catch (error) {
    accountStatusTitle.textContent = "Connection Error";
    accountStatusCopy.textContent = error.message;
    accountUser.hidden = true;
    signOutButton.hidden = true;
    accountPlannerLink.hidden = true;
    importLocalButton.hidden = true;
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(registerForm);
    const payload = {
      username: String(formData.get("username") || "").trim(),
      email: String(formData.get("email") || "").trim(),
    };

    await window.ARFIT_API.requestRegisterOtp(payload);
    setPendingAuth({ email: payload.email, purpose: "register" });
    populateVerifyStep(getPendingAuth());
    showMode("verify");
    setAuthFeedback("Registration code sent. Check your email.", "success");
  } catch (error) {
    setAuthFeedback(error.message, "error");
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(loginForm);
    const payload = {
      email: String(formData.get("email") || "").trim(),
    };

    await window.ARFIT_API.requestLoginOtp(payload);
    setPendingAuth({ email: payload.email, purpose: "login" });
    populateVerifyStep(getPendingAuth());
    showMode("verify");
    setAuthFeedback("Login code sent. Check your email.", "success");
  } catch (error) {
    setAuthFeedback(error.message, "error");
  }
}

async function handleVerifySubmit(event) {
  event.preventDefault();
  const pendingAuth = getPendingAuth();
  if (!pendingAuth) {
    setAuthFeedback("Start with register or login to request a code.", "error");
    showMode("register");
    return;
  }

  try {
    const formData = new FormData(verifyForm);
    await window.ARFIT_API.verifyOtp({
      email: pendingAuth.email,
      purpose: pendingAuth.purpose,
      code: String(formData.get("code") || "").trim(),
    });
    setPendingAuth(null);
    verifyForm.reset();
    setAuthFeedback("Authentication complete.", "success");
    await renderAccountState();
    showMode("register");
  } catch (error) {
    setAuthFeedback(error.message, "error");
  }
}

async function handleSignOut() {
  try {
    await window.ARFIT_API.logout();
    setAuthFeedback("Signed out.", "success");
    await renderAccountState();
  } catch (error) {
    setAuthFeedback(error.message, "error");
  }
}

async function handleImportLocalData() {
  try {
    const data = readLocalPlannerData();
    const response = await window.ARFIT_API.importPlannerData(data);
    setAuthFeedback(`Imported ${response.importedCount} local planner item${response.importedCount === 1 ? "" : "s"}.`, "success");
    await renderAccountState();
  } catch (error) {
    setAuthFeedback(error.message, "error");
  }
}

authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showMode(button.dataset.mode);
    if (button.dataset.mode !== "verify") {
      setPendingAuth(null);
    }
    setAuthFeedback("");
  });
});

registerForm.addEventListener("submit", (event) => { void handleRegisterSubmit(event); });
loginForm.addEventListener("submit", (event) => { void handleLoginSubmit(event); });
verifyForm.addEventListener("submit", (event) => { void handleVerifySubmit(event); });
signOutButton.addEventListener("click", () => { void handleSignOut(); });
importLocalButton.addEventListener("click", () => { void handleImportLocalData(); });

populateVerifyStep(getPendingAuth());
showMode(getPendingAuth() ? "verify" : "register");
void renderAccountState();
