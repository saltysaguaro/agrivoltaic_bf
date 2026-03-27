import { createSceneApp } from "../scene/scene.js";
import { DEFAULTS, SYSTEM_PRESETS, SYSTEM_TYPE_OPTIONS } from "../utils/constants.js";
import { formatDimensions, formatLength } from "../utils/units.js";
import { roundTo } from "../utils/math.js";
import {
  computeSolarPosition,
  formatTimeInput,
  formatTimeLabel,
  getCurrentZonedDateTime,
  parseTimeInput,
  resolveSiteTimeZone,
  roundMinutes,
} from "./solarPosition.js";
import { mountPublicSiteLookup, normalizeConfiguredSite } from "./publicMapbox.js";

const SYSTEM_DESCRIPTIONS = {
  fixed: "Fixed tilt",
  sat: "Tracker",
  raised: "Raised canopy",
  vertical: "Vertical bifacial",
};

const DEFAULT_MONTH_DAY = "06-21";
const DEFAULT_MINUTES_IN_DAY = 10 * 60;

function queryElements() {
  return {
    siteSearchInput: document.getElementById("siteSearchInput"),
    siteSuggestions: document.getElementById("siteSuggestions"),
    siteLookupStatus: document.getElementById("siteLookupStatus"),
    selectedSiteLabel: document.getElementById("selectedSiteLabel"),
    selectedSiteMeta: document.getElementById("selectedSiteMeta"),
    timezoneBadge: document.getElementById("timezoneBadge"),
    systemSelector: document.getElementById("systemSelector"),
    dateInput: document.getElementById("dateInput"),
    timeInput: document.getElementById("timeInput"),
    timeSlider: document.getElementById("timeSlider"),
    timeDisplay: document.getElementById("timeDisplay"),
    solarStatus: document.getElementById("solarStatus"),
    summaryCards: document.getElementById("summaryCards"),
    summaryNote: document.getElementById("summaryNote"),
    sceneHeading: document.getElementById("sceneHeading"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayBody: document.getElementById("overlayBody"),
    canvas: document.getElementById("viewportCanvas"),
    snapshotButton: document.getElementById("snapshotButton"),
    copyLinkButton: document.getElementById("copyLinkButton"),
    viewButtons: [...document.querySelectorAll("[data-view-preset]")],
  };
}

function buildSummaryCard({ label, value, meta }) {
  const card = document.createElement("article");
  card.className = "pv-summary-card";
  const labelEl = document.createElement("div");
  labelEl.className = "pv-summary-card__label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "pv-summary-card__value";
  valueEl.textContent = value;

  const metaEl = document.createElement("div");
  metaEl.className = "pv-summary-card__meta";
  metaEl.textContent = meta;

  card.append(labelEl, valueEl, metaEl);
  return card;
}

function validSystemType(value) {
  return SYSTEM_TYPE_OPTIONS.some((option) => option.value === value);
}

function stateFromQuery(defaultSite) {
  const params = new URLSearchParams(window.location.search);
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const querySite = hasValidCoordinates
    ? {
      label: params.get("label") || defaultSite.label,
      fullAddress: params.get("label") || defaultSite.fullAddress,
      latitude,
      longitude,
      timezone: params.get("tz") || defaultSite.timezone,
      timezoneApproximate: !params.get("tz"),
    }
    : defaultSite;

  // Shared links restore the last chosen site, system, date, time, and camera preset.
  const timeZone = resolveSiteTimeZone(querySite);
  const nowParts = getCurrentZonedDateTime(timeZone);
  const defaultYear = String(nowParts.dateInput).slice(0, 4) || String(new Date().getFullYear());
  const timeValue = params.get("time");

  return {
    site: {
      ...querySite,
      timezone: timeZone,
      timezoneApproximate: Boolean(querySite.timezoneApproximate),
    },
    systemType: validSystemType(params.get("system")) ? params.get("system") : DEFAULTS.systemType,
    dateInput: params.get("date") || `${defaultYear}-${DEFAULT_MONTH_DAY}`,
    minutesInDay: timeValue ? parseTimeInput(timeValue) : DEFAULT_MINUTES_IN_DAY,
    viewPreset: params.get("view") || "arrayOblique",
  };
}

function createPublicState(systemType, sunAz, sunEl) {
  const preset = SYSTEM_PRESETS[systemType] || {};
  return {
    ...DEFAULTS,
    ...preset,
    systemType,
    dcSizeKw: 55,
    showHeatmap: "off",
    showBuffers: "off",
    // The public page exposes sun state through date and time rather than manual numeric inputs.
    sunAz,
    sunEl,
  };
}

function syncUrl(state) {
  // Keep the page state in the URL so users can bookmark or share the current view.
  const params = new URLSearchParams(window.location.search);
  params.set("system", state.systemType);
  params.set("date", state.dateInput);
  params.set("time", formatTimeInput(state.minutesInDay));
  params.set("lat", String(roundTo(state.site.latitude, 6)));
  params.set("lng", String(roundTo(state.site.longitude, 6)));
  params.set("label", state.site.fullAddress || state.site.label);
  params.set("tz", state.site.timezone);
  params.set("view", state.viewPreset);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", nextUrl);
}

function renderSystemButtons(container, selectedSystem, onSelect) {
  container.replaceChildren(
    ...SYSTEM_TYPE_OPTIONS.map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pv-system-button${option.value === selectedSystem ? " is-active" : ""}`;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", option.value === selectedSystem ? "true" : "false");
      button.innerHTML = `
        <strong>${option.label}</strong>
        <span>${SYSTEM_DESCRIPTIONS[option.value] || "Standard 55 kW layout preset."}</span>
      `;
      button.addEventListener("click", () => onSelect(option.value));
      return button;
    }),
  );
}

function renderSiteSummary(elements, site) {
  elements.selectedSiteLabel.textContent = site.label;
  elements.selectedSiteMeta.textContent = `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}${site.timezoneApproximate ? " • timezone estimated from longitude" : ""}`;
  elements.timezoneBadge.textContent = site.timezone;
  elements.siteSearchInput.value = site.fullAddress || site.label;
}

function renderViewButtons(buttons, activeView) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewPreset === activeView);
  });
}

function renderSummary(elements, {
  site,
  sceneState,
  sceneSummary,
  solar,
  systemLabel,
}) {
  // Summary cards mirror the public controls and scene state without exposing the full local app settings.
  const cards = [
    {
      label: "Site",
      value: site.label,
      meta: `${site.latitude.toFixed(2)}, ${site.longitude.toFixed(2)}`,
    },
    {
      label: "Time",
      value: solar.localDateTimeLabel,
      meta: `${solar.timeZone} • ${solar.timeZoneOffsetLabel}`,
    },
    {
      label: "Sun",
      value: `${roundTo(solar.azimuthDeg, 1).toFixed(1)}° az • ${roundTo(solar.apparentElevationDeg, 1).toFixed(1)}° el`,
      meta: solar.isDaylight ? "Daylight" : "Below horizon",
    },
    {
      label: "System",
      value: systemLabel,
      meta: "55 kW preset",
    },
    {
      label: "Array",
      value: sceneSummary.moduleCount.toLocaleString(),
      meta: `${sceneSummary.rowCount.toLocaleString()} rows • ${sceneSummary.tablesNeeded.toLocaleString()} tables`,
    },
    {
      label: "Footprint",
      value: formatDimensions(sceneSummary.arrayW, sceneSummary.arrayD, sceneState),
      meta: `Pitch ${formatLength(sceneSummary.rowPitch, sceneState, { decimalsMetric: 1, decimalsImperial: 1 })}`,
    },
  ];

  elements.summaryCards.replaceChildren(...cards.map(buildSummaryCard));
  elements.summaryNote.textContent = solar.isDaylight
    ? "Direct shadows are active."
    : "Direct sun is off below the horizon.";
}

async function bootPublicVisualizer() {
  const config = window.AGRIVOLTAIC_PUBLIC_CONFIG || {};
  const elements = queryElements();
  const initial = stateFromQuery(normalizeConfiguredSite(config.defaultSite));
  const sceneApp = createSceneApp({
    canvas: elements.canvas,
  });

  const state = {
    ...initial,
  };

  let sceneState = null;
  let sceneSummary = null;
  let solar = null;
  let copyResetTimer = 0;

  function updateTimeControls() {
    // The slider, time input, and URL all work from the same rounded minute value.
    const roundedMinutes = roundMinutes(state.minutesInDay);
    state.minutesInDay = roundedMinutes;
    elements.timeInput.value = formatTimeInput(roundedMinutes);
    elements.timeSlider.value = String(roundedMinutes);
    elements.timeDisplay.textContent = formatTimeLabel(roundedMinutes);
  }

  function updateOverlay() {
    const systemOption = SYSTEM_TYPE_OPTIONS.find((option) => option.value === state.systemType);
    const systemLabel = systemOption?.label || "System";
    elements.sceneHeading.textContent = `${systemLabel} shade preview`;
    elements.overlayTitle.textContent = `${state.site.label} • ${systemLabel}`;
    elements.overlayBody.textContent = solar
      ? `${solar.localDateTimeLabel} • ${roundTo(solar.azimuthDeg, 1).toFixed(1)}° az / ${roundTo(solar.apparentElevationDeg, 1).toFixed(1)}° el`
      : "Orbit: drag • Zoom: scroll • Pan: right-drag";
  }

  function rebuildScene({ resetView = false } = {}) {
    solar = computeSolarPosition({
      latitude: state.site.latitude,
      longitude: state.site.longitude,
      dateInput: state.dateInput,
      minutesInDay: state.minutesInDay,
      timeZone: state.site.timezone,
    });

    // The main visualizer still expects sun azimuth and elevation, so the public page converts into that state.
    sceneState = createPublicState(
      state.systemType,
      solar.azimuthDeg,
      solar.apparentElevationDeg,
    );
    sceneSummary = sceneApp.rebuildSystem(sceneState);
    sceneApp.updateLighting(sceneState);
    if (resetView) {
      state.viewPreset = "arrayOblique";
    }
    sceneApp.setViewPreset(sceneState, state.viewPreset);

    const systemOption = SYSTEM_TYPE_OPTIONS.find((option) => option.value === state.systemType);
    renderSummary(elements, {
      site: state.site,
      sceneState,
      sceneSummary,
      solar,
      systemLabel: systemOption?.label || state.systemType,
    });
    updateOverlay();
    syncUrl(state);
    renderViewButtons(elements.viewButtons, state.viewPreset);

    elements.solarStatus.textContent = solar.isDaylight
      ? `${solar.localDateTimeLabel} • direct shade is active.`
      : `${solar.localDateTimeLabel} • sun below horizon.`;
  }

  function selectSystemType(systemType) {
    state.systemType = systemType;
    renderSystemButtons(elements.systemSelector, state.systemType, selectSystemType);
    rebuildScene({ resetView: true });
  }

  renderSiteSummary(elements, state.site);
  renderSystemButtons(elements.systemSelector, state.systemType, selectSystemType);

  updateTimeControls();
  elements.dateInput.value = state.dateInput;

  mountPublicSiteLookup({
    input: elements.siteSearchInput,
    suggestionsEl: elements.siteSuggestions,
    statusEl: elements.siteLookupStatus,
    token: config.mapboxToken?.trim() || "",
    async onSelect(site) {
      state.site = {
        ...site,
        timezone: resolveSiteTimeZone(site),
        timezoneApproximate: Boolean(site.timezoneApproximate),
      };
      // A new site changes both the solar calculation and the URL state.
      renderSiteSummary(elements, state.site);
      rebuildScene();
    },
  });

  elements.dateInput.addEventListener("change", () => {
    state.dateInput = elements.dateInput.value || state.dateInput;
    rebuildScene();
  });

  elements.timeInput.addEventListener("change", () => {
    state.minutesInDay = roundMinutes(parseTimeInput(elements.timeInput.value));
    updateTimeControls();
    rebuildScene();
  });

  elements.timeSlider.addEventListener("input", () => {
    state.minutesInDay = roundMinutes(Number(elements.timeSlider.value));
    updateTimeControls();
    rebuildScene();
  });

  elements.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.viewPreset = button.dataset.viewPreset || "arrayOblique";
      renderViewButtons(elements.viewButtons, state.viewPreset);
      sceneApp.setViewPreset(sceneState, state.viewPreset);
      syncUrl(state);
    });
  });

  elements.snapshotButton.addEventListener("click", () => {
    sceneApp.exportSnapshot("agrivoltaic-shade-visualizer.png");
  });

  elements.copyLinkButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      window.clearTimeout(copyResetTimer);
      elements.copyLinkButton.textContent = "Copied";
      copyResetTimer = window.setTimeout(() => {
        elements.copyLinkButton.textContent = "Copy Link";
      }, 1200);
    } catch {
      elements.copyLinkButton.textContent = "Copy Failed";
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        elements.copyLinkButton.textContent = "Copy Link";
      }, 1400);
    }
  });

  window.addEventListener("resize", () => sceneApp.resize());

  rebuildScene({ resetView: true });
}

void bootPublicVisualizer();
