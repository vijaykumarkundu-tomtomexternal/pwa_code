import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
import { useSelector } from "react-redux";

const PrivateRoute = () => {
//   const { isAuthenticated } = useAuth();
  const {isAuthenticated} = useSelector((state) => state.auth);

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default PrivateRoute;
