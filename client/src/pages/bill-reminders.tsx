import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { RemindersList } from "@/components/reminders/reminders-list";

export default function BillReminders() {
  return (
    <DashboardLayout title="Bill Reminders">
      <div className="bg-green-50 p-4 rounded-md mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1 md:flex md:justify-between">
            <p className="text-sm text-green-700">
              Never miss a bill payment again. Set up reminders for rent, utilities, subscriptions, and more.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <RemindersList reminderType="bill" />
      </div>
    </DashboardLayout>
  );
}
