import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
// import { AuthProvider } from "../context/AuthContext";
import PrivateRoute from "./PrivateRoute";

const Login = lazy(() => import("../pages/Login/Login"));
const NotFound = lazy(() => import("../pages/NotFound"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const DecisionSupport = lazy(() => import("../pages/DecisionSupport"));
const Insights = lazy(() => import("../pages/Insights"));

const AppRoutes = () => {
  return (
    <>
     {/* <AuthProvider> */}
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Login />}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />}></Route>
          <Route path="/decisionSupport" element={<DecisionSupport />}></Route>
          <Route path="/insights" element={<Insights />}></Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {/* </AuthProvider> */}
    </>
  );
};

export default AppRoutes;
