import {
  Bell,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Download,
  Eye,
  Expand,
  FileUp,
  Link2,
  LogOut,
  MapPin,
  Maximize2,
  Menu,
  MessageSquare,
  Minus,
  MousePointer2,
  Paperclip,
  Pencil,
  Plus,
  Ruler,
  Send,
  Search,
  Trash2,
  Type,
  Undo2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Modal } from "@/shared/components/Modal";
import { Avatar } from "@/shared/components/Avatar";
import { useAuth } from "@/core/auth/AuthContext";
import { categories, employeeName, employees, taskStatuses } from "@/infrastructure/offline/mockData";
import type { FloorPlan, Project, Task, TaskChecklistItem, TaskComment, TaskStatus } from "@/shared/types/domain";
import { getPlanAsset, loadTaskComments, persistTaskComment } from "@/core/storage/repositories/offlineRepository";
import { PDF_COMPRESSION_ERROR, PDF_PREVIEW_VERSION, loadPdfDocument, renderPdfFirstPage, renderPdfPageToCanvas } from "@/shared/utils/renderPdfPreview";
import { hapticImpact, hapticSelection, hapticSuccess, ImpactStyle } from "@/infrastructure/capacitor/haptics";

type WorkspaceTool = "select" | "pin" | "link" | "draw" | "copy" | "briefcase" | "text" | "measure" | "photo" | "undo";

interface PendingPin {
  x: number;
  y: number;
}

interface ProjectPlanWorkspaceProps {
  project: Project;
  projectPlans: FloorPlan[];
  projectTasks: Task[];
  initialPlanId?: string;
  addFloorPlan: (projectId: string, file: File) => FloorPlan;
  addTask: (input: {
    projectId: string;
    floorPlanId?: string;
    title: string;
    category: string;
    status: TaskStatus;
    assigneeId: string;
    priority: Task["priority"];
    x_percent?: number;
    y_percent?: number;
  }) => Task;
  updateFloorPlan: (planId: string, patch: Partial<FloorPlan>) => void;
  deleteFloorPlan: (planId: string) => void;
  duplicateFloorPlan: (planId: string) => FloorPlan | undefined;
  repairFloorPlanPreview: (planId: string, previewBlob: Blob, previewUrl: string) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  onOpenSections?: () => void;
}

const defaultChecklist = ["Single Cat 6 Cable Run", "Test & Label Cable", "Install Pipe & Junction Box", "Install Access Point & Label"];
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 10;
const ZOOM_BUTTON_FACTOR = 1.28;
const WHEEL_ZOOM_SENSITIVITY = 0.0022;
const PINCH_ZOOM_RESPONSE = 1.24;
const PLAN_MENU_WIDTH = 220;

const categoryInitials: Record<string, string> = {
  Network: "NE",
  Security: "SE",
  "Access Control": "AC",
  "A/V": "AV",
  Closeout: "CO"
};

const taskStatusMarkerColors: Record<TaskStatus, { fill: string; glow: string }> = {
  Backlog: { fill: "#64748b", glow: "rgba(100,116,139,0.38)" },
  Scheduled: { fill: "#7c3aed", glow: "rgba(124,58,237,0.38)" },
  "In Progress": { fill: "#2563eb", glow: "rgba(37,99,235,0.38)" },
  Blocked: { fill: "#ea580c", glow: "rgba(234,88,12,0.42)" },
  Done: { fill: "#16a34a", glow: "rgba(22,163,74,0.38)" }
};

type ViewportGesture = {
  mode: "pan" | "pinch";
  startDistance?: number;
  startZoom: number;
  startPan: { x: number; y: number };
  center?: { x: number; y: number };
  startPointer?: { x: number; y: number };
};

