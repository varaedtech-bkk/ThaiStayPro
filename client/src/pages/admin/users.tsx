import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { UsersTable } from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { User } from "@shared/schema";

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: allUsers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter users based on search query and active tab
  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = searchQuery === "" || 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === "pro") return user.planType === "pro";
    if (activeTab === "free") return user.planType === "free";
    
    return true;
  });

  const proUsers = filteredUsers?.filter(user => user.planType === "pro");
  const freeUsers = filteredUsers?.filter(user => user.planType === "free");

  return (
    <AdminLayout title="User Management">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage and view all users of the platform
              </CardDescription>
            </div>
            
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="all" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="all">
                All Users
                {!isLoading && allUsers && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {filteredUsers?.length || 0}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pro">
                Pro Users
                {!isLoading && proUsers && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    {proUsers?.length || 0}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="free">
                Free Users
                {!isLoading && freeUsers && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {freeUsers?.length || 0}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <UsersTable users={filteredUsers} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="pro">
              <UsersTable users={proUsers} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="free">
              <UsersTable users={freeUsers} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
