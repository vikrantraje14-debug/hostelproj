import { Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminDashboardPage from "../pages/AdminDashboardPage.jsx";
import AdminLoginPage from "../pages/AdminLoginPage.jsx";
import AdminApplicationsPage from "../pages/AdminApplicationsPage.jsx";
import AdminApplicationDetailsPage from "../pages/AdminApplicationDetailsPage.jsx";
import AdminStudentsPage from "../pages/AdminStudentsPage.jsx";
import AdminDocumentsPage from "../pages/AdminDocumentsPage.jsx";
import AdminContentManagementPage from "../pages/AdminContentManagementPage.jsx";
import ApplicationAcknowledgementPage from "../pages/ApplicationAcknowledgementPage.jsx";
import DemoApplicationWizard from "../pages/DemoApplicationWizard.jsx";
import HomePage from "../pages/HomePage.jsx";
import InformationPage from "../pages/InformationPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import StudentApplicationPage from "../pages/StudentApplicationPage.jsx";
import StudentApplicationsPage from "../pages/StudentApplicationsPage.jsx";
import StudentDashboardPage from "../pages/StudentDashboardPage.jsx";
import StudentLoginPage from "../pages/StudentLoginPage.jsx";
import StudentRegistrationPage from "../pages/StudentRegistrationPage.jsx";
import { publicPages } from "../content/publicPages.js";
import AdminLayout from "../layouts/AdminLayout.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        {publicPages.map((page) => (
          <Route
            element={<InformationPage pagePath={page.path} />}
            key={page.path}
            path={page.path}
          />
        ))}
        <Route path="/student-login" element={<StudentLoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/student-registration"
          element={<StudentRegistrationPage />}
        />
        <Route element={<ProtectedRoute roles={["STUDENT"]} />}>
          <Route path="/apply-online" element={<DemoApplicationWizard />} />
          <Route path="/student" element={<StudentDashboardPage />} />
          <Route
            path="/application-status"
            element={<StudentApplicationsPage />}
          />
          <Route
            path="/student/applications"
            element={<StudentApplicationsPage />}
          />
          <Route
            path="/student/applications/:applicationId/acknowledgement"
            element={<ApplicationAcknowledgementPage />}
          />
          <Route
            path="/student/applications/:applicationId"
            element={<StudentApplicationPage />}
          />
        </Route>
        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route
              path="applications/:applicationId"
              element={<AdminApplicationDetailsPage />}
            />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="documents" element={<AdminDocumentsPage />} />
            <Route
              path="content/:resource"
              element={<AdminContentManagementPage />}
            />
            <Route
              path="settings"
              element={
                <AdminContentManagementPage resourceOverride="settings" />
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
