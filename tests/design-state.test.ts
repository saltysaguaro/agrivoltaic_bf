import test from "node:test";
import assert from "node:assert/strict";
// @ts-ignore JS app module used directly in tests.
import { createStateStore, sanitizeState } from "../src/app/state.js";
// @ts-ignore JS app module used directly in tests.
import { DEFAULTS, SYSTEM_PRESETS } from "../src/utils/constants.js";
// @ts-ignore JS app module used directly in tests.
import { computeArrayLayout } from "../src/utils/layout.js";
// @ts-ignore JS app module used directly in tests.
import { getArchetype } from "../src/systems/systemFactory.js";

test("designer defaults to a 55 kW DC system", () => {
  const store = createStateStore();
  const state = store.getState();

  assert.equal(DEFAULTS.dcSizeKw, 55);
  assert.equal(state.dcSizeKw, 55);
  assert.equal(SYSTEM_PRESETS.fixed.dcSizeKw, 55);
  assert.equal(SYSTEM_PRESETS.sat.dcSizeKw, 55);
  assert.equal(SYSTEM_PRESETS.raised.dcSizeKw, 55);
  assert.equal(SYSTEM_PRESETS.vertical.dcSizeKw, 55);
});

test("pergola tracking toggles convert azimuth between surface and row-axis conventions", () => {
  const store = createStateStore({
    ...SYSTEM_PRESETS.raised,
    systemType: "raised",
    systemAzimuthDeg: 210,
    pergolaTracking: false,
  });

  store.setState({ pergolaTracking: true });
  assert.equal(store.getState().systemAzimuthDeg, 120);

  store.setState({ pergolaTracking: false });
  assert.equal(store.getState().systemAzimuthDeg, 210);
});

test("pergola crop rows use the full row pitch minus crop-row edge setbacks", () => {
  const state = sanitizeState({
    ...SYSTEM_PRESETS.raised,
    systemType: "raised",
    rowSpacing: 9.144,
    cropRowBuffer: 0.3048,
  });
  const layout = computeArrayLayout(state, getArchetype("raised"));

  assert.ok(layout.cropRows.length > 0);
  assert.equal(layout.cropRows.length, layout.rowCount);
  assert.equal(
    Number(layout.cropRows[0]!.width.toFixed(6)),
    Number((state.rowSpacing - (state.cropRowBuffer * 2)).toFixed(6)),
  );
  assert.ok(layout.cropRows[0]!.width > layout.crossAxisFootprint);
});
