import { useState } from "react";
import { Sidebar } from "@/components/layouts/sidebar";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  showAddButton?: boolean;
}

export function DashboardLayout({ 
  children, 
  title, 
  showAddButton = true 
}: DashboardLayoutProps) {
  const [isReminderDialogOpen, setReminderDialogOpen] = useState(false);
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <main className="flex-1 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              
              {showAddButton && (
                <div className="mt-4 md:mt-0 flex space-x-3">
                  <button 
                    onClick={() => setReminderDialogOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Reminder
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      <CreateReminderDialog 
        open={isReminderDialogOpen} 
        onOpenChange={setReminderDialogOpen} 
      />
    </div>
  );
}
