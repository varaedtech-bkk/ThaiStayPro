import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { RemindersList } from "@/components/reminders/reminders-list";

export default function AllReminders() {
  return (
    <DashboardLayout title="All Reminders">
      <div className="mt-4">
        <RemindersList />
      </div>
    </DashboardLayout>
  );
}
