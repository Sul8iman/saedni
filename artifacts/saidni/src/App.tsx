import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CustomerHome from "@/pages/CustomerHome";
import MyRequests from "@/pages/MyRequests";
import HelperRequests from "@/pages/HelperRequests";
import RequestDetails from "@/pages/RequestDetails";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import UsersManagement from "@/pages/UsersManagement";
import HelperMyRequests from "@/pages/HelperMyRequests";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Redirect to the correct dashboard based on userType
function roleDashboard(userType: string): string {
  if (userType === "admin")  return "/admin";
  if (userType === "helper") return "/helper-requests";
  return "/customer";
}

// Require authentication. While loading, render nothing (avoid flash).
function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

// Require a specific userType — redirects to correct dashboard if wrong role.
function RoleProtected({ role, children }: { role: string | string[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.userType)) {
    return <Redirect to={roleDashboard(user.userType)} />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Customer-only routes */}
      <Route path="/customer">
        <RoleProtected role="customer"><CustomerHome /></RoleProtected>
      </Route>
      <Route path="/my-requests">
        <RoleProtected role="customer"><MyRequests /></RoleProtected>
      </Route>

      {/* Helper-only routes */}
      <Route path="/helper-requests">
        <RoleProtected role="helper"><HelperRequests /></RoleProtected>
      </Route>
      <Route path="/helper-my-requests">
        <RoleProtected role="helper"><HelperMyRequests /></RoleProtected>
      </Route>

      {/* Shared (customer + helper) */}
      <Route path="/request/:id">
        <RoleProtected role={["customer", "helper"]}><RequestDetails /></RoleProtected>
      </Route>
      <Route path="/profile">
        <Protected><Profile /></Protected>
      </Route>

      {/* Admin-only routes */}
      <Route path="/admin">
        <RoleProtected role="admin"><Admin /></RoleProtected>
      </Route>
      <Route path="/users-management">
        <RoleProtected role="admin"><UsersManagement /></RoleProtected>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
