import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Reminder, VisaReminder } from "@shared/schema";
import { ReminderCard } from "@/components/reminders/reminder-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { VisaReminderForm } from "@/components/reminders/visa-reminder-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RemindersListProps {
  reminderType?: string;
}

export function RemindersList({ reminderType }: RemindersListProps) {
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editingVisaReminder, setEditingVisaReminder] = useState<VisaReminder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch all reminders or filtered by type
  const { data: reminders, isLoading, isError } = useQuery<Reminder[]>({
    queryKey: ['reminders', reminderType],
    queryFn: async () => {
      const url = reminderType 
        ? `/api/reminders/type/${reminderType}`
        : '/api/reminders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reminders');
      return response.json();
    }
  });

  // Fetch visa reminders separately if viewing visa type
  const { data: visaReminders } = useQuery({
    queryKey: ['visaReminders'],
    queryFn: async () => {
      const response = await fetch('/api/visa-reminders');
      if (!response.ok) throw new Error('Failed to fetch visa reminders');
      return response.json();
    },
    enabled: reminderType === 'visa'
  });

  const handleEditReminder = async (reminder: Reminder) => {
    setEditingReminder(reminder);
    
    if (reminder.reminderType === 'visa') {
      try {
        // Fetch visa details specifically for this reminder
        const response = await fetch(`/api/reminders/${reminder.id}`);
        if (response.ok) {
          const data = await response.json();
          setEditingVisaReminder(data.visaData || null);
        }
      } catch (error) {
        console.error('Error fetching visa details:', error);
      }
    }
    
    setIsEditDialogOpen(true);
  };

  const getVisaReminderForCard = (reminder: Reminder) => {
    if (reminder.reminderType !== 'visa' || !visaReminders) return undefined;
    return visaReminders.find(vr => vr.reminder.id === reminder.id)?.visaReminder;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="ml-5 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mt-4" />
            <div className="mt-4">
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="mt-4 flex space-x-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">Error loading reminders. Please try again later.</p>
      </div>
    );
  }

  if (!reminders || reminders.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders found</h3>
        <p className="text-gray-500 mb-4">
          {reminderType 
            ? `You don't have any ${reminderType} reminders yet.`
            : "You don't have any reminders yet."}
        </p>
        <p className="text-sm text-gray-400">
          Click the "New Reminder" button to create one.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reminders.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            visaReminder={getVisaReminderForCard(reminder)}
            onEdit={() => handleEditReminder(reminder)}
          />
        ))}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          
          {editingReminder && (
            <Tabs defaultValue="reminder">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reminder">Reminder Details</TabsTrigger>
                {editingReminder.reminderType === 'visa' && (
                  <TabsTrigger value="visa">Visa Details</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="reminder">
                <ReminderForm 
                  reminder={editingReminder}
                  onSuccess={() => {
                    setIsEditDialogOpen(false);
                    setEditingReminder(null);
                    setEditingVisaReminder(null);
                  }}
                  onCancel={() => {
                    setIsEditDialogOpen(false);
                    setEditingReminder(null);
                    setEditingVisaReminder(null);
                  }}
                />
              </TabsContent>
              
              {editingReminder.reminderType === 'visa' && (
                <TabsContent value="visa">
                  <VisaReminderForm 
                    reminderId={editingReminder.id}
                    initialData={editingVisaReminder || undefined}
                    onSuccess={() => {
                      setIsEditDialogOpen(false);
                      setEditingReminder(null);
                      setEditingVisaReminder(null);
                    }}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}