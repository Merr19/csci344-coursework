/**
 * Spreadsheet-style editor for generated API resources (Tabulator + fetch).
 */

(function () {
  const TOKEN_KEY = "api_generator_jwt";

  /** Tabulator fires cellEdited after programmatic row.update(); skip those to avoid duplicate PATCH/POST. */
  let suppressCellEdit = 0;

  const state = {
    schema: null,
    table: null,
    resource: null,
    fkOptions: {},
    userOptions: [],
    visibleResources: [],
    currentUser: null,
    loadedRows: [],
    loadedRowsRaw: [],
    viewMode: "spreadsheet",
    filterValuesByResource: {},
  };

  function updateRowQuietly(row, data) {
    suppressCellEdit += 1;
    try {
      row.update(data);
    } finally {
      setTimeout(() => {
        suppressCellEdit -= 1;
      }, 0);
    }
  }

  /**
   * API origin for fetch(). Empty string = same origin as this page (use when opened via `npm start`).
   * If you open this HTML from another host, set `?api=http://127.0.0.1:3100` or `window.__API_BASE__`.
   */
  function getBase() {
    try {
      const q = new URLSearchParams(window.location.search).get("api");
      if (q) {
        return q.replace(/\/$/, "");
      }
    } catch (e) {
      /* ignore */
    }
    if (typeof window.__API_BASE__ === "string" && window.__API_BASE__.trim()) {
      return window.__API_BASE__.replace(/\/$/, "");
    }
    try {
      const stored = sessionStorage.getItem("api_generator_api_base");
      if (stored) {
        return stored.replace(/\/$/, "");
      }
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function apiUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    const b = getBase();
    return b ? `${b}${p}` : p;
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(t) {
    if (t) {
      sessionStorage.setItem(TOKEN_KEY, t);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  function setTokenHint(message) {
    const el = document.getElementById("token-hint");
    if (el) {
      el.textContent = message || "";
    }
  }

  function setAuthMessage(message, kind) {
    const el = document.getElementById("auth-message");
    if (!el) {
      return;
    }
    el.textContent = message || "";
    el.className = "status" + (kind ? ` ${kind}` : "");
  }

  function authHeaders() {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  async function apiFetch(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = {
      Accept: "application/json",
      ...authHeaders(),
      ...options.headers,
    };
    if (method !== "GET" && method !== "HEAD") {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(apiUrl(path), { ...options, headers });
    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    return { res, data };
  }

  async function publicPost(path, payload) {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    return { res, data };
  }

  /** Full GET list URL (with query) for the current resource and filter inputs; empty if no resource. */
  function getCurrentListUrlForStatus() {
    if (!state.resource) {
      return "";
    }
    const path = buildListUrl(state.resource);
    return path ? apiUrl(path) : "";
  }

  function setStatus(message, kind) {
    const el = document.getElementById("status");
    if (!el) {
      return;
    }
    const trimmed = message == null ? "" : String(message);
    const url = trimmed ? getCurrentListUrlForStatus() : "";
    el.textContent = url ? `${trimmed} — ${url}` : trimmed;
    el.className = "status" + (kind ? ` ${kind}` : "");
  }

  function showCrudError(action, errorLike, fallbackMessage) {
    const message =
      (typeof errorLike === "string" && errorLike) ||
      errorLike?.error ||
      errorLike?.message ||
      fallbackMessage ||
      `${action} failed.`;
    setStatus(`${action} failed: ${message}`, "error");
  }

  function needsAuthForRead(resource) {
    return resource.permissions?.list && resource.permissions.list !== "public";
  }

  function needsAuthForWrite(resource, op) {
    const p = resource.permissions?.[op] || "user";
    return p !== "public";
  }

  function getAllResources() {
    return Array.isArray(state.schema?.resources) ? state.schema.resources : [];
  }

  /** Scalar storage for validation and editors (relation fields store ids as integers). */
  function fieldStorageType(field) {
    return field && (field.storageType || field.type);
  }

  function getVisibleResources() {
    const resources = getAllResources();
    if (getToken()) {
      return resources;
    }
    return resources.filter((resource) => !needsAuthForRead(resource));
  }

  function isRowOwnedByCurrentUser(rowData) {
    if (!state.currentUser || !rowData) {
      return false;
    }
    return (
      Number(rowData.owner_id) === Number(state.currentUser.id) ||
      String(rowData.creator || "") === String(state.currentUser.username || "")
    );
  }

  function canMutateRow(resource, rowData, operation) {
    if (!resource || !rowData) {
      return false;
    }
    if (rowData._pending) {
      return true;
    }

    const policy =
      resource.permissions?.[operation] ||
      (operation === "update" || operation === "delete" ? "owner" : "user");
    switch (policy) {
      case "public":
        return true;
      case "user":
        return Boolean(state.currentUser);
      case "owner":
        return isRowOwnedByCurrentUser(rowData);
      case "owner_or_shared":
        return (
          Boolean(state.currentUser) &&
          (isRowOwnedByCurrentUser(rowData) || resource.permissions?.list === "owner_or_shared")
        );
      default:
        return false;
    }
  }

  function isRowPatchable(resource, rowData) {
    return canMutateRow(resource, rowData, "update");
  }

  function readOnlyLabel(resource, rowData) {
    if (rowData?._pending) {
      return "editable";
    }
    return isRowPatchable(resource, rowData) ? "editable" : "read-only";
  }

  async function syncCurrentUser() {
    if (!getToken()) {
      state.currentUser = null;
      return true;
    }

    try {
      const { res, data } = await apiFetch("/auth/me", { method: "GET" });
      if (!res.ok || !data?.id) {
        state.currentUser = null;
        return false;
      }
      state.currentUser = data;
      return true;
    } catch (_err) {
      state.currentUser = null;
      return false;
    }
  }

  function getFilterPanel() {
    return document.getElementById("filter-panel");
  }

  function isFilterPanelOpen() {
    const panel = getFilterPanel();
    return Boolean(panel && !panel.hidden);
  }

  function closeFilterPanelIfOpen() {
    const panel = getFilterPanel();
    const btn = document.getElementById("filter-open-btn");
    if (panel) {
      panel.hidden = true;
    }
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
    }
  }

  function toggleFilterPanel() {
    const panel = getFilterPanel();
    const btn = document.getElementById("filter-open-btn");
    if (!panel || !btn) {
      return;
    }
    const opening = panel.hidden;
    panel.hidden = !opening;
    btn.setAttribute("aria-expanded", opening ? "true" : "false");
  }

  function syncFilterOpenButtonVisibility() {
    const filterOpenBtn = document.getElementById("filter-open-btn");
    if (!filterOpenBtn) {
      return;
    }
    const loggedIn = Boolean(getToken());
    filterOpenBtn.hidden =
      !loggedIn || !state.resource || getQueryFilters(state.resource).length === 0;
  }

  /** Row actions + view toggle: only after a resource is chosen in the dropdown. */
  function syncToolbarActionsVisibility() {
    const wrap = document.getElementById("toolbar-actions");
    const sel = document.getElementById("resource-select");
    if (!wrap || !sel) {
      return;
    }
    wrap.hidden = !sel.value;
  }

  function resetGridState() {
    if (state.table) {
      state.table.destroy();
      state.table = null;
    }
    state.resource = null;
    state.fkOptions = {};
    state.userOptions = [];
    state.loadedRows = [];
    state.loadedRowsRaw = [];
    closeFilterPanelIfOpen();
    renderFilterControls(null);
    renderJsonView();
  }

  function populateResourceSelect(preferredValue = "") {
    const sel = document.getElementById("resource-select");
    if (!sel) {
      return "";
    }

    const visibleResources = getVisibleResources();
    const loggedIn = Boolean(getToken());
    state.visibleResources = visibleResources;
    sel.innerHTML = "";

    if (visibleResources.length === 0) {
      return "";
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = loggedIn ? "Select a resource…" : "Select a public resource…";
    sel.appendChild(placeholder);

    for (const resource of visibleResources) {
      const opt = document.createElement("option");
      opt.value = resource.type;
      opt.textContent = loggedIn
        ? `${resource.type} (${resource.path})`
        : `${resource.type} (public)`;
      sel.appendChild(opt);
    }

    const selected = visibleResources.some((resource) => resource.type === preferredValue)
      ? preferredValue
      : "";
    sel.value = selected;
    return selected;
  }

  function updateAuthUi(preferredValue = "") {
    const loggedIn = Boolean(getToken());
    const allResources = getAllResources();
    const selected = populateResourceSelect(preferredValue);
    const visibleResources = state.visibleResources;

    const loginForm = document.getElementById("login-form");
    const logoutBtn = document.getElementById("logout-btn");
    const resourceControls = document.getElementById("resource-controls");
    const gridWrap = document.getElementById("grid-wrap");
    const jsonWrap = document.getElementById("json-wrap");
    const addRowBtn = document.getElementById("add-row-btn");
    const viewToggle = document.getElementById("view-toggle");
    if (loginForm) {
      loginForm.hidden = loggedIn;
    }
    if (logoutBtn) {
      logoutBtn.hidden = !loggedIn;
    }
    if (resourceControls) {
      resourceControls.hidden = !loggedIn;
    }
    if (viewToggle) {
      viewToggle.hidden = !loggedIn;
    }
    syncFilterOpenButtonVisibility();
    if (!loggedIn || !state.resource || getQueryFilters(state.resource).length === 0) {
      closeFilterPanelIfOpen();
    }
    syncToolbarActionsVisibility();
    syncFilterActiveUi();
    updateViewModeUi({ loggedIn, gridWrap, jsonWrap, addRowBtn });
   

    if (loggedIn) {
      setTokenHint(
        state.currentUser?.username ? `Logged in as ${state.currentUser.username}.` : "Token stored for this tab."
      );
      setAuthMessage("");
    } else {
      setTokenHint("");
      if (allResources.length === 0) {
        setAuthMessage("");
      } else {
        setAuthMessage("Log in to access this API and use the spreadsheet editor.");
      }
    }

    return selected;
  }

  function updateViewModeUi(elements = {}) {
    const loggedIn = elements.loggedIn ?? Boolean(getToken());
    const gridWrap = elements.gridWrap || document.getElementById("grid-wrap");
    const jsonWrap = elements.jsonWrap || document.getElementById("json-wrap");
    const addRowBtn = elements.addRowBtn || document.getElementById("add-row-btn");
    const tableViewBtn = document.getElementById("view-mode-table-btn");
    const codeViewBtn = document.getElementById("view-mode-code-btn");
    const showJson = loggedIn && state.viewMode === "json";
    const showSpreadsheet = loggedIn && state.viewMode !== "json";

    if (gridWrap) {
      gridWrap.hidden = !showSpreadsheet;
    }
    if (jsonWrap) {
      jsonWrap.hidden = !showJson;
    }
    if (addRowBtn) {
      addRowBtn.hidden = !loggedIn || state.viewMode === "json";
    }
    if (tableViewBtn && codeViewBtn) {
      const json = state.viewMode === "json";
      tableViewBtn.setAttribute("aria-pressed", json ? "false" : "true");
      codeViewBtn.setAttribute("aria-pressed", json ? "true" : "false");
      tableViewBtn.classList.toggle("is-active", !json);
      codeViewBtn.classList.toggle("is-active", json);
    }
    if (showJson) {
      renderJsonView();
    }
  }

  function setViewMode(mode) {
    state.viewMode = mode === "json" ? "json" : "spreadsheet";
    updateViewModeUi();
  }

  function renderJsonView() {
    const el = document.getElementById("json-view");
    if (!el) {
      return;
    }
    el.textContent = JSON.stringify(state.loadedRowsRaw, null, 2);
  }

  function getRowsForDisplay() {
    if (state.table) {
      return state.table.getData().map(cleanRowForDisplay);
    }
    return state.loadedRows.map(cleanRowForDisplay);
  }

  function setLoadedRowsFromApi(resource, rows) {
    state.loadedRowsRaw = Array.isArray(rows) ? rows : [];
    state.loadedRows = state.loadedRowsRaw.map((row) => normalizeRow(resource, row));
    renderJsonView();
  }

  function upsertRawRow(rawRow) {
    if (!rawRow || rawRow.id == null) {
      return;
    }
    const next = [...state.loadedRowsRaw];
    const index = next.findIndex((row) => Number(row?.id) === Number(rawRow.id));
    if (index >= 0) {
      next[index] = rawRow;
    } else {
      next.push(rawRow);
    }
    state.loadedRowsRaw = next;
    renderJsonView();
  }

  function removeRawRowById(id) {
    state.loadedRowsRaw = state.loadedRowsRaw.filter((row) => Number(row?.id) !== Number(id));
    renderJsonView();
  }

  function cleanRowForDisplay(row) {
    return Object.fromEntries(
      Object.entries(row || {}).filter(([key]) => !key.startsWith("_"))
    );
  }

  function getQueryFilters(resource) {
    return resource?.queryFilters || [];
  }

  function renderFilterControls(resource) {
    const fieldsWrap = document.getElementById("filter-fields");
    if (!fieldsWrap) {
      return;
    }

    fieldsWrap.innerHTML = "";
    const queryFilters = getQueryFilters(resource);

    if (!resource || queryFilters.length === 0) {
      closeFilterPanelIfOpen();
      updateFilterRequestLink("");
      syncFilterOpenButtonVisibility();
      syncFilterActiveUi();
      return;
    }

    const values = getFilterValues(resource.type);
    for (const filter of queryFilters) {
      fieldsWrap.appendChild(buildFilterControl(resource, filter, values[filter.param] ?? ""));
    }
    syncFilterOpenButtonVisibility();
    syncFilterActiveUi();
  }

  function buildFilterControl(resource, filter, currentValue) {
    const label = document.createElement("label");
    label.htmlFor = filterControlId(resource, filter);
    const text = document.createElement("span");
    text.className = "filter-field-label";
    text.textContent = `${filter.param}:`;
    const control = createFilterInput(resource, filter, currentValue);
    label.appendChild(text);
    label.appendChild(control);
    return label;
  }

  function createFilterInput(_resource, filter, currentValue) {
    const id = filterControlId(state.resource || { type: "resource" }, filter);

    if (filter.fieldName === "owner_id") {
      const select = document.createElement("select");
      select.id = id;
      select.dataset.queryParam = filter.param;
      select.appendChild(new Option("Any owner", ""));
      for (const option of state.userOptions) {
        select.appendChild(new Option(option.label, String(option.value)));
      }
      select.value = String(currentValue || "");
      return select;
    }

    if (filter.relation) {
      const select = document.createElement("select");
      select.id = id;
      select.dataset.queryParam = filter.param;
      select.appendChild(new Option(`Any ${filter.param}`, ""));
      for (const option of state.fkOptions[filter.fieldName] || []) {
        select.appendChild(new Option(option.label, String(option.value)));
      }
      select.value = String(currentValue || "");
      return select;
    }

    if (filter.storageType === "boolean" || filter.type === "boolean") {
      const select = document.createElement("select");
      select.id = id;
      select.dataset.queryParam = filter.param;
      select.appendChild(new Option(`Any ${filter.param}`, ""));
      select.appendChild(new Option("true", "true"));
      select.appendChild(new Option("false", "false"));
      select.value = String(currentValue || "");
      return select;
    }

    const input = document.createElement("input");
    input.id = id;
    input.dataset.queryParam = filter.param;
    input.placeholder = filterPlaceholder(filter);
    input.value = String(currentValue || "");
    const numType = filter.storageType || filter.type;
    if (numType === "integer" || numType === "number") {
      input.type = "number";
      input.step = numType === "integer" ? "1" : "any";
    } else {
      input.type = "text";
    }
    return input;
  }

  function filterControlId(resource, filter) {
    return `filter-${resource.type}-${filter.param}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function filterPlaceholder(filter) {
    if (filter.op === "contains") {
      return `Contains ${filter.fieldName}`;
    }
    return `Filter by ${filter.fieldName}`;
  }

  function getFilterValues(resourceName) {
    return state.filterValuesByResource[resourceName] || {};
  }

  function captureFilterValues(resourceName) {
    if (!resourceName) {
      return {};
    }
    const values = {};
    const controls = document.querySelectorAll("#filter-fields [data-query-param]");
    controls.forEach((control) => {
      values[control.dataset.queryParam] = control.value;
    });
    state.filterValuesByResource[resourceName] = values;
    return values;
  }

  function clearFilterValues(resourceName) {
    state.filterValuesByResource[resourceName] = {};
    const controls = document.querySelectorAll("#filter-fields [data-query-param]");
    controls.forEach((control) => {
      control.value = "";
    });
  }

  function hasActiveFilters(resource) {
    if (!resource || getQueryFilters(resource).length === 0) {
      return false;
    }
    const values = getFilterValues(resource.type);
    for (const filter of getQueryFilters(resource)) {
      const v = values[filter.param];
      if (v != null && String(v).trim() !== "") {
        return true;
      }
    }
    return false;
  }

  function syncFilterActiveUi() {
    const resource = state.resource;
    const clearBtn = document.getElementById("filter-clear-toolbar-btn");
    const openBtn = document.getElementById("filter-open-btn");
    const filtersAvailable = Boolean(
      resource && getToken() && getQueryFilters(resource).length > 0
    );
    const active = Boolean(filtersAvailable && hasActiveFilters(resource));

    if (clearBtn) {
      clearBtn.hidden = !(filtersAvailable && active);
    }
    if (openBtn && !openBtn.hidden) {
      openBtn.classList.toggle("is-filter-active", active);
      openBtn.setAttribute("aria-label", active ? "Filters (active)" : "Filters");
    }
  }

  function buildListUrl(resource) {
    if (!resource) {
      return "";
    }
    const params = new URLSearchParams();
    const values = captureFilterValues(resource.type);
    for (const filter of getQueryFilters(resource)) {
      const value = values[filter.param];
      if (value != null && String(value).trim() !== "") {
        params.set(filter.param, String(value).trim());
      }
    }
    const query = params.toString();
    return query ? `${resource.path}?${query}` : resource.path;
  }

  /** Show the resolved GET list URL (path + query) in the filters panel. */
  function updateFilterRequestLink(listPath) {
    const wrap = document.getElementById("filter-api-link-wrap");
    const a = document.getElementById("filter-api-link");
    if (!wrap || !a) {
      return;
    }
    if (!listPath || !state.resource || getQueryFilters(state.resource).length === 0) {
      wrap.hidden = true;
      a.removeAttribute("href");
      a.textContent = "";
      return;
    }
    const full = apiUrl(listPath);
    a.href = full;
    a.textContent = full;
    wrap.hidden = false;
  }

  /**
   * Schema must load without Authorization (and without Tabulator) so the resource
   * dropdown always fills even if the grid library CDN fails.
   */
  async function loadSchema(preferredValue = "") {
    /* /generated-config.json is a static file written by `npm run generate` (always matches express.static). */
    const paths = [
      "/generated-config.json",
      "/api/generator-config",
      "/api/schema",
      "/api/docs/schema.json",
      "/generator-config.json",
    ];
    let lastDetail = "";

    for (const p of paths) {
      const url = apiUrl(p);
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      const trimmed = text.replace(/^\uFEFF/, "").trim();

      if (!res.ok) {
        lastDetail = `${url} → HTTP ${res.status} ${trimmed ? trimmed.slice(0, 120) : ""}`;
        continue;
      }

      if (!trimmed) {
        lastDetail = `${url} → empty body`;
        continue;
      }

      let data;
      try {
        data = JSON.parse(trimmed);
      } catch {
        lastDetail = `${url} → not JSON (${trimmed.slice(0, 80)}…)`;
        continue;
      }

      if (!data || !Array.isArray(data.resources)) {
        lastDetail = `${url} → missing resources[]`;
        continue;
      }

      state.schema = data;
      lastDetail = "";
      break;
    }

    if (!state.schema) {
      const hint =
        " Restart the API server so it loads the latest server.js (npm start). Tried: " +
        paths.map((x) => apiUrl(x)).join(", ");
      throw new Error(
        `Could not load API schema. ${lastDetail || "All URLs failed."}${hint}`
      );
    }

    const list = getAllResources();
    if (list.length === 0) {
      setStatus("No resources in config. Run `npm run generate`.", "error");
      resetGridState();
      updateAuthUi("");
      return "";
    }

    return updateAuthUi(preferredValue);
  }

  let tabulatorLoadPromise = null;

  function ensureTabulator() {
    if (typeof Tabulator !== "undefined") {
      return Promise.resolve();
    }
    if (!tabulatorLoadPromise) {
      tabulatorLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.1/dist/js/tabulator.min.js";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Could not load Tabulator from the CDN (check network)."));
        document.head.appendChild(s);
      });
    }
    return tabulatorLoadPromise;
  }

  async function loadFkOptions(resource) {
    state.fkOptions = {};
    for (const field of resource.fields || []) {
      if (!field.relation?.resourceType) {
        continue;
      }
      const target = state.schema.resources.find((x) => x.type === field.relation.resourceType);
      if (!target) {
        continue;
      }
      const needAuth = needsAuthForRead(target);
      if (needAuth && !getToken()) {
        state.fkOptions[field.name] = [];
        continue;
      }
      const { res, data } = await apiFetch(`${target.path}`, { method: "GET" });
      if (!res.ok || !Array.isArray(data)) {
        state.fkOptions[field.name] = [];
        continue;
      }
      state.fkOptions[field.name] = data.map((row) => ({
        value: row.id,
        label: fkLabel(row, target),
      }));
    }
  }

  async function loadUserOptions() {
    if (!getToken()) {
      state.userOptions = [];
      return;
    }

    const { res, data } = await apiFetch("/auth/users", { method: "GET" });
    if (!res.ok || !Array.isArray(data)) {
      state.userOptions = [];
      return;
    }

    state.userOptions = data.map((user) => ({
      value: user.id,
      label: `${user.username} (#${user.id})`,
    }));
  }

  function fkLabel(row, target) {
    const strField = (target.fields || []).find(
      (f) => !f.relation && (f.type === "string" || f.type === "text")
    );
    if (strField && row[strField.name] != null) {
      return `${row.id}: ${row[strField.name]}`;
    }
    return String(row.id);
  }

  function normalizeIncomingValue(field, value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (fieldStorageType(field) === "boolean" && (value === 0 || value === 1)) {
      return Boolean(value);
    }
    return value;
  }

  function buildColumns(resource) {
    const cols = [
      {
        title: "",
        field: "_del",
        width: 44,
        hozAlign: "center",
        headerSort: false,
        editable: false,
        formatter: (cell) => {
          const rowData = cell.getRow().getData();
          const patchable = canMutateRow(resource, rowData, "delete");
          if (rowData._pending || patchable) {
            return '<span class="tabulator-delete-btn" title="Delete">&times;</span>';
          }
          return '<span class="tabulator-delete-btn tabulator-delete-btn-disabled" title="Read-only">🔒</span>';
        },
        cellClick: (_e, cell) => {
          deleteRow(cell.getRow());
        },
      },
      {
        field: "id",
        title: "id",
        width: 70,
        editor: false,
        headerSort: true,
        formatter: (cell) => {
          const v = cell.getValue();
          return v === undefined || v === null || v === "" ? "—" : String(v);
        },
      },
      {
        field: "_access",
        title: "access",
        minWidth: 110,
        headerSort: true,
        editable: false,
        formatter: (cell) => {
          const label = readOnlyLabel(resource, cell.getRow().getData());
          return `<span class="access-pill access-pill-${label.replace(/[^a-z]+/g, "-")}">${label}</span>`;
        },
      },
    ];

    if (resource.ownershipEnabled) {
      cols.push({
        field: "creator",
        title: "creator",
        minWidth: 120,
        headerSort: true,
        editor: false,
        formatter: (cell) => {
          const v = cell.getValue();
          return v === undefined || v === null || v === "" ? "—" : String(v);
        },
      });
    }

    for (const field of resource.fields) {
      const col = {
        field: field.name,
        title: field.name + (field.required ? " *" : ""),
        headerSort: true,
        editor: pickEditor(field),
        editable: (cell) => isRowPatchable(resource, cell.getRow().getData()),
        formatter: (cell) => formatCell(field, cell.getValue()),
      };

      if (field.type === "image_url") {
        col.minWidth = 220;
        col.variableHeight = true;
      }

      const opts = state.fkOptions[field.name];
      if (field.relation && Array.isArray(opts) && opts.length > 0) {
        const valuesMap = {};
        for (const o of opts) {
          valuesMap[o.value] = o.label;
        }
        col.editor = "list";
        col.editorParams = { values: valuesMap };
        col.formatter = (cell) => {
          const v = cell.getValue();
          const m = opts.find((o) => o.value === v);
          return m ? m.label : v == null ? "" : String(v);
        };
      }

      cols.push(col);
    }

    return cols;
  }

  function pickEditor(field) {
    switch (fieldStorageType(field)) {
      case "boolean":
        return "tickCross";
      case "integer":
      case "number":
        return "number";
      case "date":
        return "input";
      case "datetime":
        return "input";
      default:
        return "input";
    }
  }

  function formatCell(field, value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (fieldStorageType(field) === "boolean") {
      return value === true || value === 1 ? "✓" : "✗";
    }
    if (field.type === "image_url") {
      return formatImageUrlCell(value);
    }
    return String(value);
  }

  function formatImageUrlCell(value) {
    const src = String(value || "").trim();
    if (!src) {
      return "";
    }
    if (!isDisplayableImageUrl(src)) {
      return `<span class="image-url-fallback">${escapeHtml(src)}</span>`;
    }

    const escapedSrc = escapeHtml(src);
    return `
        <div class="image-url-cell">
            <div>
                <a class="image-url-link" href="${escapedSrc}" target="_blank" rel="noopener noreferrer">
                    <img class="image-url-thumb" src="${escapedSrc}" alt="Thumbnail preview" loading="lazy" />
                </a>
            </div>
            ${escapedSrc}
        </div>
    `;
  }

  function isDisplayableImageUrl(value) {
    return /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function serializeForApi(field, value) {
    if (value === "" || value === undefined) {
      return null;
    }
    const st = fieldStorageType(field);
    if (st === "boolean") {
      if (value === "true" || value === true || value === 1) {
        return true;
      }
      if (value === "false" || value === false || value === 0) {
        return false;
      }
      return Boolean(value);
    }
    if (st === "integer") {
      const n =
        typeof value === "number" && Number.isFinite(value)
          ? Math.trunc(value)
          : parseInt(String(value).trim(), 10);
      return Number.isFinite(n) ? n : null;
    }
    if (st === "number") {
      const n = typeof value === "number" ? value : parseFloat(String(value).trim().replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return value;
  }

  function buildBodyFromRow(resource, rowData) {
    const body = {};
    for (const field of resource.fields) {
      if (!Object.prototype.hasOwnProperty.call(rowData, field.name)) {
        continue;
      }
      const v = serializeForApi(field, rowData[field.name]);
      if (v === null && !field.required) {
        continue;
      }
      body[field.name] = v;
    }
    return body;
  }

  async function deleteRow(row) {
    const resource = state.resource;
    if (!resource) {
      return;
    }
    const data = row.getData();
    if (data._pending) {
      row.delete();
      setStatus("Removed unsaved row.", "ok");
      return;
    }
    const id = data.id;
    if (id == null || id === "") {
      row.delete();
      return;
    }
    if (!canMutateRow(resource, data, "delete")) {
      setStatus("This record is read-only for the current user.", "error");
      return;
    }
    if (needsAuthForWrite(resource, "delete") && !getToken()) {
      setStatus("Log in to delete rows.", "error");
      return;
    }
    if (!window.confirm(`Delete ${resource.type} #${id}?`)) {
      return;
    }
    try {
      const { res, data: err } = await apiFetch(`${resource.path}/${id}`, { method: "DELETE" });
      if (res.status === 204 || res.ok) {
        row.delete();
        removeRawRowById(id);
        setStatus("Deleted.", "ok");
        return;
      }
      showCrudError("Delete", err, `HTTP ${res.status}`);
    } catch (err) {
      showCrudError("Delete", err, "Network error");
    }
  }

  async function saveNewRow(row) {
    const resource = state.resource;
    const data = row.getData();
    if (!data._pending) {
      return;
    }
    if (needsAuthForWrite(resource, "create") && !getToken()) {
      setStatus("Log in to create rows.", "error");
      return;
    }
    const body = buildBodyFromRow(resource, data);
    for (const field of resource.fields) {
      if (field.required && (body[field.name] === undefined || body[field.name] === null || body[field.name] === "")) {
        setStatus(`Fill required field: ${field.name}`, "error");
        return;
      }
    }
    try {
      const { res, data: created } = await apiFetch(resource.path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok && created && typeof created === "object" && !Array.isArray(created)) {
        if (created.error) {
          showCrudError("Create", created.error);
          return;
        }
        const normalized = normalizeRow(resource, created);
        updateRowQuietly(row, { ...normalized, _pending: false });
        upsertRawRow(created);
        setStatus("Created.", "ok");
        return;
      }
      showCrudError("Create", created, `HTTP ${res.status}`);
    } catch (err) {
      showCrudError("Create", err, "Network error");
    }
  }

  function flattenRecord(obj) {
    const out = { ...obj };
    for (const k of Object.keys(out)) {
      if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
        delete out[k];
      }
    }
    return out;
  }

  async function patchCell(resource, row, fieldName, value) {
    const field = resource.fields.find((f) => f.name === fieldName);
    if (!field) {
      return;
    }
    const rowData = row.getData();
    if (!isRowPatchable(resource, rowData)) {
      setStatus("This record is read-only for the current user.", "error");
      return;
    }
    const id = rowData.id;
    if (id == null || id === "") {
      return;
    }
    if (needsAuthForWrite(resource, "update") && !getToken()) {
      setStatus("Log in to update rows.", "error");
      return;
    }
    const payload = { [field.name]: serializeForApi(field, value) };
    try {
      const { res, data } = await apiFetch(`${resource.path}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const normalized = normalizeRow(resource, data);
        updateRowQuietly(row, normalized);
        upsertRawRow(data);
        setStatus("Saved.", "ok");
        return;
      }
      showCrudError("Update", data, `HTTP ${res.status}`);
    } catch (err) {
      showCrudError("Update", err, "Network error");
    }
  }

  function normalizeRow(resource, raw) {
    const row = { ...raw };
    const owner =
      row.owner && typeof row.owner === "object"
        ? row.owner
        : null;
    for (const field of resource.fields) {
      const nested = row[field.name];
      if (
        field.relation &&
        nested &&
        typeof nested === "object" &&
        nested.id != null
      ) {
        row[field.name] = nested.id;
      }
    }
    const flat = flattenRecord(row);
    if (owner) {
      flat.owner_id = owner.id;
      flat.creator = owner.username || String(owner.id || "");
    }
    for (const f of resource.fields) {
      if (Object.prototype.hasOwnProperty.call(flat, f.name)) {
        flat[f.name] = normalizeIncomingValue(f, flat[f.name]);
      }
    }
    return flat;
  }

  async function loadTable(resourceType) {
    const resource = state.schema.resources.find((r) => r.type === resourceType);
    if (!resource) {
      return;
    }
    state.resource = resource;

    try {
      if (needsAuthForRead(resource) && !getToken()) {
        setStatus("This list requires login. Sign in above.", "error");
      } else {
        setStatus("");
      }

      await loadFkOptions(resource);
      await loadUserOptions();
      renderFilterControls(resource);
      const listPath = buildListUrl(resource);
      updateFilterRequestLink(listPath);

      try {
        await ensureTabulator();
      } catch (e) {
        setStatus(e.message || String(e), "error");
        return;
      }

      if (state.table) {
        state.table.destroy();
        state.table = null;
      }

      const cols = buildColumns(resource);

      state.table = new Tabulator("#data-table", {
        height: 420,
        layout: "fitColumns",
        placeholder: "No rows yet. Use “Add row”.",
        editable: true,
        columns: cols,
        rowFormatter: (row) => {
          const element = row.getElement();
          element.classList.remove("record-read-only", "record-patchable");
          element.classList.add(isRowPatchable(resource, row.getData()) ? "record-patchable" : "record-read-only");
        },
      });

      /*
       * Tabulator does not use DOM "input"/"change" on <td> — edits commit on blur/Enter and fire cellEdited.
       * Prefer .on("cellEdited") over the constructor option; it is wired reliably across Tabulator 6.x.
       */
      state.table.on("cellEdited", (cell) => {
        void (async () => {
          if (suppressCellEdit > 0) {
            return;
          }
          try {
            const field = cell.getField();
            const row = cell.getRow();
            const data = row.getData();
            if (field === "_del" || field === "id") {
              return;
            }
            if (data._pending) {
              await saveNewRow(row);
              return;
            }
            await patchCell(resource, row, field, cell.getValue());
          } catch (err) {
            setStatus(err?.message || String(err), "error");
          }
        })();
      });

      if (needsAuthForRead(resource) && !getToken()) {
        state.loadedRows = [];
        state.loadedRowsRaw = [];
        state.table.setData([]);
        renderJsonView();
        return;
      }

      const { res, data } = await apiFetch(listPath, { method: "GET" });
      if (!res.ok) {
        setStatus(data?.error || `List failed (${res.status})`, "error");
        state.loadedRows = [];
        state.loadedRowsRaw = [];
        state.table.setData([]);
        renderJsonView();
        return;
      }
      setLoadedRowsFromApi(resource, Array.isArray(data) ? data : []);
      state.table.setData(state.loadedRows);
      setStatus(`Loaded ${state.loadedRows.length} row(s).`, "ok");
    } finally {
      syncFilterActiveUi();
    }
  }

  async function applyAuthToken(token, message) {
    setToken(token);
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.value = "";
    }
    const preferredValue = document.getElementById("resource-select")?.value || state.resource?.type || "";
    try {
      const userOk = await syncCurrentUser();
      if (!userOk) {
        setToken("");
      }
      const selected = await loadSchema(preferredValue);
      if (selected) {
        await loadTable(selected);
      } else {
        resetGridState();
        setStatus(message, "ok");
      }
    } catch (e) {
      setStatus((e && e.message) || String(e), "error");
      return;
    }
  }

  async function login(username, password) {
    const { res, data } = await publicPost("/auth/login", { username, password });
    if (res.ok && data?.token) {
      await applyAuthToken(data.token, "Logged in.");
      return;
    }
    setStatus(data?.error || "Login failed.", "error");
  }

  async function logout() {
    setToken("");
    state.currentUser = null;
    state.userOptions = [];
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.value = "";
    }
    resetGridState();
    try {
      await loadSchema("");
      setStatus("", "");
    } catch (e) {
      setStatus(e.message || String(e), "error");
      return;
    }
  }

  function wireUi() {
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("username").value.trim();
      const p = document.getElementById("password").value;
      login(u, p);
    });

    document.getElementById("logout-btn").addEventListener("click", () => {
      void logout();
    });

    document.getElementById("resource-select").addEventListener("change", (e) => {
      if (state.resource?.type) {
        captureFilterValues(state.resource.type);
      }
      closeFilterPanelIfOpen();
      const v = e.target.value;
      syncToolbarActionsVisibility();
      if (v) {
        loadTable(v);
      } else {
        resetGridState();
        setStatus("");
      }
    });

    document.getElementById("view-mode-table-btn").addEventListener("click", () => {
      setViewMode("spreadsheet");
    });
    document.getElementById("view-mode-code-btn").addEventListener("click", () => {
      setViewMode("json");
    });

    const filterOpenBtn = document.getElementById("filter-open-btn");
    if (filterOpenBtn) {
      filterOpenBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFilterPanel();
      });
    }
    document.getElementById("filter-close-btn").addEventListener("click", () => {
      closeFilterPanelIfOpen();
    });

    const filterClearToolbarBtn = document.getElementById("filter-clear-toolbar-btn");
    if (filterClearToolbarBtn) {
      filterClearToolbarBtn.addEventListener("click", () => {
        if (state.resource) {
          clearFilterValues(state.resource.type);
          closeFilterPanelIfOpen();
          void loadTable(state.resource.type);
        }
      });
    }

    const filterFieldsEl = document.getElementById("filter-fields");
    if (filterFieldsEl) {
      const onFilterFieldInput = () => {
        if (state.resource) {
          captureFilterValues(state.resource.type);
          syncFilterActiveUi();
        }
      };
      filterFieldsEl.addEventListener("input", onFilterFieldInput);
      filterFieldsEl.addEventListener("change", onFilterFieldInput);
    }

    document.addEventListener("click", (e) => {
      const wrap = document.getElementById("filter-dropdown");
      if (!wrap || !e.target || wrap.contains(e.target)) {
        return;
      }
      closeFilterPanelIfOpen();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !isFilterPanelOpen()) {
        return;
      }
      e.preventDefault();
      closeFilterPanelIfOpen();
    });

    document.getElementById("apply-filters-btn").addEventListener("click", () => {
      if (state.resource) {
        captureFilterValues(state.resource.type);
        closeFilterPanelIfOpen();
        loadTable(state.resource.type);
      }
    });

    document.getElementById("clear-filters-btn").addEventListener("click", () => {
      if (state.resource) {
        clearFilterValues(state.resource.type);
        loadTable(state.resource.type);
      }
    });

    document.getElementById("filter-fields").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && state.resource) {
        e.preventDefault();
        captureFilterValues(state.resource.type);
        closeFilterPanelIfOpen();
        loadTable(state.resource.type);
      }
    });

    document.getElementById("add-row-btn").addEventListener("click", () => {
      if (!state.table || !state.resource) {
        setStatus("Select a resource first.", "error");
        return;
      }
      const r = state.resource;
      if (needsAuthForWrite(r, "create") && !getToken()) {
        setStatus("Log in to add rows.", "error");
        return;
      }
      const blank = { _pending: true };
      for (const f of r.fields) {
        blank[f.name] = fieldStorageType(f) === "boolean" ? false : "";
      }
      Promise.resolve(state.table.addRow(blank, true));
      setStatus("New row: fill cells, then edit any cell to save (or Tab out).", "ok");
    });
  }

  async function boot() {
    wireUi();
    try {
      if (getToken()) {
        const userOk = await syncCurrentUser();
        if (!userOk) {
          setToken("");
          state.currentUser = null;
        }
      }
      const selected = await loadSchema();
      if (selected) {
        await loadTable(selected);
      } else if (getAllResources().length > 0 && getToken()) {
        setStatus("Pick a resource to load rows.", "ok");
      } else {
        setStatus("");
      }
    } catch (e) {
      setStatus(e.message || String(e), "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
