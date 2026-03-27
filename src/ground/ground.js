import * as THREE from "three";
import { TileGrid } from "./tileGrid.js";
import { HeatmapOverlay } from "./heatmapOverlay.js";
import { DEFAULT_TILE_DIVISIONS_PER_ROW } from "../utils/constants.js";

export class GroundSystem {
  constructor(scene) {
    this.tileGrid = new TileGrid();
    this.heatmap = new HeatmapOverlay(this.tileGrid);
    this.group = this.tileGrid.group;
    this.contextGroup = new THREE.Group();
    this.contextPads = [];
    this.contextMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8b289,
      roughness: 1,
      metalness: 0,
    });

    for (let index = 0; index < 4; index++) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.contextMaterial);
      pad.name = `ground-context-pad-${index + 1}`;
      pad.userData.simulationKind = "outer_terrain";
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0;
      pad.receiveShadow = true;
      pad.renderOrder = 0;
      this.contextGroup.add(pad);
      this.contextPads.push(pad);
    }

    this.group.add(this.contextGroup);
    this.group.add(this.heatmap.mesh);
    scene.add(this.group);
  }

  updateFromState(state, summary = null) {
    const tileSize = state.groundTileSize > 0
      ? state.groundTileSize
      : state.rowSpacing / DEFAULT_TILE_DIVISIONS_PER_ROW;
    const innerWidth = summary
      ? Math.min(state.groundSize, summary.arrayW + (2 * state.arrayEdgeBuffer))
      : state.groundSize;
    const innerDepth = summary
      ? Math.min(state.groundSize, summary.arrayD + (2 * state.arrayEdgeBuffer))
      : state.groundSize;

    this.tileGrid.update({
      width: innerWidth,
      depth: innerDepth,
      tileSize,
    });
    this.updateContextPads(state, summary);
    this.heatmap.syncToTileGrid();
    if (state.showHeatmap !== "on") {
      this.heatmap.material.opacity = 0;
      this.heatmap.mesh.visible = false;
    }
  }

  updateContextPads(state, summary) {
    if (!summary) {
      for (const pad of this.contextPads) pad.visible = false;
      return;
    }

    const innerWidth = Math.min(state.groundSize, summary.arrayW + (2 * state.arrayEdgeBuffer));
    const innerDepth = Math.min(state.groundSize, summary.arrayD + (2 * state.arrayEdgeBuffer));
    const halfGround = state.groundSize / 2;
    const halfInnerWidth = innerWidth / 2;
    const halfInnerDepth = innerDepth / 2;

    const pads = [
      { width: state.groundSize, depth: Math.max(0, halfGround - halfInnerDepth), x: 0, z: -(halfInnerDepth + Math.max(0, halfGround - halfInnerDepth) / 2) },
      { width: state.groundSize, depth: Math.max(0, halfGround - halfInnerDepth), x: 0, z: halfInnerDepth + Math.max(0, halfGround - halfInnerDepth) / 2 },
      { width: Math.max(0, halfGround - halfInnerWidth), depth: innerDepth, x: -(halfInnerWidth + Math.max(0, halfGround - halfInnerWidth) / 2), z: 0 },
      { width: Math.max(0, halfGround - halfInnerWidth), depth: innerDepth, x: halfInnerWidth + Math.max(0, halfGround - halfInnerWidth) / 2, z: 0 },
    ];

    for (let index = 0; index < this.contextPads.length; index++) {
      const pad = this.contextPads[index];
      const config = pads[index];
      const visible = config.width > 0.01 && config.depth > 0.01;
      pad.visible = visible;
      if (!visible) continue;
      pad.scale.set(config.width, config.depth, 1);
      pad.position.set(config.x, 0, config.z);
    }
  }

  getTileDescriptor() {
    return this.tileGrid.getDescriptor();
  }

  worldToTile(x, z) {
    return this.tileGrid.worldToTile(x, z);
  }

  tileToWorld(row, col) {
    return this.tileGrid.tileToWorld(row, col);
  }

  setGridVisible(visible) {
    this.tileGrid.setGridVisible(visible);
  }
}
