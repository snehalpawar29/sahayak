import {
  BrowserRouter,
  Route,
  Routes
} from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";


import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Resources from "./pages/Resources";
import ResourceDetails from "./pages/ResourceDetails";
import MyRequests from "./pages/MyRequests";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";



const App = () => {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/resources"
          element={<Resources />}
        />

        <Route
          path="/resources/:id"
          element={<ResourceDetails />}
        />

        <Route element={<ProtectedRoute roles={["CITIZEN"]} />}>
          <Route
            path="/my-requests"
            element={<MyRequests />}
          />
        </Route>

        <Route element={<ProtectedRoute roles={["PROVIDER"]} />}>
          <Route
            path="/provider"
            element={<ProviderDashboard />}
          />
        </Route>

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;