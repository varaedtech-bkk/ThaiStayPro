import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import AllReminders from "@/pages/all-reminders";
import VisaReminders from "@/pages/visa-reminders";
import BillReminders from "@/pages/bill-reminders";
import TaskReminders from "@/pages/task-reminders";
import Settings from "@/pages/settings";
import Upgrade from "@/pages/upgrade";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminVisaAnalytics from "@/pages/admin/visa-analytics";
import AdminPayments from "@/pages/admin/payments";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected user routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/reminders" component={AllReminders} />
      <ProtectedRoute path="/visa-reminders" component={VisaReminders} />
      <ProtectedRoute path="/bill-reminders" component={BillReminders} />
      <ProtectedRoute path="/task-reminders" component={TaskReminders} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/upgrade" component={Upgrade} />
      
      {/* Admin routes */}
      <AdminRoute path="/admin" component={AdminDashboard} />
      <AdminRoute path="/admin/users" component={AdminUsers} />
      <AdminRoute path="/admin/visa-analytics" component={AdminVisaAnalytics} />
      <AdminRoute path="/admin/payments" component={AdminPayments} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
