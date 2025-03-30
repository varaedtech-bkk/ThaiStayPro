import { formatDistance, format } from "date-fns";
import { 
  Clock, 
  Edit, 
  Trash2, 
  FileText, 
  CalendarClock,
  AlertCircle,
  Bell
} from "lucide-react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reminder, VisaReminder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ReminderCardProps {
  reminder: Reminder;
  visaReminder?: VisaReminder;
  onEdit: () => void;
}

export function ReminderCard({ reminder, visaReminder, onEdit }: ReminderCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getIconByType = (type: string) => {
    switch (type) {
      case 'visa':
        return <Clock className="text-orange-500" />;
      case 'bill':
        return <FileText className="text-primary" />;
      case 'task':
        return <CalendarClock className="text-green-500" />;
      default:
        return <Bell className="text-primary" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'visa':
        return 'border-l-4 border-orange-500';
      case 'bill':
        return 'border-l-4 border-primary';
      case 'task':
        return 'border-l-4 border-green-500';
      default:
        return 'border-l-4 border-primary';
    }
  };

  const getRemainingDaysColor = (days: number) => {
    if (days <= 7) return 'bg-red-100 text-red-800';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const reminderDate = new Date(reminder.reminderDate);
  const today = new Date();
  const daysRemaining = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const formattedDate = format(reminderDate, 'MMMM d, yyyy');
  const remainingText = daysRemaining > 0 
    ? `${daysRemaining} days remaining` 
    : 'Due today';

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiRequest('DELETE', `/api/reminders/${reminder.id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: [`/api/reminders/${reminder.reminderType}`] });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className={`overflow-hidden shadow ${getBorderColor(reminder.reminderType)}`}>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
              {getIconByType(reminder.reminderType)}
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-sm font-medium text-gray-500 truncate">
                {reminder.title}
              </div>
              <div className="text-lg font-medium text-gray-900">
                {formattedDate}
              </div>
            </div>
          </div>
          
          {reminder.description && (
            <div className="mt-2 text-sm text-gray-600">
              {reminder.description}
            </div>
          )}
          
          {visaReminder && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium mr-2">Type:</span> 
                {visaReminder.visaType.charAt(0).toUpperCase() + visaReminder.visaType.slice(1)} Visa
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium mr-2">Country:</span> 
                {visaReminder.country}
              </div>
              {visaReminder.notes && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Notes:</span> 
                  {visaReminder.notes}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4">
            <Badge variant="outline" className={getRemainingDaysColor(daysRemaining)}>
              <Clock className="h-3 w-3 mr-1" />
              {remainingText}
            </Badge>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this reminder. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
