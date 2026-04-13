(function initArfitApi() {
  function getConfiguredApiBase() {
    if (window.ARFIT_CONFIG && typeof window.ARFIT_CONFIG.apiBase === "string") {
      const explicitValue = window.ARFIT_CONFIG.apiBase.trim().replace(/\/$/, "");
      if (explicitValue) {
        return explicitValue;
      }
    }

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${window.location.protocol}//${window.location.hostname}:3000/api`;
    }

    return "";
  }

  async function request(path, options) {
    const apiBase = getConfiguredApiBase();
    if (!apiBase) {
      throw new Error("API base is not configured yet.");
    }

    const response = await fetch(`${apiBase}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers ? options.headers : {}),
      },
      ...options,
    });

    if (response.status === 204) {
      return null;
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const message = payload && payload.error ? payload.error : "Request failed.";
      throw new Error(message);
    }

    return payload;
  }

  window.ARFIT_API = {
    isConfigured() {
      return Boolean(getConfiguredApiBase());
    },
    getBaseUrl() {
      return getConfiguredApiBase();
    },
    getSession() {
      return request("/auth/session", { method: "GET" });
    },
    requestRegisterOtp(data) {
      return request("/auth/register/request-otp", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    requestLoginOtp(data) {
      return request("/auth/login/request-otp", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    verifyOtp(data) {
      return request("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    logout() {
      return request("/auth/logout", { method: "POST" });
    },
    getPlannerItems(weekStart) {
      return request(`/planner/items?weekStart=${encodeURIComponent(weekStart)}`, {
        method: "GET",
      });
    },
    createPlannerItem(item) {
      return request("/planner/items", {
        method: "POST",
        body: JSON.stringify(item),
      });
    },
    updatePlannerItem(itemId, item) {
      return request(`/planner/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        body: JSON.stringify(item),
      });
    },
    deletePlannerItem(itemId) {
      return request(`/planner/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
    },
    importPlannerData(data) {
      return request("/planner/import", {
        method: "POST",
        body: JSON.stringify({ data }),
      });
    },
  };
})();
