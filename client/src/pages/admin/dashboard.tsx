import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Bell, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { BarChart } from "@/components/admin/bar-chart";
import { UpcomingExpirations } from "@/components/admin/upcoming-expirations";
import { PaymentTable } from "@/components/admin/payment-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/admin/payments"],
  });

  // Prepare data for charts if available
  const visaTypeData = !statsLoading && stats?.reminders.byType 
    ? stats.reminders.byType.map((item: any) => ({
        name: item.visaType.charAt(0).toUpperCase() + item.visaType.slice(1),
        value: item.count,
      }))
    : [];

  const expirationData = !statsLoading && stats?.expirations
    ? [
        { 
          timeFrame: "Next 7 days", 
          count: stats.expirations.next7Days,
          status: "Critical"
        },
        { 
          timeFrame: "Next 30 days", 
          count: stats.expirations.next30Days,
          status: "Attention"
        },
        { 
          timeFrame: "Next 90 days", 
          count: stats.expirations.next90Days,
          status: "Planning"
        }
      ]
    : [];

  // Filter payments to show only recent ones (last 5)
  const recentPayments = !paymentsLoading && payments 
    ? [...payments]
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        .slice(0, 5)
    : [];

  return (
    <AdminLayout title="Admin Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Users"
              value={stats?.users.total || 0}
              icon={Users}
              iconBgColor="bg-primary-100"
              iconColor="text-primary"
              description={
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 mr-2">Pro Users:</span>
                    <span className="font-medium text-gray-900">{stats?.users.pro || 0}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 mr-2">Free Users:</span>
                    <span className="font-medium text-gray-900">{stats?.users.free || 0}</span>
                  </div>
                </div>
              }
              trend={{ value: 12.5, isPositive: true }}
            />
            
            <StatsCard
              title="Monthly Revenue"
              value={formatCurrency(stats?.revenue.monthly || 0)}
              icon={DollarSign}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
              description={
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 mr-2">New Subscriptions:</span>
                    <span className="font-medium text-gray-900">{stats?.revenue.newSubscriptions || 0}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 mr-2">Renewals:</span>
                    <span className="font-medium text-gray-900">{stats?.revenue.renewals || 0}</span>
                  </div>
                </div>
              }
              trend={{ value: 8.3, isPositive: true }}
            />
            
            <StatsCard
              title="Active Reminders"
              value={stats?.reminders.total || 0}
              icon={Bell}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
              description={
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 mr-2">Visa Reminders:</span>
                    <span className="font-medium text-gray-900">{stats?.reminders.visa || 0}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 mr-2">Other Reminders:</span>
                    <span className="font-medium text-gray-900">
                      {(stats?.reminders.total || 0) - (stats?.reminders.visa || 0)}
                    </span>
                  </div>
                </div>
              }
              trend={{ value: 15.2, isPositive: true }}
            />
          </>
        )}
      </div>

      {/* Visa Analytics Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Visa Reminder Analytics</CardTitle>
          <CardDescription>
            Breakdown of visa reminder types and upcoming expirations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visa Types Distribution */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4">Distribution by Visa Type</h3>
              {statsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <BarChart 
                  data={visaTypeData} 
                  height={250}
                  barColors={["#F97316", "#4F46E5", "#10B981", "#8B5CF6"]}
                />
              )}
            </div>
            
            {/* Upcoming Expirations */}
            <div>
              {statsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <UpcomingExpirations data={expirationData} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            The latest payment activity on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentTable payments={recentPayments} isLoading={paymentsLoading} />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
