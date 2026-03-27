# Agrivoltaic Visualizer

Agrivoltaic Visualizer is a local-first agrivoltaic modeling and visualization platform for exploring photovoltaic system layouts, crop-space relationships, and annual irradiance conditions. The browser application uses a shared three.js scene as the geometry source of truth, while the backend packages that geometry for sensor inference, weather acquisition, Radiance-based export, and annual simulation workflows.

The project is organized around a practical agrivoltaic workflow:

- choose a site
- build a conceptual 3D array layout
- define sensor coverage
- run an annual irradiance study
- review seasonal and height-slice results in the browser

## Core capabilities

### 3D agrivoltaic layout design

The design interface provides a realtime three.js configurator for agrivoltaic PV layouts. The scene updates immediately as layout parameters change, and the same geometry is reused downstream for export and analysis.

Supported system archetypes:

- fixed tilt
- single-axis tracker
- raised / pergola
- vertical bifacial

Key design inputs include:

- DC system size
- table configuration
- module dimensions
- tilt or tracker angle
- array azimuth
- height / clearance
- row spacing
- row-column grouping
- crop row buffers and edge buffers

### Crop-space and ground relationship modeling

The scene is built for agrivoltaic interpretation rather than PV geometry alone. The app tracks:

- array footprint
- inter-row openings
- crop-row width
- crop-bed placement
- edge and planting buffers

This makes it possible to compare how different mounting styles change the available plantable corridor beneath or between PV rows.

### Sensor selection and export preparation

After the design stage, the app opens a sensor-layout workflow that can infer sampling volumes from the current scene. This supports:

- representative center-array sampling
- central-row sampling
- full-array repeated sampling across adjacent row pairs

The export pipeline packages scene geometry, materials, sensor definitions, and metadata for local or portable analysis workflows.

### Annual irradiance modeling

The local backend supports annual irradiance studies driven by real geometry and weather inputs. The user-facing annual workflow is built around:

- site selection and geocoding
- weather acquisition
- sensor-grid generation
- export of Radiance-ready geometry
- `bifacial_radiance`-based annual simulation
- storage of job artifacts and result datasets

The current implementation is designed for local execution on a workstation with Python and Radiance installed.

### Results review

The results interface is designed for agrivoltaic interpretation rather than raw file inspection. It supports:

- annual totals
- wrapped seasonal month ranges
- height slices
- edge versus interior comparisons
- irradiance, shade-fraction, and related derived views

## Application flow

### Landing page

The landing page is the local project entry point. It handles:

- project folder selection
- project snapshot loading
- site selection
- Mapbox-backed address lookup

### Design page

The design page is the main three.js configurator. It is used to:

- select the system archetype
- edit layout geometry
- review computed summary metrics
- save the current design state
- launch the sensor layout or modeling workflow

### Sensor layout page

The sensor layout page derives analysis coverage from the current scene geometry and prepares the study configuration used for annual jobs.

### Run page

The run page tracks asynchronous annual job progress, logs, and backend execution state.

### Results page

The results page visualizes completed annual datasets and supports comparison across months, heights, and sensor groupings.

## Architecture

### Frontend

The frontend is a multi-page browser application built directly from HTML, CSS, and ES modules.

Important frontend areas:

- `src/app/`: state, events, and mount logic for the designer
- `src/scene/`: shared three.js scene, camera, lighting, controls, and rendering
- `src/systems/`: system archetypes and assembly logic
- `src/ground/`: ground grid and heatmap overlays
- `src/crops/`: crop-space and planting geometry
- `src/platform/`: page controllers, session helpers, routing, and browser-side platform logic

### Shared packages

`packages/shared/` contains common schemas, constants, math helpers, and platform contracts used by both the frontend and backend.

`packages/three-exporter/` contains scene export, tagging, selection, metadata, and result-import helpers.

### Backend

`packages/simulation-backend/` provides:

- the local Express server
- project storage
- site lookup integration
- annual job orchestration
- weather acquisition
- Radiance export assembly
- sensor inference
- result parsing and aggregation

## Repository layout

```text
.
├── index.html
├── design.html
├── sensor-layout.html
├── model-run.html
├── results.html
├── public-visualizer.html
├── src/
│   ├── app/
│   ├── crops/
│   ├── ground/
│   ├── platform/
│   ├── public/
│   ├── scene/
│   ├── systems/
│   ├── ui/
│   └── utils/
├── packages/
│   ├── shared/
│   ├── simulation-backend/
│   ├── three-exporter/
│   └── examples/
├── scripts/
├── tests/
└── docs/
```

## Requirements

The local annual-modeling workflow depends on:

- Node.js 20 or newer
- `pnpm` 10
- Python with `bifacial_radiance` and `pvlib`
- Radiance CLI tools on `PATH`

Optional integrations:

- Mapbox token for site autocomplete
- NSRDB credentials for weather retrieval

## Local setup

Install JavaScript dependencies and build the workspace:

```bash
corepack enable
corepack pnpm install
corepack pnpm build
```

Set the runtime environment as needed:

```bash
export MAPBOX_ACCESS_TOKEN="your_mapbox_token_here"
export NSRDB_API_KEY="your_nrel_api_key_here"
export NSRDB_EMAIL="your_email@example.com"
export AGRIVOLTAIC_PYTHON="/path/to/python"
export AGRIVOLTAIC_RADIANCE_BIN_DIR="/path/to/Radiance/bin"
```

Start the local backend:

```bash
corepack pnpm start:backend
```

Then open:

- [http://localhost:8787](http://localhost:8787)

## Runtime and data notes

- The browser app relies on the backend for project storage, routing, site lookup, and annual jobs.
- Local job outputs are written under `local-data/jobs/<jobId>/`.
- `local-data/` is ignored by Git and is intended for local study artifacts only.
- The backend stores job metadata, requests, weather data, logs, and result files for each run.

## Useful scripts

- `corepack pnpm build`: build all workspace packages and regenerate the static public-page output
- `corepack pnpm build:pages`: regenerate the static public-page output only
- `corepack pnpm lint`: run TypeScript checks
- `corepack pnpm test`: run the automated test suite
- `corepack pnpm dev:backend`: start the backend from source with `tsx`
- `corepack pnpm start:backend`: start the built backend

## Tests

The test suite covers:

- annual job creation and result handling
- sensor-grid inference
- Mapbox normalization and lookup helpers
- material and export validation
- month-range expansion and annual metrics
- project persistence
- results import
- routing and security behavior
- public solar-position calculations

## Notes for publishing the repository

- `docs/` contains generated static assets used by the public visualizer
- `public-visualizer.config.js` is a browser-side config file, not a secret store
- `node_modules/`, `.env`, `local-data/`, and local logs are ignored

## Open repository decision

- Choose a license before making the repository public
