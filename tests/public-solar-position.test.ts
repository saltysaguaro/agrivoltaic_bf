import test from "node:test";
import assert from "node:assert/strict";

async function loadSolarModule() {
  // The solar utilities ship as browser-side JavaScript, so the test loads them dynamically.
  // @ts-ignore local browser module under test
  return import("../src/public/solarPosition.js");
}

test("zonedDateTimeToUtc uses daylight-saving offset for summer Denver timestamps", async () => {
  const { zonedDateTimeToUtc } = await loadSolarModule();
  const { utcDate } = zonedDateTimeToUtc("2026-06-21", 12 * 60, "America/Denver");
  assert.equal(utcDate.toISOString(), "2026-06-21T18:00:00.000Z");
});

test("summer midday sun in Golden is high and roughly southern", async () => {
  const { computeSolarPosition } = await loadSolarModule();
  const solar = computeSolarPosition({
    latitude: 39.7555,
    longitude: -105.2211,
    dateInput: "2026-06-21",
    minutesInDay: 13 * 60,
    timeZone: "America/Denver",
  });

  assert.equal(solar.timeZone, "America/Denver");
  assert.ok(solar.apparentElevationDeg > 70 && solar.apparentElevationDeg < 76);
  assert.ok(solar.azimuthDeg > 150 && solar.azimuthDeg < 210);
  assert.equal(solar.isDaylight, true);
});

test("winter midday sun is much lower than summer midday sun at the same site", async () => {
  const { computeSolarPosition } = await loadSolarModule();
  const summer = computeSolarPosition({
    latitude: 39.7555,
    longitude: -105.2211,
    dateInput: "2026-06-21",
    minutesInDay: 13 * 60,
    timeZone: "America/Denver",
  });
  const winter = computeSolarPosition({
    latitude: 39.7555,
    longitude: -105.2211,
    dateInput: "2026-12-21",
    minutesInDay: 12 * 60,
    timeZone: "America/Denver",
  });

  assert.ok(winter.apparentElevationDeg > 24 && winter.apparentElevationDeg < 31);
  assert.ok(summer.apparentElevationDeg > winter.apparentElevationDeg + 40);
});

test("invalid time zones fall back to a longitude-based estimate", async () => {
  const { resolveSiteTimeZone } = await loadSolarModule();
  const timeZone = resolveSiteTimeZone({
    longitude: -105.2211,
    timezone: "Invalid/Zone",
  });
  assert.equal(timeZone, "America/Denver");
});

test("Arizona locations use America/Phoenix when Mapbox only provides region context", async () => {
  const { resolveSiteTimeZone, computeSolarPosition } = await loadSolarModule();
  const site = {
    latitude: 32.2226,
    longitude: -110.9747,
    region: "Arizona",
    regionCode: "US-AZ",
    country: "United States",
    countryCode: "us",
    timezone: "",
  };

  site.timezone = resolveSiteTimeZone(site);
  assert.equal(site.timezone, "America/Phoenix");

  const solar = computeSolarPosition({
    latitude: site.latitude,
    longitude: site.longitude,
    dateInput: "2026-06-21",
    minutesInDay: 10 * 60,
    timeZone: site.timezone,
  });

  assert.equal(solar.timeZone, "America/Phoenix");
  assert.ok(solar.apparentElevationDeg > 50 && solar.apparentElevationDeg < 60);
  assert.ok(solar.azimuthDeg > 90 && solar.azimuthDeg < 110);
});