type WebKitGestureEvent = Event & {
  scale: number;
  clientX?: number;
  clientY?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCategoryInitials(category: string) {
  return categoryInitials[category] ?? category.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

export function ProjectPlanWorkspace({ project, projectPlans, projectTasks, initialPlanId, addFloorPlan, updateFloorPlan, deleteFloorPlan, duplicateFloorPlan, repairFloorPlanPreview, addTask, updateTask, deleteTask, onOpenSections }: ProjectPlanWorkspaceProps) {
  const { logout, user } = useAuth();
  const [activePlanId, setActivePlanId] = useState(initialPlanId ?? projectPlans[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<WorkspaceTool>("select");
  const [fullscreen, setFullscreen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDraft, setTaskDraft] = useState({ title: "", category: categories[0]?.name ?? "Network", status: "Backlog" as TaskStatus, assigneeId: employees[0]?.id ?? "emp-1", priority: "Medium" as Task["priority"] });
  const [checklistItems, setChecklistItems] = useState<Record<string, TaskChecklistItem[]>>({});
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [planMenu, setPlanMenu] = useState<{ x: number; y: number; planId: string } | null>(null);
  const [renamingPlan, setRenamingPlan] = useState<FloorPlan | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [lastCreatedPinTaskId, setLastCreatedPinTaskId] = useState<string | null>(null);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<ViewportGesture | null>(null);
  const safariGestureRef = useRef<ViewportGesture | null>(null);
  const toolRef = useRef(tool);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const frameRef = useRef<number | null>(null);
  const pendingViewRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const didPanRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const repairingPlanIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (initialPlanId) setActivePlanId(initialPlanId);
  }, [initialPlanId]);

  const activePlan = useMemo(() => projectPlans.find((plan) => plan.id === activePlanId) ?? projectPlans[0], [activePlanId, projectPlans]);
  const activeTasks = projectTasks.filter((task) => task.floorPlanId === activePlan?.id);
  const planMenuPlan = planMenu ? projectPlans.find((plan) => plan.id === planMenu.planId) : undefined;

  useEffect(() => {
    if (!projectPlans.length) {
      if (activePlanId) setActivePlanId("");
      return;
    }
    if (!projectPlans.some((plan) => plan.id === activePlanId)) setActivePlanId(projectPlans[0].id);
  }, [activePlanId, projectPlans]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    if (!planMenu) return;
    function close() {
      setPlanMenu(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [planMenu]);

  useEffect(() => {
    if (!activePlan || activePlan.type !== "pdf" || activePlan.renderStatus === "rendering") return;
    if (activePlan.previewUrl && activePlan.previewVersion === PDF_PREVIEW_VERSION) return;
    void repairPdfPreview(activePlan);
  }, [activePlan]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const viewportEl = element;

    function isInteractiveTarget(event: Event) {
      return event.target instanceof Element && Boolean(event.target.closest("button,input,label,select,textarea"));
    }

    const activeListenerOptions: AddEventListenerOptions = { passive: false };
    const pointerListenerOptions: AddEventListenerOptions = { passive: false };

    function getViewportPoint(clientX: number, clientY: number) {
      const rect = viewportEl.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function zoomAroundViewportPoint(nextZoom: number, point: { x: number; y: number }, startZoom = zoomRef.current, startPan = panRef.current) {
      const documentPoint = {
        x: (point.x - startPan.x) / startZoom,
        y: (point.y - startPan.y) / startZoom
      };
      commitView(nextZoom, {
        x: point.x - documentPoint.x * nextZoom,
        y: point.y - documentPoint.y * nextZoom
      });
    }

    function createGestureFromPointers() {
      const pointers = Array.from(activePointersRef.current.values());
      if (pointers.length >= 2) {
        const [first, second] = pointers;
        return {
          mode: "pinch",
          startDistance: Math.hypot(first.x - second.x, first.y - second.y),
          startZoom: zoomRef.current,
          startPan: panRef.current,
          center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
        } satisfies ViewportGesture;
      }
      return {
        mode: "pan",
        startZoom: zoomRef.current,
        startPan: panRef.current,
        startPointer: pointers[0]
      } satisfies ViewportGesture;
    }

    function handlePointerDown(event: PointerEvent) {
      if (isInteractiveTarget(event) || toolRef.current === "pin") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.cancelable) event.preventDefault();
      viewportEl.setPointerCapture(event.pointerId);
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      gestureRef.current = createGestureFromPointers();
      didPanRef.current = false;
      setIsPanning(true);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!activePointersRef.current.has(event.pointerId)) return;
      if (event.cancelable) event.preventDefault();
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const gesture = gestureRef.current;
      const pointers = Array.from(activePointersRef.current.values());
      if (!gesture || !pointers.length) return;

      if (pointers.length >= 2) {
        const [first, second] = pointers;
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
        if (gesture.mode !== "pinch" || !gesture.startDistance || !gesture.center) {
          gestureRef.current = createGestureFromPointers();
          return;
        }
        didPanRef.current = true;
        const nextZoom = clamp(gesture.startZoom * Math.pow(distance / gesture.startDistance, PINCH_ZOOM_RESPONSE), getFitZoom(), MAX_ZOOM);
        const startCenter = getViewportPoint(gesture.center.x, gesture.center.y);
        const currentCenter = getViewportPoint(center.x, center.y);
        const documentPoint = {
          x: (startCenter.x - gesture.startPan.x) / gesture.startZoom,
          y: (startCenter.y - gesture.startPan.y) / gesture.startZoom
        };
        commitView(nextZoom, {
          x: currentCenter.x - documentPoint.x * nextZoom,
          y: currentCenter.y - documentPoint.y * nextZoom
        });
        return;
      }

      if (gesture.mode !== "pan" || !gesture.startPointer) return;
      if (Math.abs(event.clientX - gesture.startPointer.x) > 3 || Math.abs(event.clientY - gesture.startPointer.y) > 3) didPanRef.current = true;
      commitView(gesture.startZoom, {
        x: gesture.startPan.x + event.clientX - gesture.startPointer.x,
        y: gesture.startPan.y + event.clientY - gesture.startPointer.y
      });
    }

    function handlePointerUp(event: PointerEvent) {
      activePointersRef.current.delete(event.pointerId);
      if (viewportEl.hasPointerCapture(event.pointerId)) viewportEl.releasePointerCapture(event.pointerId);
      if (activePointersRef.current.size === 0) {
        if (event.pointerType === "touch" && !didPanRef.current) {
          const now = window.performance.now();
          const previous = lastTapRef.current;
          if (previous && now - previous.time < 300 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 28) {
            const point = getViewportPoint(event.clientX, event.clientY);
            const targetZoom = zoomRef.current < getFitZoom() * 2.1 ? Math.min(MAX_ZOOM, getFitZoom() * 3.2) : getFitZoom();
            zoomAroundViewportPoint(targetZoom, point);
            lastTapRef.current = null;
          } else {
            lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
          }
        }
        gestureRef.current = null;
        setIsPanning(false);
        return;
      }
      gestureRef.current = createGestureFromPointers();
    }

    function handleWheel(event: WheelEvent) {
      if (isInteractiveTarget(event)) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      const isPinchWheel = event.ctrlKey || event.metaKey;
      const isLikelyMouseWheel = event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || (absX === 0 && absY >= 80 && Number.isInteger(event.deltaY));
      const isLikelyTrackpadPan = !isPinchWheel && !isLikelyMouseWheel;

      if (isLikelyTrackpadPan) {
        commitView(zoomRef.current, {
          x: panRef.current.x - event.deltaX,
          y: panRef.current.y - event.deltaY
        });
        return;
      }

      const normalizedDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
      const multiplier = clamp(Math.exp(-normalizedDelta * WHEEL_ZOOM_SENSITIVITY), 0.74, 1.34);
      zoomByFactor(multiplier, event.clientX, event.clientY);
    }

    function getGesturePoint(event: WebKitGestureEvent) {
      if (typeof event.clientX === "number" && typeof event.clientY === "number") {
        return getViewportPoint(event.clientX, event.clientY);
      }
      return { x: viewportEl.clientWidth / 2, y: viewportEl.clientHeight / 2 };
    }

    function handleGestureStart(event: Event) {
      const gestureEvent = event as WebKitGestureEvent;
      if (event.cancelable) event.preventDefault();
      safariGestureRef.current = {
        mode: "pinch",
        startDistance: gestureEvent.scale || 1,
        startZoom: zoomRef.current,
        startPan: panRef.current,
        center: getGesturePoint(gestureEvent)
      };
    }

    function handleGestureChange(event: Event) {
      const gesture = safariGestureRef.current;
      if (!gesture?.center) return;
      const gestureEvent = event as WebKitGestureEvent;
      if (event.cancelable) event.preventDefault();
      const baseScale = gesture.startDistance || 1;
      const nextZoom = clamp(gesture.startZoom * Math.pow((gestureEvent.scale || 1) / baseScale, PINCH_ZOOM_RESPONSE), getFitZoom(), MAX_ZOOM);
      zoomAroundViewportPoint(nextZoom, gesture.center, gesture.startZoom, gesture.startPan);
    }

    function handleGestureEnd(event: Event) {
      if (event.cancelable) event.preventDefault();
      safariGestureRef.current = null;
    }

    viewportEl.addEventListener("pointerdown", handlePointerDown, pointerListenerOptions);
    viewportEl.addEventListener("pointermove", handlePointerMove, pointerListenerOptions);
    viewportEl.addEventListener("pointerup", handlePointerUp, pointerListenerOptions);
    viewportEl.addEventListener("pointercancel", handlePointerUp, pointerListenerOptions);
    viewportEl.addEventListener("wheel", handleWheel, activeListenerOptions);
    viewportEl.addEventListener("gesturestart", handleGestureStart, activeListenerOptions);
    viewportEl.addEventListener("gesturechange", handleGestureChange, activeListenerOptions);
    viewportEl.addEventListener("gestureend", handleGestureEnd, activeListenerOptions);
    return () => {
      viewportEl.removeEventListener("pointerdown", handlePointerDown, pointerListenerOptions);
      viewportEl.removeEventListener("pointermove", handlePointerMove, pointerListenerOptions);
      viewportEl.removeEventListener("pointerup", handlePointerUp, pointerListenerOptions);
      viewportEl.removeEventListener("pointercancel", handlePointerUp, pointerListenerOptions);
      viewportEl.removeEventListener("wheel", handleWheel, activeListenerOptions);
      viewportEl.removeEventListener("gesturestart", handleGestureStart, activeListenerOptions);
      viewportEl.removeEventListener("gesturechange", handleGestureChange, activeListenerOptions);
      viewportEl.removeEventListener("gestureend", handleGestureEnd, activeListenerOptions);
    };
  }, []);

  useEffect(() => {
    if (!activePlan) return;
    const frame = window.requestAnimationFrame(() => fitScreen());
    return () => window.cancelAnimationFrame(frame);
  }, [activePlan?.id, fullscreen]);

  useEffect(() => {
    function handleResize() {
      commitView(zoomRef.current, panRef.current);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function createDefaultChecklist(taskId: string) {
    setChecklistItems((current) => ({
      ...current,
      [taskId]: current[taskId] ?? defaultChecklist.map((label, index) => ({ id: `${taskId}-check-${index}`, taskId, label, completed: index === 0 }))
    }));
  }

  function selectTask(task: Task) {
    createDefaultChecklist(task.id);
    setSelectedTask(task);
    hapticSelection();
    void loadTaskComments(task.id).then((storedComments) => {
      setComments((current) => ({ ...current, [task.id]: storedComments }));
    });
  }

  function updateSelectedTask(patch: Partial<Task>) {
    if (!selectedTask) return;
    updateTask(selectedTask.id, patch);
    setSelectedTask((current) => current ? { ...current, ...patch } : current);
  }

  function getFitZoom() {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || !content.offsetWidth || !content.offsetHeight) return MIN_ZOOM;
    const horizontalPadding = content.offsetLeft * 2;
    const verticalPadding = content.offsetTop + 12;
    const fitWidth = Math.max(160, viewport.clientWidth - horizontalPadding) / content.offsetWidth;
    const fitHeight = Math.max(160, viewport.clientHeight - verticalPadding) / content.offsetHeight;
    return clamp(Math.min(fitWidth, fitHeight), MIN_ZOOM, 1);
  }

  function clampPanForZoom(nextZoom: number, nextPan: { x: number; y: number }) {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return nextPan;
    const scaledWidth = content.offsetWidth * nextZoom;
    const scaledHeight = content.offsetHeight * nextZoom;
    const minX = viewport.clientWidth - content.offsetLeft - scaledWidth - 12;
    const maxX = -content.offsetLeft + 12;
    const minY = viewport.clientHeight - content.offsetTop - scaledHeight - 12;
    const maxY = -content.offsetTop + 12;

    return {
      x: scaledWidth <= viewport.clientWidth ? (viewport.clientWidth - scaledWidth) / 2 - content.offsetLeft : clamp(nextPan.x, minX, maxX),
      y: scaledHeight <= viewport.clientHeight ? (viewport.clientHeight - scaledHeight) / 2 - content.offsetTop : clamp(nextPan.y, minY, maxY)
    };
  }

  function commitView(nextZoom: number, nextPan: { x: number; y: number }) {
    const minZoom = getFitZoom();
    const clampedZoom = clamp(Number(nextZoom.toFixed(4)), minZoom, MAX_ZOOM);
    const view = { zoom: clampedZoom, pan: clampPanForZoom(clampedZoom, nextPan) };
    pendingViewRef.current = view;
    zoomRef.current = view.zoom;
    panRef.current = view.pan;
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      const pending = pendingViewRef.current;
      frameRef.current = null;
      if (!pending) return;
      applyContentTransform(pending);
      setZoom(pending.zoom);
      setPan(pending.pan);
    });
  }

  function applyContentTransform(view: { zoom: number; pan: { x: number; y: number } }) {
    if (!contentRef.current) return;
    contentRef.current.style.transform = `translate3d(${view.pan.x}px, ${view.pan.y}px, 0) scale(${view.zoom})`;
  }

  function zoomByFactor(factor: number, anchorClientX?: number, anchorClientY?: number) {
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const nextZoom = clamp(Number((currentZoom * factor).toFixed(4)), getFitZoom(), MAX_ZOOM);
    if (!viewportRef.current || anchorClientX === undefined || anchorClientY === undefined) {
      commitView(nextZoom, currentPan);
      return;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    const anchor = { x: anchorClientX - rect.left, y: anchorClientY - rect.top };
    const contentPoint = {
      x: (anchor.x - currentPan.x) / currentZoom,
      y: (anchor.y - currentPan.y) / currentZoom
    };
    commitView(nextZoom, {
      x: anchor.x - contentPoint.x * nextZoom,
      y: anchor.y - contentPoint.y * nextZoom
    });
  }

  function fitScreen() {
    const fitZoom = getFitZoom();
    commitView(fitZoom, { x: 0, y: 0 });
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    if (tool !== "pin" || !(event.target instanceof Element) || event.target.closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    setPendingPin({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  }

  function saveTaskPin() {
    if (!activePlan || !pendingPin || !taskDraft.title.trim()) return;
    const task = addTask({
      projectId: project.id,
      floorPlanId: activePlan.id,
      title: taskDraft.title.trim(),
      category: taskDraft.category,
      status: taskDraft.status,
      assigneeId: taskDraft.assigneeId,
      priority: taskDraft.priority,
      x_percent: pendingPin.x,
      y_percent: pendingPin.y
    });
    createDefaultChecklist(task.id);
    setPendingPin(null);
    setTool("select");
    setTaskDraft((current) => ({ ...current, title: "" }));
    setSelectedTask(task);
    setLastCreatedPinTaskId(task.id);
    hapticSuccess();
  }

  function handlePinMove(taskId: string, x_percent: number, y_percent: number) {
    updateTask(taskId, { x_percent, y_percent });
    setSelectedTask((current) => current?.id === taskId ? { ...current, x_percent, y_percent } : current);
  }

  function addChecklistItem() {
    if (!selectedTask || !newChecklistItem.trim()) return;
    const item: TaskChecklistItem = { id: `${selectedTask.id}-check-${Date.now()}`, taskId: selectedTask.id, label: newChecklistItem.trim(), completed: false };
    setChecklistItems((current) => ({ ...current, [selectedTask.id]: [...(current[selectedTask.id] ?? []), item] }));
    setNewChecklistItem("");
  }

  function addComment(imageFile?: File) {
    if (!selectedTask || (!commentDraft.trim() && !imageFile)) return;
    const comment: TaskComment = {
      id: `${selectedTask.id}-comment-${Date.now()}`,
      taskId: selectedTask.id,
      author: "Jordan Lee",
      message: commentDraft.trim(),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      createdAt: "Just now"
    };
    setComments((current) => ({ ...current, [selectedTask.id]: [...(current[selectedTask.id] ?? []), comment] }));
    void persistTaskComment(comment, imageFile);
    setCommentDraft("");
  }

  function openPlanMenu(event: React.MouseEvent, planId: string) {
    event.preventDefault();
    event.stopPropagation();
    const x = Math.min(event.clientX, window.innerWidth - PLAN_MENU_WIDTH - 12);
    const y = Math.min(event.clientY, window.innerHeight - 220);
    setPlanMenu({ x: Math.max(12, x), y: Math.max(12, y), planId });
  }

  async function repairPdfPreview(plan: FloorPlan) {
    if (repairingPlanIdsRef.current.has(plan.id)) return;
    repairingPlanIdsRef.current.add(plan.id);
    updateFloorPlan(plan.id, { renderStatus: "rendering" });
    try {
      const asset = await getPlanAsset(plan.id);
      if (asset?.preview_blob && plan.previewVersion === PDF_PREVIEW_VERSION) {
        updateFloorPlan(plan.id, { previewUrl: URL.createObjectURL(asset.preview_blob), renderStatus: "ready", previewVersion: PDF_PREVIEW_VERSION });
        return;
      }
      if (!asset?.original_blob) throw new Error(`Missing original PDF for ${plan.name}`);
      const { previewBlob, previewUrl } = await renderPdfFirstPage(asset.original_blob);
      repairFloorPlanPreview(plan.id, previewBlob, previewUrl);
    } catch (error) {
      if (import.meta.env.DEV) console.error("PDF preview repair failed", error);
      updateFloorPlan(plan.id, { renderStatus: "error", renderError: PDF_COMPRESSION_ERROR });
    } finally {
      repairingPlanIdsRef.current.delete(plan.id);
    }
  }

  function beginRenamePlan(plan: FloorPlan) {
    setPlanMenu(null);
    setRenamingPlan(plan);
    setRenameDraft(plan.name);
  }

  function submitRenamePlan() {
    if (!renamingPlan || !renameDraft.trim()) return;
    updateFloorPlan(renamingPlan.id, { name: renameDraft.trim() });
    setRenamingPlan(null);
    setRenameDraft("");
  }

  function handleDuplicatePlan(plan: FloorPlan) {
    setPlanMenu(null);
    const duplicate = duplicateFloorPlan(plan.id);
    if (duplicate) setActivePlanId(duplicate.id);
  }

  async function handleExportPlan(plan: FloorPlan) {
    setPlanMenu(null);
    const asset = await getPlanAsset(plan.id);
    const blob = asset?.original_blob ?? asset?.preview_blob;
    const href = blob ? URL.createObjectURL(blob) : plan.sourceUrl ?? plan.previewUrl;
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.download = asset?.name ?? plan.name;
    link.click();
    if (blob) URL.revokeObjectURL(href);
  }

  function handleDeletePlan(plan: FloorPlan) {
    setPlanMenu(null);
    if (!window.confirm(`Delete ${plan.name}?`)) return;
    const nextPlan = projectPlans.find((item) => item.id !== plan.id);
    deleteFloorPlan(plan.id);
    setActivePlanId(nextPlan?.id ?? "");
  }

  function handleUndo() {
    if (!lastCreatedPinTaskId) return;
    const task = projectTasks.find((item) => item.id === lastCreatedPinTaskId);
    if (!task) {
      setLastCreatedPinTaskId(null);
      return;
    }
    deleteTask(task.id);
    if (selectedTask?.id === task.id) setSelectedTask(null);
    setLastCreatedPinTaskId(null);
    setTool("select");
  }

  const shellClass = fullscreen ? "fixed inset-0 z-50 overflow-hidden bg-[#eef2f7]" : "h-full min-h-0 overflow-hidden bg-[#eef2f7]";

  return (
    <section className={shellClass}>
      <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex h-full min-h-0 min-w-0 flex-col">
          <PlanViewportChrome
            projectName={project.name}
            planName={activePlan?.name ?? "No plan selected"}
            onOpenSections={onOpenSections}
            userName={user?.name ?? "ClearPlan User"}
            onLogout={() => void logout()}
          />
          <ToolPalette
            activeTool={tool}
            canUndo={Boolean(lastCreatedPinTaskId)}
            mobileExpanded={mobileToolsOpen}
            onSelectTool={(nextTool) => {
              hapticSelection();
              setTool(nextTool);
            }}
            onToggleMobileExpanded={() => {
              hapticImpact(ImpactStyle.Light);
              setMobileToolsOpen((value) => !value);
            }}
            onZoomIn={() => zoomByFactor(ZOOM_BUTTON_FACTOR)}
            onZoomOut={() => zoomByFactor(1 / ZOOM_BUTTON_FACTOR)}
            onFit={fitScreen}
            onFullscreen={() => setFullscreen((value) => !value)}
            onUndo={handleUndo}
          />
          <RightMapControls />

          <div
            data-plan-viewport
            ref={viewportRef}
            className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden bg-[#eef2f7] p-2.5 pb-2.5 pt-[calc(4.65rem+var(--safe-top))] sm:p-5 sm:pt-[calc(5.25rem+var(--safe-top))] ${isPanning ? "cursor-grabbing" : tool === "pin" ? "cursor-crosshair" : "cursor-grab"}`}
            style={{
              overscrollBehavior: "contain",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none"
            } as CSSProperties}
          >
            <div ref={contentRef} className={`relative h-full w-full ${activePlan ? "min-h-[520px] min-w-[760px]" : "min-w-full"}`} style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, transformOrigin: "0 0", willChange: "transform" }}>
              {activePlan ? (
                <>
                  <PlanCanvas
                  refEl={canvasRef}
                  plan={activePlan}
                  zoom={zoom}
                  addMode={tool === "pin"}
                  onCanvasClick={handleCanvasClick}
                  onContextMenu={(event) => openPlanMenu(event, activePlan.id)}
                  onPreviewError={() => activePlan.type === "pdf" ? void repairPdfPreview(activePlan) : updateFloorPlan(activePlan.id, { renderStatus: "error", renderError: "Image preview could not be loaded." })}
                />
                  <PlanMarkerOverlay
                    tasks={activeTasks}
                    onTaskSelect={selectTask}
                    onPinMove={handlePinMove}
                    canvasRef={canvasRef}
                  />
                </>
              ) : (
                <div className="grid h-full min-h-full place-items-center rounded-2xl border border-dashed border-slate-300 bg-white">
                  <p className="text-sm font-semibold text-slate-500">Upload a plan to begin.</p>
                </div>
              )}
            </div>
          </div>

          <BottomPlanStrip plans={projectPlans} activePlan={activePlan} onSelectPlan={setActivePlanId} onRenamePlan={beginRenamePlan} onPlanContextMenu={openPlanMenu} onUpload={(file) => {
            const plan = addFloorPlan(project.id, file);
            setActivePlanId(plan.id);
          }} />
        </div>

        <RightTasksPanel tasks={activeTasks} onSelectTask={selectTask} onNewTask={() => setTool("pin")} />
      </div>

      <Modal title="Create task pin" open={Boolean(pendingPin)} onClose={() => setPendingPin(null)}>
        <div className="grid gap-4">
          <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Pin position: {pendingPin?.x}% x, {pendingPin?.y}% y</p>
          <input aria-label="Task title" value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder="#1 IT room" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          <div className="grid gap-3 md:grid-cols-2">
            <Select label="Status" value={taskDraft.status} onChange={(value) => setTaskDraft({ ...taskDraft, status: value as TaskStatus })} options={taskStatuses} />
            <Select label="Category" value={taskDraft.category} onChange={(value) => setTaskDraft({ ...taskDraft, category: value })} options={categories.map((category) => category.name)} />
            <Select label="Assignee" value={taskDraft.assigneeId} onChange={(value) => setTaskDraft({ ...taskDraft, assigneeId: value })} options={employees.map((employee) => employee.id)} labels={Object.fromEntries(employees.map((employee) => [employee.id, employee.name]))} />
            <Select label="Priority" value={taskDraft.priority} onChange={(value) => setTaskDraft({ ...taskDraft, priority: value as Task["priority"] })} options={["Low", "Medium", "High"]} />
          </div>
          <button onClick={saveTaskPin} className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">Save task pin</button>
        </div>
      </Modal>

      {selectedTask && (
        <TaskDetailPopup
          task={selectedTask}
          checklist={checklistItems[selectedTask.id] ?? []}
          comments={comments[selectedTask.id] ?? []}
          commentDraft={commentDraft}
          newChecklistItem={newChecklistItem}
          onClose={() => setSelectedTask(null)}
          onTaskChange={updateSelectedTask}
          onDelete={() => {
            deleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
          onToggleChecklist={(itemId) => setChecklistItems((current) => ({ ...current, [selectedTask.id]: (current[selectedTask.id] ?? []).map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item) }))}
          onDeleteChecklist={(itemId) => setChecklistItems((current) => ({ ...current, [selectedTask.id]: (current[selectedTask.id] ?? []).filter((item) => item.id !== itemId) }))}
          onChecklistDraft={setNewChecklistItem}
          onAddChecklistItem={addChecklistItem}
          onCommentDraft={setCommentDraft}
          onAddComment={addComment}
        />
      )}

      {planMenu && planMenuPlan && (
        <PlanContextMenu
          x={planMenu.x}
          y={planMenu.y}
          plan={planMenuPlan}
          onRename={beginRenamePlan}
          onDuplicate={handleDuplicatePlan}
          onExport={(plan) => void handleExportPlan(plan)}
          onDelete={handleDeletePlan}
        />
      )}

      <Modal title="Rename floor plan" open={Boolean(renamingPlan)} onClose={() => setRenamingPlan(null)}>
        <div className="grid gap-4">
          <input
            autoFocus
            aria-label="Floor plan name"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRenamePlan();
            }}
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRenamingPlan(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={submitRenamePlan} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function PlanViewportChrome({
  projectName,
  planName,
  onOpenSections,
  userName,
  onLogout
}: {
  projectName: string;
  planName: string;
  onOpenSections?: () => void;
  userName: string;
  onLogout: () => void;
}) {
  return (
    <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/86 px-2.5 py-1.5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/78 sm:px-4">
      <div className="flex min-h-12 items-center gap-2">
        {onOpenSections && (
          <button
            type="button"
            onClick={onOpenSections}
            className="compact-control pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/92 text-slate-600 shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 lg:hidden"
            aria-label="Open project sections"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="pointer-events-auto min-w-0 flex-1 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{projectName}</p>
          <h1 className="truncate text-[13px] font-bold leading-4 text-slate-900 dark:text-white sm:text-sm">{planName}</h1>
        </div>
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5">
          <button type="button" aria-label="Notifications" className="compact-control grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Bell size={16} aria-hidden="true" />
          </button>
          <Avatar name={userName} className="h-10 w-10 text-xs" />
          <button type="button" onClick={onLogout} aria-label="Log out" className="compact-control grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolPalette({ activeTool, canUndo, mobileExpanded, onSelectTool, onToggleMobileExpanded, onZoomIn, onZoomOut, onFit, onFullscreen, onUndo }: { activeTool: WorkspaceTool; canUndo: boolean; mobileExpanded: boolean; onSelectTool: (tool: WorkspaceTool) => void; onToggleMobileExpanded: () => void; onZoomIn: () => void; onZoomOut: () => void; onFit: () => void; onFullscreen: () => void; onUndo: () => void }) {
  const tools: { id: WorkspaceTool; label: string; icon: typeof MapPin; enabled?: boolean }[] = [
    { id: "select", label: "Select cursor", icon: MousePointer2, enabled: true },
    { id: "pin", label: "Add task pin", icon: MapPin, enabled: true },
    { id: "link", label: "Link tool", icon: Link2 },
    { id: "draw", label: "Draw markup tool", icon: Pencil },
    { id: "copy", label: "Duplicate/copy tool", icon: Copy },
    { id: "briefcase", label: "Work item/toolbox", icon: BriefcaseBusiness },
    { id: "text", label: "Text tool", icon: Type },
    { id: "measure", label: "Measure/ruler", icon: Ruler },
    { id: "photo", label: "Camera/photo", icon: Camera }
  ];
  const activeToolItem = tools.find((tool) => tool.id === activeTool) ?? tools[0];

  return (
    <>
      <div className="absolute left-4 top-28 z-30 hidden flex-col gap-3 sm:flex">
        <div className="rounded-2xl bg-slate-900 p-1.5 shadow-2xl">
          <PaletteButton label="Fullscreen" icon={Expand} onClick={onFullscreen} />
          <PaletteButton label="Fit view" icon={Maximize2} onClick={onFit} />
          <PaletteButton label="Zoom in" icon={Plus} onClick={onZoomIn} />
          <PaletteButton label="Zoom out" icon={Minus} onClick={onZoomOut} />
        </div>
        <div className="rounded-2xl bg-slate-900 p-1.5 shadow-2xl">
          {tools.map((tool) => <PaletteButton key={tool.id} label={tool.label} icon={tool.icon} active={activeTool === tool.id} disabled={!tool.enabled} disabledTitle={`${tool.label} - Coming soon`} onClick={() => tool.enabled ? onSelectTool(tool.id) : undefined} />)}
          <PaletteButton label="Undo last new pin" icon={Undo2} disabled={!canUndo} disabledTitle="Nothing to undo" onClick={onUndo} />
        </div>
      </div>

      <div data-mobile-plan-tools className="absolute bottom-[calc(5.15rem+var(--safe-bottom))] left-2 top-[calc(4.8rem+var(--safe-top))] z-30 flex flex-col justify-end gap-2 overflow-y-auto overscroll-contain py-1 scrollbar-soft sm:hidden">
        {mobileExpanded && (
          <div className="rounded-2xl bg-slate-900 p-1.5 shadow-2xl">
            {tools.map((tool) => <PaletteButton key={tool.id} label={tool.label} icon={tool.icon} active={activeTool === tool.id} disabled={!tool.enabled} disabledTitle={`${tool.label} - Coming soon`} onClick={() => tool.enabled ? onSelectTool(tool.id) : undefined} />)}
            <PaletteButton label="Fullscreen" icon={Expand} onClick={onFullscreen} />
            <PaletteButton label="Undo last new pin" icon={Undo2} disabled={!canUndo} disabledTitle="Nothing to undo" onClick={onUndo} />
          </div>
        )}
        <div className="rounded-2xl bg-slate-900 p-1.5 shadow-2xl">
          <PaletteButton label={mobileExpanded ? "Collapse tools" : "Expand tools"} icon={mobileExpanded ? X : ChevronRight} onClick={onToggleMobileExpanded} />
          <PaletteButton label={activeToolItem.label} icon={activeToolItem.icon} active onClick={() => activeToolItem.enabled ? onSelectTool(activeToolItem.id) : undefined} />
          <PaletteButton label="Zoom in" icon={Plus} onClick={onZoomIn} />
          <PaletteButton label="Zoom out" icon={Minus} onClick={onZoomOut} />
          <PaletteButton label="Fit view" icon={Maximize2} onClick={onFit} />
        </div>
      </div>
    </>
  );
}

function PaletteButton({ icon: Icon, label, onClick, active = false, disabled = false, disabledTitle }: { icon: typeof MapPin; label: string; onClick: () => void; active?: boolean; disabled?: boolean; disabledTitle?: string }) {
  return (
    <button
      type="button"
      title={disabled ? disabledTitle ?? label : label}
      disabled={disabled}
      onClick={() => {
        if (!disabled) hapticImpact(ImpactStyle.Light);
        onClick();
      }}
      className={`compact-control grid h-9 w-9 place-items-center rounded-xl text-white transition active:scale-95 ${active ? "bg-blue-600" : "hover:bg-white/12"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
    >
      <Icon size={18} />
    </button>
  );
}

function RightMapControls() {
  return (
    <div data-map-controls className="absolute right-3 top-[calc(5.75rem+var(--safe-top))] z-30 flex flex-col gap-2 sm:right-4 sm:top-[calc(6.5rem+var(--safe-top))]">
      <MapFloatButton label="Search/zoom-to - Coming soon" icon={Search} />
      <MapFloatButton label="Visibility/layers - Coming soon" icon={Eye} />
    </div>
  );
}

function MapFloatButton({ icon: Icon, label }: { icon: typeof Search; label: string }) {
  return (
    <button type="button" title={label} disabled className="compact-control grid h-10 w-10 cursor-not-allowed place-items-center rounded-xl bg-slate-900 text-white opacity-70 shadow-2xl">
      <Icon size={18} />
    </button>
  );
}

function PlanCanvas({ refEl, plan, zoom, addMode, onCanvasClick, onContextMenu, onPreviewError }: { refEl: React.RefObject<HTMLDivElement | null>; plan: FloorPlan; zoom: number; addMode: boolean; onCanvasClick: (event: React.MouseEvent<HTMLDivElement>) => void; onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void; onPreviewError: () => void }) {
  const previewUrl = plan.previewUrl ?? (plan.type === "image" ? plan.sourceUrl : undefined);

  return (
    <div ref={refEl} data-plan-canvas onClick={onCanvasClick} onContextMenu={onContextMenu} className={`relative h-full min-h-full w-full overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.1)] ${addMode ? "cursor-crosshair ring-4 ring-blue-100" : "cursor-grab"}`}>
      {plan.type === "pdf" ? (
        <PdfPlanCanvas plan={plan} zoom={zoom} onError={onPreviewError} />
      ) : plan.renderStatus === "error" ? (
        <PlanPreviewStatus title="Preview failed" message={plan.renderError ?? "This plan preview could not be rendered."} tone="error" />
      ) : previewUrl ? (
        <img
          src={previewUrl}
          alt={plan.name}
          draggable={false}
          onError={onPreviewError}
          onDragStart={(event) => event.preventDefault()}
          className="absolute inset-0 h-full w-full select-none object-contain"
          style={{ WebkitUserDrag: "none", userSelect: "none", touchAction: "none" } as CSSProperties}
        />
      ) : (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" role="img" aria-label="Floor plan mock">
          <rect width="1600" height="1000" fill="#f8fafc" />
          <path d="M120 120H1480V880H120Z" fill="#fff" stroke="#334155" strokeWidth="10" />
          <path d="M120 300H1480M120 560H1480M430 120V880M760 120V560M1080 300V880" stroke="#64748b" strokeWidth="8" />
          <path d="M455 145H730V280H455ZM785 145H1050V280H785ZM1110 330H1450V540H1110ZM455 590H1045V850H455Z" fill="#eff6ff" stroke="#94a3b8" strokeWidth="5" />
          <text x="510" y="225" fill="#475569" fontSize="38" fontFamily="Inter">IT Room</text>
          <text x="815" y="225" fill="#475569" fontSize="38" fontFamily="Inter">Firewall</text>
          <text x="1150" y="430" fill="#475569" fontSize="38" fontFamily="Inter">Nurse Station</text>
        </svg>
      )}
      {addMode && <div className="absolute bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg">Click anywhere on the plan to create a task pin</div>}
    </div>
  );
}

function PdfPlanCanvas({ plan, zoom, onError }: { plan: FloorPlan; zoom: number; onError: () => void }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<{ getPage: (pageNumber: number) => Promise<unknown>; destroy?: () => Promise<void> } | null>(null);
  const onErrorRef = useRef(onError);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(plan.renderStatus === "error" ? "error" : "loading");
  const [message, setMessage] = useState(plan.renderError ?? plan.name);
  const [sizeVersion, setSizeVersion] = useState(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => setSizeVersion((version) => version + 1));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage(plan.name);
    pdfRef.current?.destroy?.().catch(() => undefined);
    pdfRef.current = null;

    getPlanAsset(plan.id)
      .then((asset) => {
        if (asset?.original_blob) return asset.original_blob;
        if (plan.sourceUrl) return fetch(plan.sourceUrl).then((response) => {
          if (!response.ok) throw new Error("Unable to load PDF source file.");
          return response.blob();
        });
        throw new Error("Missing PDF source file.");
      })
      .then((blob) => {
        return loadPdfDocument(blob);
      })
      .then((pdf) => {
        if (cancelled) {
          destroyPdfDocument(pdf);
          return;
        }
        pdfRef.current = pdf;
        setSizeVersion((version) => version + 1);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : PDF_COMPRESSION_ERROR);
        if (!(error instanceof Error) || !error.message.includes("Missing PDF source file")) onErrorRef.current();
      });

    return () => {
      cancelled = true;
      pdfRef.current?.destroy?.().catch(() => undefined);
      pdfRef.current = null;
    };
  }, [plan.id, plan.name]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !wrapper || !canvas) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;

    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    setStatus("loading");
    setMessage(plan.name);

    pdf.getPage(1)
      .then((page) => {
        if (cancelled) return undefined;
        return renderPdfPageToCanvas({
          page: page as Parameters<typeof renderPdfPageToCanvas>[0]["page"],
          canvas,
          containerWidth: rect.width,
          containerHeight: rect.height,
          zoom
        });
      })
      .then((render) => {
        if (!render || cancelled) return;
        renderTask = render.task;
        return render.promise;
      })
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((error) => {
        if (cancelled || error?.name === "RenderingCancelledException") return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : PDF_COMPRESSION_ERROR);
        onErrorRef.current();
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [plan.name, sizeVersion, zoom]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 grid place-items-center bg-white">
      <canvas ref={canvasRef} className={`max-h-full max-w-full select-none transition-opacity duration-150 ${status === "ready" ? "opacity-100" : "opacity-0"}`} aria-label={plan.name} />
      {status !== "ready" && (
        <PlanPreviewStatus title={status === "error" ? "PDF render failed" : "Rendering PDF preview"} message={message} tone={status === "error" ? "error" : "loading"} />
      )}
    </div>
  );
}

function destroyPdfDocument(pdf: unknown) {
  const destroy = typeof pdf === "object" && pdf && "destroy" in pdf ? (pdf as { destroy?: () => Promise<void> | void }).destroy : undefined;
  if (destroy) void destroy.call(pdf);
}

function PlanPreviewStatus({ title, message, tone = "loading" }: { title: string; message: string; tone?: "loading" | "error" }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(90deg,#eef2f7_1px,transparent_1px),linear-gradient(#eef2f7_1px,transparent_1px)] bg-[size:42px_42px]">
      <div className="rounded-3xl bg-white/90 p-6 text-center shadow-soft">
        <p className={`text-sm font-semibold uppercase ${tone === "error" ? "text-red-500" : "text-slate-400"}`}>{title}</p>
        <p className={`mt-2 max-w-sm text-sm font-semibold ${tone === "error" ? "text-red-600" : "text-slate-700"}`}>{message}</p>
      </div>
    </div>
  );
}

function PlanMarkerOverlay({ tasks, onTaskSelect, onPinMove, canvasRef }: { tasks: Task[]; onTaskSelect: (task: Task) => void; onPinMove: (taskId: string, xPercent: number, yPercent: number) => void; canvasRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {tasks.map((task, index) => {
        if (typeof task.x_percent !== "number" || typeof task.y_percent !== "number") return null;
        return (
          <PlanTaskPin
            key={task.id}
            task={task}
            index={index + 1}
            canvasRef={canvasRef}
            onSelect={onTaskSelect}
            onMove={onPinMove}
          />
        );
      })}
    </div>
  );
}

function PlanTaskPin({ task, index, canvasRef, onSelect, onMove }: { task: Task; index: number; canvasRef: React.RefObject<HTMLDivElement | null>; onSelect: (task: Task) => void; onMove: (taskId: string, xPercent: number, yPercent: number) => void }) {
  if (typeof task.x_percent !== "number" || typeof task.y_percent !== "number") return null;
  const visualMarkerSize = clamp(22, 18, 26);
  const markerWidth = visualMarkerSize * 1.5;
  const markerHeight = visualMarkerSize;
  const markerColor = taskStatusMarkerColors[task.status] ?? taskStatusMarkerColors.Backlog;
  const initials = getCategoryInitials(task.category);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    function move(clientX: number, clientY: number) {
      const rect = canvasEl.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      onMove(task.id, Number(x.toFixed(2)), Number(y.toFixed(2)));
    }

    function onPointerMove(moveEvent: PointerEvent) {
      move(moveEvent.clientX, moveEvent.clientY);
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  return (
    <div className="group pointer-events-auto absolute touch-none will-change-transform" style={{ left: `${task.x_percent}%`, top: `${task.y_percent}%`, transform: "translate(-50%, -50%)", transformOrigin: "center" }}>
      <button type="button" aria-label={`Open task ${task.title}`} onPointerDown={handlePointerDown} onClick={() => onSelect(task)} className="grid place-items-center transition-transform hover:scale-110" style={{ width: markerWidth, height: markerHeight, filter: `drop-shadow(0 8px 12px rgba(15,23,42,0.28)) drop-shadow(0 0 7px ${markerColor.glow})` }}>
        <svg className="h-full w-full overflow-visible" viewBox="0 0 58 40" role="img" aria-hidden="true">
          <path d="M27 18h4v20h-4z" fill="#0f172a" opacity="0.58" />
          <path d="M22 37h14" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" opacity="0.58" />
          <path d="M5 5h34l11 9-11 9H5l-6-9z" fill={markerColor.fill} stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
          <text x="25" y="17.4" textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="13" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.5">{initials}</text>
        </svg>
      </button>
      <span className="pointer-events-none absolute left-5 top-3 w-60 rounded-2xl bg-slate-950 px-3 py-2 text-left text-xs text-white opacity-0 shadow-2xl transition-opacity delay-150 duration-150 group-hover:opacity-100" style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}>
        <strong className="block text-sm">#{index} {task.title}</strong>
        <span className="mt-1 block text-slate-300">{task.category} • {task.status}</span>
      </span>
    </div>
  );
}

function RightTasksPanel({ tasks, onSelectTask, onNewTask }: { tasks: Task[]; onSelectTask: (task: Task) => void; onNewTask: () => void }) {
  return (
    <aside className="hidden h-full overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-sm xl:block">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-900">Plan tasks</h2>
        <button onClick={onNewTask} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">+ New task</button>
      </div>
      <button className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Filter tasks</button>
      <div className="mt-4 space-y-3">
        {tasks.map((task, index) => (
          <button key={task.id} aria-label={`Open task ${task.title}`} onClick={() => onSelectTask(task)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-600 hover:bg-blue-50">
            <p className="text-sm font-bold text-slate-900">#{index + 1} {task.title}</p>
            <p className="mt-1 text-xs text-slate-500">{task.category} - {task.status}</p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function BottomPlanStrip({ plans, activePlan, onSelectPlan, onRenamePlan, onPlanContextMenu, onUpload }: { plans: FloorPlan[]; activePlan?: FloorPlan; onSelectPlan: (planId: string) => void; onRenamePlan: (plan: FloorPlan) => void; onPlanContextMenu: (event: React.MouseEvent, planId: string) => void; onUpload: (file: File) => void }) {
  const activeIndex = activePlan ? plans.findIndex((plan) => plan.id === activePlan.id) : -1;
  const previousPlan = activeIndex > 0 ? plans[activeIndex - 1] : undefined;
  const nextPlan = activeIndex >= 0 && activeIndex < plans.length - 1 ? plans[activeIndex + 1] : undefined;
  return (
    <footer data-plan-strip className="safe-bottom relative z-20 flex min-h-[72px] shrink-0 items-center gap-2.5 overflow-x-auto border-t border-slate-200 bg-white/96 px-3 py-2.5 shadow-[0_-8px_22px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:gap-3 sm:px-4">
      <div className="flex shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-lg">
        <button type="button" title="Previous plan" disabled={!previousPlan} onClick={() => previousPlan && onSelectPlan(previousPlan.id)} className="compact-control grid h-9 w-9 place-items-center text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-45"><ChevronLeft size={17} /></button>
        <button type="button" title="Next plan" disabled={!nextPlan} onClick={() => nextPlan && onSelectPlan(nextPlan.id)} className="compact-control grid h-9 w-9 place-items-center border-l border-white/10 text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-45"><ChevronRight size={17} /></button>
      </div>
      {activePlan && (
        <button type="button" title="Rename active floor plan" onClick={() => onRenamePlan(activePlan)} onContextMenu={(event) => onPlanContextMenu(event, activePlan.id)} className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <span className="max-w-56 truncate">{activePlan.name}</span>
          <Pencil size={15} />
        </button>
      )}
      <span className="shrink-0 text-sm font-semibold text-slate-500">{plans.length} plans</span>
      {plans.map((plan) => (
        <button key={plan.id} onClick={() => onSelectPlan(plan.id)} onContextMenu={(event) => onPlanContextMenu(event, plan.id)} className={`shrink-0 rounded-2xl border p-2 text-left text-xs ${activePlan?.id === plan.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}>
          <span className="block w-36 truncate font-semibold text-slate-700">{plan.name}</span>
          <span className="text-slate-400">{plan.uploadedAt}</span>
        </button>
      ))}
      <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:border-blue-600 hover:text-blue-600">
        <input className="sr-only" type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            hapticImpact(ImpactStyle.Light);
            onUpload(file);
          }
          event.currentTarget.value = "";
        }} />
        <FileUp size={16} />
        Upload plan
      </label>
    </footer>
  );
}

function PlanContextMenu({ x, y, plan, onRename, onDuplicate, onExport, onDelete }: { x: number; y: number; plan: FloorPlan; onRename: (plan: FloorPlan) => void; onDuplicate: (plan: FloorPlan) => void; onExport: (plan: FloorPlan) => void; onDelete: (plan: FloorPlan) => void }) {
  const items = [
    { label: "Rename floor plan", icon: Pencil, action: onRename },
    { label: "Duplicate floor plan", icon: Copy, action: onDuplicate },
    { label: "Export floor plan", icon: Download, action: onExport },
    { label: "Delete floor plan", icon: Trash2, action: onDelete, danger: true }
  ];
  return (
    <div
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      className="fixed z-[80] w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_22px_50px_rgba(15,23,42,0.22)]"
      style={{ left: x, top: y }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => item.action(plan)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition hover:bg-slate-50 ${item.danger ? "text-red-600" : "text-slate-700"}`}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function TaskDetailPopup({ task, checklist, comments, commentDraft, newChecklistItem, onClose, onTaskChange, onDelete, onToggleChecklist, onDeleteChecklist, onChecklistDraft, onAddChecklistItem, onCommentDraft, onAddComment }: { task: Task; checklist: TaskChecklistItem[]; comments: TaskComment[]; commentDraft: string; newChecklistItem: string; onClose: () => void; onTaskChange: (patch: Partial<Task>) => void; onDelete: () => void; onToggleChecklist: (itemId: string) => void; onDeleteChecklist: (itemId: string) => void; onChecklistDraft: (value: string) => void; onAddChecklistItem: () => void; onCommentDraft: (value: string) => void; onAddComment: (imageFile?: File) => void }) {
  const completeCount = checklist.filter((item) => item.completed).length;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-4">
      <section className="ml-auto flex h-full w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <input value={task.title} onChange={(event) => onTaskChange({ title: event.target.value })} className="w-full border-none text-2xl font-bold text-slate-900 outline-none" />
            <p className="mt-1 text-sm text-slate-500">{task.category} - {employeeName(task.assigneeId)}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_340px]">
          <div className="flex min-h-0 flex-col overflow-y-auto p-5">
            <section className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Checklist</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{completeCount}/{checklist.length} complete</span>
              </div>
              <div className="mt-4 space-y-2">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <button onClick={() => onToggleChecklist(item.id)}>{item.completed ? <CheckCircle2 className="text-green-600" size={20} /> : <Circle className="text-slate-400" size={20} />}</button>
                    <span className={`flex-1 text-sm font-semibold ${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.label}</span>
                    <button onClick={() => onDeleteChecklist(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={newChecklistItem} onChange={(event) => onChecklistDraft(event.target.value)} placeholder="Add checklist item" className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-600" />
                <button aria-label="Add checklist item" onClick={onAddChecklistItem} className="rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Add</button>
              </div>
            </section>
            <section className="mt-5 flex min-h-72 flex-1 flex-col rounded-3xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 font-bold text-slate-900"><MessageSquare size={18} />Comments</h3>
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-500"><span>{comment.author}</span><span>{comment.createdAt}</span></div>
                    {comment.message && <p className="mt-2 text-sm text-slate-700">{comment.message}</p>}
                    {comment.imageUrl && <img src={comment.imageUrl} alt="Comment attachment" className="mt-3 max-h-48 rounded-2xl object-cover" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <label className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <input className="sr-only" type="file" accept="image/*" onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) onAddComment(file);
                    event.currentTarget.value = "";
                  }} />
                  <Paperclip size={18} />
                </label>
                <input value={commentDraft} onChange={(event) => onCommentDraft(event.target.value)} placeholder="Enter message here..." className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-600" />
                <button aria-label="Share comment" onClick={() => onAddComment()} className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><Send size={18} /></button>
              </div>
            </section>
          </div>
          <aside className="overflow-y-auto border-l border-slate-100 bg-slate-50 p-5">
            <h3 className="font-bold text-slate-900">Task Attributes</h3>
            <div className="mt-4 space-y-4">
              <Select label="Status" value={task.status} onChange={(value) => onTaskChange({ status: value as TaskStatus })} options={taskStatuses} />
              <Select label="Category" value={task.category} onChange={(value) => onTaskChange({ category: value })} options={categories.map((category) => category.name)} />
              <Select label="Assignee" value={task.assigneeId} onChange={(value) => onTaskChange({ assigneeId: value })} options={employees.map((employee) => employee.id)} labels={Object.fromEntries(employees.map((employee) => [employee.id, employee.name]))} />
              <InfoCard title="Plan location" value={`${task.x_percent ?? 0}% x, ${task.y_percent ?? 0}% y`} />
              <button onClick={onClose} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Save changes</button>
              <button onClick={onDelete} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">Delete task</button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>;
}

function Select({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-blue-600">{options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}</select></label>;
}
