const STORAGE_KEY = "agrivoltaic-platform-session-v1";

const DEFAULT_SESSION = {
  projectName: "Agrivoltaic Study",
  project: null,
  site: null,
  designState: null,
  sensorSelection: null,
  lastJobId: null,
  jobs: {},
};

function safeParse(raw) {
  if (!raw) return { ...DEFAULT_SESSION };
  try {
    return {
      ...DEFAULT_SESSION,
      ...JSON.parse(raw),
    };
  } catch {
    return { ...DEFAULT_SESSION };
  }
}

export function createSessionStore(storage = window.localStorage) {
  function load() {
    return safeParse(storage.getItem(STORAGE_KEY));
  }

  function save(next) {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function patch(update) {
    const next = {
      ...load(),
      ...update,
    };
    return save(next);
  }

  return {
    load,
    save,
    patch,
    getProject() {
      return load().project;
    },
    setProject(project) {
      return patch({
        project,
        projectName: project?.name || load().projectName,
      });
    },
    applyProjectSnapshot(snapshot) {
      if (!snapshot?.project) return load();
      const current = load();
      const next = {
        ...current,
        projectName: snapshot.project.name || current.projectName,
        project: snapshot.project,
        site: Object.prototype.hasOwnProperty.call(snapshot, "site") ? snapshot.site : current.site,
        designState: Object.prototype.hasOwnProperty.call(snapshot, "designState") ? snapshot.designState : current.designState,
        sensorSelection: Object.prototype.hasOwnProperty.call(snapshot, "sensorSelection") ? snapshot.sensorSelection : current.sensorSelection,
        lastJobId: Object.prototype.hasOwnProperty.call(snapshot, "lastJobId") ? snapshot.lastJobId : current.lastJobId,
        jobs: {
          ...current.jobs,
          ...(snapshot.jobs || {}),
        },
      };
      return save(next);
    },
    buildProjectSnapshot(overrides = {}) {
      const session = load();
      const project = overrides.project || session.project;
      if (!project?.rootPath) {
        throw new Error("Choose a project folder before saving the project.");
      }
      return {
        version: "1",
        savedAt: new Date().toISOString(),
        project: {
          name: project.name || session.projectName,
          rootPath: project.rootPath,
          fileName: project.fileName || "agrivoltaic-project.json",
        },
        site: Object.prototype.hasOwnProperty.call(overrides, "site") ? overrides.site : session.site,
        designState: Object.prototype.hasOwnProperty.call(overrides, "designState") ? overrides.designState : session.designState,
        serializedConfig: overrides.serializedConfig,
        sensorSelection: Object.prototype.hasOwnProperty.call(overrides, "sensorSelection") ? overrides.sensorSelection : session.sensorSelection,
        lastJobId: Object.prototype.hasOwnProperty.call(overrides, "lastJobId") ? overrides.lastJobId : session.lastJobId,
        jobs: {
          ...session.jobs,
          ...(overrides.jobs || {}),
        },
      };
    },
    getSite() {
      return load().site;
    },
    setSite(site) {
      return patch({ site });
    },
    getDesignState() {
      return load().designState;
    },
    setDesignState(designState) {
      return patch({ designState });
    },
    getSensorSelection() {
      return load().sensorSelection;
    },
    setSensorSelection(sensorSelection) {
      return patch({ sensorSelection });
    },
    getProjectName() {
      return load().projectName;
    },
    setProjectName(projectName) {
      return patch({ projectName });
    },
    getLastJobId() {
      return load().lastJobId;
    },
    rememberJob(job) {
      const session = load();
      session.jobs[job.jobId] = job;
      session.lastJobId = job.jobId;
      return save(session);
    },
  };
}
