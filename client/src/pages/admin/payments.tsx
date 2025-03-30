import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { PaymentTable } from "@/components/admin/payment-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BarChart } from "@/components/admin/bar-chart";
import { DollarSign, TrendingUp, Search, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export default function AdminPayments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/admin/payments"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Filter payments based on search, status, and date
  const filteredPayments = payments?.filter(payment => {
    // Search filter (by email or name)
    const matchesSearch = searchQuery === "" || 
      (payment.user && (
        payment.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (statusFilter === "paid" && !payment.isPaid) return false;
    if (statusFilter === "unpaid" && payment.isPaid) return false;
    
    // Date filter
    if (dateFilter !== "all") {
      const paymentDate = new Date(payment.paymentDate);
      const now = new Date();
      
      if (dateFilter === "today") {
        const today = new Date();
        return paymentDate.toDateString() === today.toDateString();
      } else if (dateFilter === "this-week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return paymentDate >= startOfWeek;
      } else if (dateFilter === "this-month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return paymentDate >= startOfMonth;
      }
    }
    
    return true;
  });

  // Prepare data for revenue chart
  const monthlyRevenueData = [
    { name: "Jan", value: 3200 },
    { name: "Feb", value: 3800 },
    { name: "Mar", value: 4100 },
    { name: "Apr", value: 4500 },
    { name: "May", value: 4750 },
    { name: "Jun", value: 5000 },
  ];

  return (
    <AdminLayout title="Payment Management">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-100 mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(stats?.revenue.monthly || 0)}
                    </h3>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-500">8.3% increase</span>
                      <span className="text-xs text-gray-500 ml-1">from last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 mr-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">New Subscriptions</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {stats?.revenue.newSubscriptions || 0}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-xs text-gray-500">This month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Payment Records</TabsTrigger>
          <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Payment Transactions</CardTitle>
                  <CardDescription>
                    View and manage all payment transactions
                  </CardDescription>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search payments..."
                      className="pl-8 w-full sm:w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Select 
                    value={statusFilter} 
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={dateFilter} 
                    onValueChange={setDateFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {filteredPayments && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {filteredPayments.length} payment records
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant={statusFilter === "all" ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => setStatusFilter("all")}
                    >
                      All
                    </Badge>
                    <Badge variant={statusFilter === "paid" ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => setStatusFilter("paid")}
                    >
                      Paid
                    </Badge>
                    <Badge variant={statusFilter === "unpaid" ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => setStatusFilter("unpaid")}
                    >
                      Unpaid
                    </Badge>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <PaymentTable payments={filteredPayments} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>
                Monthly revenue trends and subscription data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || statsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Monthly Revenue Trend</h3>
                    <div className="h-80">
                      <BarChart 
                        data={monthlyRevenueData}
                        xAxisLabel="Month"
                        yAxisLabel="Revenue ($)"
                        isCurrency={true}
                        barColors={["#10B981"]}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Subscription Types</h3>
                      <div className="p-6 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <p className="text-sm font-medium text-gray-500">Monthly</p>
                            <p className="text-2xl font-bold mt-1">
                              {stats?.revenue.newSubscriptions || 0}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <p className="text-sm font-medium text-gray-500">Annual</p>
                            <p className="text-2xl font-bold mt-1">
                              {stats?.revenue.renewals || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Subscription Overview</h3>
                      <div className="p-6 bg-gray-50 rounded-lg">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">Active Subscriptions</span>
                              <span>{stats?.users.pro || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (stats?.users.pro || 0) / (stats?.users.total || 1) * 100)}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">Churned Users</span>
                              <span>7</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: "3%" }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">Conversion Rate</span>
                              <span>19.4%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "19.4%" }}></div>
                            </div>
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
