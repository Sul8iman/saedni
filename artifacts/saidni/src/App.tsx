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
import HelperMyRequests from "@/pages/HelperMyRequests";
import RequestDetails from "@/pages/RequestDetails";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import UsersManagement from "@/pages/UsersManagement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Protected route: redirects to /login if not authenticated
function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/customer">
        <Protected><CustomerHome /></Protected>
      </Route>
      <Route path="/my-requests">
        <Protected><MyRequests /></Protected>
      </Route>
      <Route path="/helper-requests">
        <Protected><HelperRequests /></Protected>
      </Route>
      <Route path="/helper-my-requests">
        <Protected><HelperMyRequests /></Protected>
      </Route>
      <Route path="/request/:id">
        <Protected><RequestDetails /></Protected>
      </Route>
      <Route path="/profile">
        <Protected><Profile /></Protected>
      </Route>
      <Route path="/admin">
        <Protected><Admin /></Protected>
      </Route>
      <Route path="/users-management">
        <Protected><UsersManagement /></Protected>
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
