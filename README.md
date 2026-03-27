# Agrivoltaic Visualizer

Agrivoltaic Visualizer is a local-first design and analysis workspace for agrivoltaic PV layouts. The repository combines a browser-based three.js configurator, a local simulation backend, shared export utilities, and a lightweight GitHub Pages shade visualizer built from the same geometry presets.

## What is in this repo

- Local application pages for site setup, system design, sensor selection, run monitoring, and results review
- Shared packages for schemas, math, export packaging, and backend utilities
- A public-facing shade visualizer for GitHub Pages that exposes only location, system type, date, and time
- A local annual-model workflow that exports geometry from the three.js scene and runs irradiance studies through `bifacial_radiance`

## Main entry points

- `index.html`: landing page for local project setup and site selection
- `design.html`: interactive system designer
- `sensor-layout.html`: sensor selection workspace
- `model-run.html`: job status page
- `results.html`: annual results explorer
- `public-visualizer.html`: standalone public shade visualizer source
- `docs/`: generated GitHub Pages output for the public visualizer

## Repository layout

```text
.
├── public-visualizer.html
├── public-visualizer.css
├── public-visualizer.config.js
├── docs/
├── packages/
│   ├── shared/
│   ├── simulation-backend/
│   ├── three-exporter/
│   └── examples/
├── scripts/
│   └── build-public-pages.mjs
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
└── tests/
```

## Requirements

- Node.js 20 or newer
- `pnpm` 10
- Python environment with `bifacial_radiance` and `pvlib` for annual modeling
- Radiance CLI tools on `PATH` for annual modeling and export workflows
- Optional Mapbox public token for the GitHub Pages visualizer
- Optional Mapbox token and NSRDB credentials for local site lookup and annual weather acquisition

## Local development

Install dependencies and build the workspace:

```bash
corepack enable
corepack pnpm install
corepack pnpm build
```

Start the local backend:

```bash
corepack pnpm start:backend
```

The local app is served from:

- [http://localhost:8787](http://localhost:8787)

The local pages rely on the backend for routing, project storage, site lookup, and annual jobs. Open them through the backend at `http://localhost:8787`.

## Public shade visualizer

The public visualizer is a static page that reuses the existing 55 kW system presets and scene code. It lives in:

- `public-visualizer.html`
- `public-visualizer.css`
- `public-visualizer.config.js`
- `src/public/`

The page computes sun azimuth and elevation from:

- Mapbox-selected location
- selected date
- selected time
- site timezone or longitude-based fallback

### Configure the public Mapbox token

Add a restricted public token to:

- `public-visualizer.config.js`

Use a `pk.` token restricted to your GitHub Pages domain and local preview domains.

### Generate GitHub Pages output

```bash
corepack pnpm build:pages
```

That command regenerates:

- `docs/index.html`
- `docs/public-visualizer.css`
- `docs/public-visualizer.config.js`
- `docs/src/*`

`docs/` is the publish target for GitHub Pages.

### Publish on GitHub Pages

1. Commit the repository, including the generated `docs/` directory.
2. Push the branch to GitHub.
3. In the repository settings, open `Pages`.
4. Choose `Deploy from a branch`.
5. Select the default branch and the `/docs` folder.

If the repository name is `username.github.io`, the site will publish at the root domain. Otherwise it will publish at `https://username.github.io/<repo-name>/`.

## Environment variables

Runtime configuration is read from the shell environment or a local `.env` file. The template is:

- `.env.example`

Common variables:

- `MAPBOX_ACCESS_TOKEN`: enables local site autocomplete and backend-backed site resolution
- `NSRDB_API_KEY`: enables NSRDB weather retrieval
- `NSRDB_EMAIL`: contact email for NSRDB requests
- `AGRIVOLTAIC_PYTHON`: Python interpreter used for annual modeling
- `AGRIVOLTAIC_RADIANCE_BIN_DIR`: preferred Radiance `bin` directory
- `AGRIVOLTAIC_ENGINE`: annual engine selection override

## Workspace packages

### `packages/shared`

Shared types, constants, schemas, and math utilities used across the frontend and backend.

### `packages/three-exporter`

Geometry export, metadata, object tagging, sensor request helpers, and browser-facing result utilities.

### `packages/simulation-backend`

Express server, project storage, site lookup, annual job orchestration, weather retrieval, Radiance pipeline assembly, and result parsing.

### `packages/examples`

Small example entry points for exporter and package workflows.

## Useful scripts

- `corepack pnpm build`: builds workspace packages and regenerates the GitHub Pages output
- `corepack pnpm build:pages`: regenerates only the GitHub Pages output
- `corepack pnpm lint`: runs TypeScript checking
- `corepack pnpm test`: runs the test suite
- `corepack pnpm dev:backend`: runs the backend from source with `tsx`
- `corepack pnpm start:backend`: runs the built backend

## Annual modeling notes

The annual workflow uses the three.js scene as the geometry source of truth and runs the user-facing engine through `bifacial_radiance`. Annual job artifacts are written under:

- `local-data/jobs/<jobId>/`

That directory is ignored by Git and is intended for local study outputs, logs, and imported result packages.

## Tests

The test suite covers:

- annual job and results logic
- month-range handling
- sensor layout inference
- Mapbox site normalization
- server security and routing behavior
- project persistence and imports
- public solar-position calculations

Run:

```bash
corepack pnpm lint
corepack pnpm test
```

## Notes for a new GitHub repository

- `docs/` is generated content for GitHub Pages and is expected to be committed
- `local-data/`, `node_modules/`, `.env`, and local logs are ignored
- `public-visualizer.config.js` ships with an empty token placeholder
- Package `dist/` directories are part of the browser/runtime flow after a build

## Open repository decision

- Choose a license before making the repository public
