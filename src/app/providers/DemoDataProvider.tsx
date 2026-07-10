import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  floorPlans as initialFloorPlans,
  galleryPhotos as initialGalleryPhotos,
  projects as initialProjects,
  tasks as initialTasks,
  timeEntries as initialTimeEntries
} from "@/infrastructure/offline/mockData";
import type { FloorPlan, GalleryPhoto, Project, ProjectStatus, Task, TaskStatus, TimeEntry } from "@/shared/types/domain";
import { deletePersistedPlan, duplicatePersistedPlan, loadOfflineState, persistPhoto, persistPlan, persistPlanPatch, persistProject, persistProjectPatch, persistTask, updatePlanPreview } from "@/core/storage/repositories/offlineRepository";
import { PDF_COMPRESSION_ERROR, PDF_PREVIEW_VERSION, renderPdfFirstPage } from "@/shared/utils/renderPdfPreview";

export interface NewProjectInput {
  name: string;
  clientId: string;
  address: string;
  managerId: string;
  status: ProjectStatus;
}

export interface NewTaskInput {
  projectId: string;
  floorPlanId?: string;
  title: string;
  category: string;
  status: TaskStatus;
  assigneeId: string;
  priority: Task["priority"];
  x_percent?: number;
  y_percent?: number;
}

