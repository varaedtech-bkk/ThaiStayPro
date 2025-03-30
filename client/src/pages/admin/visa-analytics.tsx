import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { BarChart } from "@/components/admin/bar-chart";
import { UpcomingExpirations } from "@/components/admin/upcoming-expirations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Globe, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { calculatePercentage } from "@/lib/utils";

export default function AdminVisaAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Prepare visa types distribution data
  const visaTypeData = !isLoading && stats?.reminders.byType 
    ? stats.reminders.byType.map((item: any) => ({
        name: item.visaType.charAt(0).toUpperCase() + item.visaType.slice(1),
        value: item.count,
        percentage: calculatePercentage(item.count, stats.reminders.visa)
      }))
    : [];

  const expirationData = !isLoading && stats?.expirations
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

  return (
    <AdminLayout title="Visa Reminder Analytics">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col justify-between p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h3 className="font-medium">Total Visa Reminders</h3>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-bold">{stats?.reminders.visa || 0}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {calculatePercentage(stats?.reminders.visa || 0, stats?.reminders.total || 1)}% of all reminders
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col justify-between p-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium">Expiring Soon</h3>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-bold">{stats?.expirations.next30Days || 0}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Visas expiring in the next 30 days
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col justify-between p-6">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium">Most Common Type</h3>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-bold capitalize">
                    {visaTypeData.length > 0 
                      ? visaTypeData.sort((a, b) => b.value - a.value)[0].name
                      : "N/A"}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {visaTypeData.length > 0 
                      ? `${visaTypeData.sort((a, b) => b.value - a.value)[0].percentage}% of all visa reminders`
                      : "No data available"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Visa Type Distribution</TabsTrigger>
          <TabsTrigger value="expiration">Expiration Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Visa Reminder Distribution by Type</CardTitle>
              <CardDescription>
                Breakdown of visa reminders by visa type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  <div className="md:flex md:space-x-12">
                    <div className="md:w-1/2">
                      <BarChart 
                        data={visaTypeData} 
                        height={300}
                        barColors={["#F97316", "#4F46E5", "#10B981", "#8B5CF6", "#EC4899"]}
                      />
                    </div>
                    <div className="md:w-1/2 mt-8 md:mt-0 space-y-6">
                      {visaTypeData.map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-sm font-medium">{item.value} ({item.percentage}%)</div>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expiration">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Visa Expirations</CardTitle>
              <CardDescription>
                Analysis of visa reminders by expiration timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <div className="md:flex gap-12">
                  <div className="md:w-1/2">
                    <BarChart 
                      data={expirationData.map(item => ({
                        name: item.timeFrame,
                        value: item.count
                      }))} 
                      height={300}
                      barColors={["#EF4444", "#F59E0B", "#3B82F6"]}
                    />
                  </div>
                  <div className="md:w-1/2 mt-8 md:mt-0">
                    <UpcomingExpirations data={expirationData} />
                    
                    <div className="mt-8 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Expiration Alert</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              {expirationData[0].count > 0 
                                ? `There are ${expirationData[0].count} visa reminders expiring in the next 7 days that require immediate attention.`
                                : "No critical visa expirations in the next 7 days."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
