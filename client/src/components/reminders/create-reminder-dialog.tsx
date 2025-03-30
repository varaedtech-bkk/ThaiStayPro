import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusIcon } from "lucide-react";

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateReminderDialog({ open, onOpenChange }: CreateReminderDialogProps) {
  const { user } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // For free plan users, check if they've reached their limit
  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && user?.planType === 'free') {
      try {
        const response = await fetch('/api/reminders');
        const reminders = await response.json();
        
        if (reminders.length >= user.reminderLimit) {
          setShowUpgradePrompt(true);
          return;
        }
      } catch (error) {
        console.error('Error checking reminder limit:', error);
      }
    }
    
    onOpenChange(isOpen);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Reminder</DialogTitle>
          </DialogHeader>
          
          <ReminderForm 
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reminder Limit Reached</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              You've reached the maximum number of reminders allowed on the free plan. 
              Upgrade to Pro for unlimited reminders and advanced notification options.
            </p>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowUpgradePrompt(false)}>
                Cancel
              </Button>
              <Link href="/upgrade">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