interface DemoDataContextValue {
  projects: Project[];
  floorPlans: FloorPlan[];
  tasks: Task[];
  galleryPhotos: GalleryPhoto[];
  timeEntries: TimeEntry[];
  addProject: (input: NewProjectInput) => Project;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  addFloorPlan: (projectId: string, file: File) => FloorPlan;
  updateFloorPlan: (planId: string, patch: Partial<FloorPlan>) => void;
  deleteFloorPlan: (planId: string) => void;
  duplicateFloorPlan: (planId: string) => FloorPlan | undefined;
  repairFloorPlanPreview: (planId: string, previewBlob: Blob, previewUrl: string) => void;
  addTask: (input: NewTaskInput) => Task;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addGalleryPhoto: (projectId: string, file: File, title?: string) => GalleryPhoto;
  updateTimeEntry: (entryId: string, patch: Partial<TimeEntry>) => void;
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null);

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>(initialFloorPlans);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(initialGalleryPhotos);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(initialTimeEntries);
  const objectUrlsRef = useRef(new Set<string>());
  const latestFloorPlansRef = useRef<FloorPlan[]>(initialFloorPlans);

  function registerObjectUrl(url?: string) {
    if (url?.startsWith("blob:")) objectUrlsRef.current.add(url);
    return url;
  }

  function revokePlanUrls(plan?: FloorPlan) {
    if (!plan) return;
    [plan.previewUrl, plan.sourceUrl].forEach((url) => {
      if (!url?.startsWith("blob:")) return;
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    });
  }

  useEffect(() => {
    latestFloorPlansRef.current = floorPlans;
  }, [floorPlans]);

  const value = useMemo<DemoDataContextValue>(() => ({
    projects,
    floorPlans,
    tasks,
    galleryPhotos,
    timeEntries,
    addProject(input) {
      const project: Project = {
        id: `proj-${Date.now()}`,
        name: input.name,
        clientId: input.clientId,
        address: input.address,
        status: input.status,
        progress: 0,
        budget: "$0",
        startDate: new Date().toISOString().slice(0, 10),
        managerId: input.managerId,
        assignedUserIds: [input.managerId],
        floorPlanIds: []
      };
      setProjects((current) => [project, ...current]);
      void persistProject(project);
      return project;
    },
    updateProject(projectId, patch) {
      setProjects((current) => current.map((project) => {
        if (project.id !== projectId) return project;
        const updated = { ...project, ...patch };
        void persistProjectPatch(updated);
        return updated;
      }));
    },
    addFloorPlan(projectId, file) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const sourceUrl = registerObjectUrl(URL.createObjectURL(file));
      const plan: FloorPlan = {
        id: `plan-${Date.now()}`,
        projectId,
        name: file.name,
        type: isPdf ? "pdf" : "image",
        previewUrl: isPdf ? undefined : sourceUrl,
        sourceUrl,
        assetId: `asset-plan-${Date.now()}`,
        renderStatus: isPdf ? "rendering" : "ready",
        previewVersion: isPdf ? undefined : PDF_PREVIEW_VERSION,
        uploadedAt: new Date().toISOString().slice(0, 10)
      };
      setFloorPlans((current) => [plan, ...current]);
      setProjects((current) => current.map((project) => {
        if (project.id !== projectId) return project;
        const updated = { ...project, floorPlanIds: [plan.id, ...project.floorPlanIds] };
        void persistProjectPatch(updated);
        return updated;
      }));
      void persistPlan(plan, file, isPdf ? undefined : file);
      if (isPdf) {
        renderPdfFirstPage(file)
          .then(({ previewUrl, previewBlob }) => {
            const updated = { ...plan, previewUrl: registerObjectUrl(previewUrl), renderStatus: "ready" as const, previewVersion: PDF_PREVIEW_VERSION };
            setFloorPlans((current) => current.map((item) => (item.id === plan.id ? updated : item)));
            void updatePlanPreview(updated, previewBlob);
          })
          .catch((error) => {
            if (import.meta.env.DEV) console.error("PDF preview render failed", error);
            const updated = { ...plan, renderStatus: "error" as const, renderError: PDF_COMPRESSION_ERROR };
            setFloorPlans((current) => current.map((item) => (item.id === plan.id ? updated : item)));
            void persistPlan(updated, file);
          });
      }
      return plan;
    },
    updateFloorPlan(planId, patch) {
      setFloorPlans((current) => current.map((plan) => {
        if (plan.id !== planId) return plan;
        const updated = { ...plan, ...patch };
        void persistPlanPatch(updated);
        return updated;
      }));
    },
    deleteFloorPlan(planId) {
      setFloorPlans((current) => {
        const plan = current.find((item) => item.id === planId);
        if (plan) {
          revokePlanUrls(plan);
          void deletePersistedPlan(plan);
        }
        return current.filter((item) => item.id !== planId);
      });
      setProjects((current) => current.map((project) => {
        if (!project.floorPlanIds.includes(planId)) return project;
        const updated = { ...project, floorPlanIds: project.floorPlanIds.filter((id) => id !== planId) };
        void persistProjectPatch(updated);
        return updated;
      }));
    },
    duplicateFloorPlan(planId) {
      const source = floorPlans.find((plan) => plan.id === planId);
      if (!source) return undefined;
      const duplicate: FloorPlan = {
        ...source,
        id: `plan-${Date.now()}`,
        name: `${source.name} copy`,
        assetId: `asset-plan-${Date.now()}`,
        uploadedAt: new Date().toISOString().slice(0, 10)
      };
      setFloorPlans((current) => [duplicate, ...current]);
      setProjects((current) => current.map((project) => {
        if (project.id !== source.projectId) return project;
        const updated = { ...project, floorPlanIds: [duplicate.id, ...project.floorPlanIds] };
        void persistProjectPatch(updated);
        return updated;
      }));
      void duplicatePersistedPlan(source, duplicate);
      return duplicate;
    },
    repairFloorPlanPreview(planId, previewBlob, previewUrl) {
      setFloorPlans((current) => current.map((plan) => {
        if (plan.id !== planId) return plan;
        const updated = { ...plan, previewUrl: registerObjectUrl(previewUrl), renderStatus: "ready" as const, previewVersion: PDF_PREVIEW_VERSION };
        void updatePlanPreview(updated, previewBlob);
        return updated;
      }));
    },
    addTask(input) {
      const task: Task = {
        id: `task-${Date.now()}`,
        projectId: input.projectId,
        floorPlanId: input.floorPlanId,
        title: input.title,
        category: input.category,
        status: input.status,
        assigneeId: input.assigneeId,
        priority: input.priority,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        checklistIds: [],
        x_percent: input.x_percent,
        y_percent: input.y_percent,
        description: "Created from the local frontend demo workspace."
      };
      setTasks((current) => [task, ...current]);
      void persistTask(task, "create");
      return task;
    },
    updateTask(taskId, patch) {
      setTasks((current) => current.map((task) => {
        if (task.id !== taskId) return task;
        const updated = { ...task, ...patch };
        void persistTask(updated, "update");
        return updated;
      }));
    },
    deleteTask(taskId) {
      setTasks((current) => {
        const task = current.find((item) => item.id === taskId);
        if (task) void persistTask(task, "delete");
        return current.filter((item) => item.id !== taskId);
      });
    },
    addGalleryPhoto(projectId, file, title) {
      const photo: GalleryPhoto = {
        id: `photo-${Date.now()}`,
        projectId,
        title: title || file.name,
        category: "Field upload",
        url: URL.createObjectURL(file),
        uploadedBy: "emp-1",
        uploadedAt: new Date().toISOString().slice(0, 10)
      };
      setGalleryPhotos((current) => [photo, ...current]);
      void persistPhoto(photo);
      return photo;
    },
    updateTimeEntry(entryId, patch) {
      setTimeEntries((current) => current.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)));
    }
  }), [floorPlans, galleryPhotos, projects, tasks, timeEntries]);

  useEffect(() => {
    let cancelled = false;
    loadOfflineState().then((state) => {
      if (cancelled) return;
      setProjects(state.projects);
      state.floorPlans.forEach((plan) => {
        registerObjectUrl(plan.previewUrl);
        registerObjectUrl(plan.sourceUrl);
      });
      setFloorPlans(state.floorPlans);
      setTasks(state.tasks);
      setGalleryPhotos(state.galleryPhotos);
      setTimeEntries(state.timeEntries);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      latestFloorPlansRef.current.forEach(revokePlanUrls);
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

export function useDemoData() {
  const context = useContext(DemoDataContext);
  if (!context) throw new Error("useDemoData must be used inside DemoDataProvider");
  return context;
}
