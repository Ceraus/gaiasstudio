import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { LoginFallback } from "@/modules/admin/LoginAuthLayout";

const AdminPages = lazy(() => import("@/modules/admin/AdminPages"));
const ClockPage = lazy(() => import("@/modules/clock/ClockPage").then((module) => ({ default: module.ClockPage })));
const TimesheetsPage = lazy(() => import("@/modules/clock/TimesheetsPage").then((module) => ({ default: module.TimesheetsPage })));
const EmployeesPage = lazy(() => import("@/modules/employees/EmployeesPage").then((module) => ({ default: module.EmployeesPage })));
const HubPlaceholderPage = lazy(() => import("@/modules/hub/HubPlaceholderPage").then((module) => ({ default: module.HubPlaceholderPage })));
const ContractsPage = lazy(() => import("@/modules/contracts/ContractsPage").then((module) => ({ default: module.ContractsPage })));
const LoginPage = lazy(() => import("@/modules/admin/LoginPage").then((module) => ({ default: module.LoginPage })));
const CustomerDetailPage = lazy(() => import("@/modules/customers/CustomerDetailPage").then((module) => ({ default: module.CustomerDetailPage })));
const CustomersPage = lazy(() => import("@/modules/customers/CustomersPage").then((module) => ({ default: module.CustomersPage })));
const MobileHomePage = lazy(() => import("@/modules/employees/MobileHomePage").then((module) => ({ default: module.MobileHomePage })));
const ActivityMapPage = lazy(() => import("@/modules/map/ActivityMapPage").then((module) => ({ default: module.ActivityMapPage })));
const BlueprintHubPage = lazy(() => import("@/modules/map/BlueprintHubPage").then((module) => ({ default: module.BlueprintHubPage })));
const ProjectDetailPage = lazy(() => import("@/modules/projects/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage })));
const ProjectGalleryPage = lazy(() => import("@/modules/projects/ProjectGalleryPage").then((module) => ({ default: module.ProjectGalleryPage })));
const ProjectsPage = lazy(() => import("@/modules/projects/ProjectsPage").then((module) => ({ default: module.ProjectsPage })));
const ProfilePage = lazy(() => import("@/modules/profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const TaskDetailPage = lazy(() => import("@/modules/projects/TaskDetailPage").then((module) => ({ default: module.TaskDetailPage })));
const TimeMaterialPage = lazy(() => import("@/modules/time-material/TimeMaterialPage").then((module) => ({ default: module.TimeMaterialPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoginFallback />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route path="/dashboard" element={<AdminPages page="dashboard" />} />
        <Route path="/clock" element={<ClockPage />} />
        <Route path="/clock/timesheets" element={<TimesheetsPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/quotes" element={<HubPlaceholderPage title="Quotes" />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/clients" element={<Navigate to="/customers" replace />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/crm" element={<HubPlaceholderPage title="CRM" />} />
        <Route path="/documents" element={<HubPlaceholderPage title="Documents" />} />
        <Route path="/calendar" element={<HubPlaceholderPage title="Calendar" />} />
        <Route path="/notifications" element={<HubPlaceholderPage title="Notifications" />} />
        <Route path="/ai-hub" element={<HubPlaceholderPage title="AI Hub" />} />
        <Route path="/integrations" element={<HubPlaceholderPage title="Integrations" />} />
        <Route path="/settings" element={<HubPlaceholderPage title="Settings" />} />
        <Route path="/time-material" element={<TimeMaterialPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* /map → Blueprint Hub (Dexie offline-first plan workspace selector) */}
        <Route path="/map" element={<BlueprintHubPage />} />
        {/* /map/activity → team clock activity (legacy Leaflet map) */}
        <Route path="/map/activity" element={<ActivityMapPage />} />
        {/* /team → unified Employees + Users hub */}
        <Route path="/team" element={<EmployeesPage />} />
        <Route path="/projects/:projectId" element={<ProjectPlansRedirect />} />
        <Route path="/projects/:projectId/overview" element={<ProjectDetailPage initialSection="overview" />} />
        <Route path="/projects/:projectId/plan" element={<ProjectDetailPage initialSection="plans" />} />
        <Route path="/projects/:projectId/plans" element={<ProjectDetailPage initialSection="plans" />} />
        <Route path="/projects/:projectId/plans/:planId" element={<ProjectDetailPage initialSection="plans" />} />
        <Route path="/projects/:projectId/tasks" element={<ProjectDetailPage initialSection="tasks" />} />
        <Route path="/projects/:projectId/photos" element={<ProjectDetailPage initialSection="photos" />} />
        <Route path="/projects/:projectId/files" element={<ProjectDetailPage initialSection="files" />} />
        <Route path="/projects/:projectId/checklists" element={<ProjectDetailPage initialSection="checklists" />} />
        <Route path="/projects/:projectId/activity" element={<ProjectDetailPage initialSection="activity" />} />
        <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/projects/:projectId/gallery" element={<ProjectGalleryPage />} />
        <Route path="/templates" element={<AdminPages page="templates" />} />
        <Route path="/checklists" element={<AdminPages page="checklists" />} />
        <Route path="/categories" element={<AdminPages page="categories" />} />
        <Route path="/users" element={<AdminPages page="users" />} />
        <Route path="/account" element={<AdminPages page="account" />} />
        <Route path="/mobile" element={<MobileHomePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function ProjectPlansRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${projectId}/plans`} replace />;
}

function RouteFallback() {
  return (
    <div className="grid min-h-[50svh] place-items-center px-4 text-sm font-semibold text-slate-500" role="status" aria-live="polite">
      Loading Clearplan Command…
    </div>
  );
}
