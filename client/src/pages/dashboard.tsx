import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RemindersList } from "@/components/reminders/reminders-list";
import { UsageProgress } from "@/components/dashboard/usage-progress";
import { VisaList } from "@/components/dashboard/visa-list";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Reminder, VisaReminder } from "@shared/schema";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const [visaDetailDialog, setVisaDetailDialog] = useState<{
    open: boolean;
    data?: { reminder: Reminder; visaReminder: VisaReminder };
  }>({ open: false });

  // Fetch reminders count for the usage progress
  const { data: reminders, isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ['/api/reminders'],
  });

  const reminderCount = reminders?.length || 0;
  const reminderLimit = user?.reminderLimit || 10;

  // Handler for opening visa detail dialog
  const handleViewVisaDetails = (data: { reminder: Reminder; visaReminder: VisaReminder }) => {
    setVisaDetailDialog({ open: true, data });
  };

  return (
    <DashboardLayout title="Dashboard">
      {/* Plan Status Section */}
      {remindersLoading ? (
        <Skeleton className="h-32 w-full mb-8" />
      ) : (
        <div className="mb-8">
          <UsageProgress used={reminderCount} total={reminderLimit} />
        </div>
      )}

      {/* Upcoming Reminders Section */}
      <div className="mt-8">
        <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Upcoming Reminders</h2>
        <RemindersList />
      </div>
      
      {/* Visa Documents Section */}
      <div className="mt-8">
        <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Visa Documents</h2>
        <VisaList onViewDetails={handleViewVisaDetails} />
      </div>

      {/* Visa Detail Dialog */}
      <Dialog 
        open={visaDetailDialog.open} 
        onOpenChange={(open) => setVisaDetailDialog({ open })}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Visa Reminder Details</DialogTitle>
          </DialogHeader>
          
          {visaDetailDialog.data && (
            <ReminderForm 
              reminder={visaDetailDialog.data.reminder}
              onSuccess={() => setVisaDetailDialog({ open: false })}
              onCancel={() => setVisaDetailDialog({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
