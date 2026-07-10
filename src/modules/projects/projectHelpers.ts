import { activityLog, checklists, employeeName } from "@/infrastructure/offline/mockData";
import { useDemoData } from "@/app/providers/DemoDataProvider";

export function useProjectBundle(projectId?: string) {
  const data = useDemoData();
  const project = projectId ? data.projects.find((item) => item.id === projectId) : data.projects[0];
  const projectTasks = project ? data.tasks.filter((task) => task.projectId === project.id) : [];
  const projectPlans = project ? data.floorPlans.filter((plan) => project.floorPlanIds.includes(plan.id) || plan.projectId === project.id) : [];
  const projectPhotos = project ? data.galleryPhotos.filter((photo) => photo.projectId === project.id) : [];
  const projectActivity = project ? activityLog.filter((item) => item.projectId === project.id) : [];

  return { ...data, project, projectTasks, projectPlans, projectPhotos, projectActivity, checklists, employeeName };
}
