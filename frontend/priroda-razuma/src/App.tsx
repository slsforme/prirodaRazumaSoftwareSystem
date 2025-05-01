import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginForm from "./features/auth/components/LoginForm";
import Analytics from "./features/panel/ChartsPage";
import PersonalCabinet from "./features/panel/PersonalCabinet";
import AccessDenied from "./features/panel/components/AccessDenied";
import DocumentForm from "./features/panel/models/documents/DocumentForm";
import DocumentList from "./features/panel/models/documents/DocumentList";
import PatientForm from "./features/panel/models/patients/PatientForm";
import PatientList from "./features/panel/models/patients/PatientList";
import RoleForm from "./features/panel/models/roles/RoleForm";
import RoleList from "./features/panel/models/roles/RoleList";
import UserForm from "./features/panel/models/users/UserForm";
import UserList from "./features/panel/models/users/UserList";

const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({
  element,
}) => {
  const isAuthenticated = !!localStorage.getItem("access_token");
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{element}</>;
};

const AdminRoute: React.FC<{ element: React.ReactNode }> = ({
  element,
}) => {
  const isAuthenticated = !!localStorage.getItem("access_token");
  const roleId = localStorage.getItem("role_id");
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (roleId !== "1") {
    return <AccessDenied />;
  }
  
  return <>{element}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/cabinet"
          element={<ProtectedRoute element={<PersonalCabinet />} />}
        />
        
        <Route
          path="/roles"
          element={<AdminRoute element={<RoleList />} />}
        />
        <Route
          path="/roles/create"
          element={<AdminRoute element={<RoleForm />} />}
        />
        <Route
          path="/roles/edit/:id"
          element={<AdminRoute element={<RoleForm isEdit />} />}
        />
        <Route
          path="/users"
          element={<AdminRoute element={<UserList />} />}
        />
        <Route
          path="/users/create"
          element={<AdminRoute element={<UserForm />} />}
        />
        <Route
          path="/users/edit/:id"
          element={<AdminRoute element={<UserForm isEdit />} />}
        />
        <Route
          path="/analytics"
          element={<AdminRoute element={<Analytics />} />}
        />
        
        <Route
          path="/patients"
          element={<ProtectedRoute element={<PatientList />} />}
        />
        <Route
          path="/patients/create"
          element={<ProtectedRoute element={<PatientForm />} />}
        />
        <Route
          path="/patients/edit/:id"
          element={<ProtectedRoute element={<PatientForm isEdit />} />}
        />
        <Route
          path="/documents"
          element={<ProtectedRoute element={<DocumentList />} />}
        />
        <Route
          path="/documents/create"
          element={<ProtectedRoute element={<DocumentForm />} />}
        />
        <Route
          path="/documents/edit/:id"
          element={<ProtectedRoute element={<DocumentForm isEdit />} />}
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;