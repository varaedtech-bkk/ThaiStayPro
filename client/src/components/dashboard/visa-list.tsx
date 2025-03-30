import { format, differenceInDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Reminder, VisaReminder } from "@shared/schema";

interface VisaListProps {
  onViewDetails: (reminderWithVisa: { reminder: Reminder; visaReminder: VisaReminder }) => void;
}

export function VisaList({ onViewDetails }: VisaListProps) {
  const { data: visaReminders, isLoading, error } = useQuery({
    queryKey: ["visaReminders"],
    queryFn: async () => {
      const response = await fetch('/api/reminders?type=visa');
      if (!response.ok) throw new Error('Failed to fetch visa reminders');
      const data = await response.json();
      
      // Ensure we have both reminder and visa data for each item
      return data.map((item: any) => ({
        reminder: {
          id: item.id,
          userId: item.userId,
          title: item.title,
          description: item.description,
          reminderType: item.reminderType,
          reminderDate: new Date(item.reminderDate),
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        },
        visaReminder: {
          id: item.visaData?.id,
          reminderId: item.id,
          visaType: item.visaData?.visaType || 'work',
          country: item.visaData?.country || '',
          expiryDate: item.visaData?.expiryDate ? new Date(item.visaData.expiryDate) : null,
          notes: item.visaData?.notes || null
        }
      }));
    }
  });

  if (isLoading) {
    return <VisaListSkeleton />;
  }
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">Error loading visa reminders: {error.message}</p>
      </div>
    );
  }
  
  if (!visaReminders || visaReminders.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6 text-center">
          <p className="text-gray-500 text-sm">No visa reminders found.</p>
        </div>
      </div>
    );
  }

  const getExpiryStatusText = (expiryDate: Date | null) => {
    if (!expiryDate) return { text: 'No expiry date', color: "bg-gray-100 text-gray-800" };
    
    const now = new Date();
    const daysRemaining = differenceInDays(expiryDate, now);
    
    if (daysRemaining < 0) {
      return { text: `Expired ${Math.abs(daysRemaining)} days ago`, color: "bg-red-100 text-red-800" };
    } else if (daysRemaining <= 7) {
      return { text: `Expires in ${daysRemaining} days`, color: "bg-red-100 text-red-800" };
    } else if (daysRemaining <= 30) {
      return { text: `Expires in ${daysRemaining} days`, color: "bg-yellow-100 text-yellow-800" };
    } else if (daysRemaining <= 90) {
      return { text: `Expires in ${daysRemaining} days`, color: "bg-blue-100 text-blue-800" };
    } else {
      return { text: `Expires in ${daysRemaining} days`, color: "bg-green-100 text-green-800" };
    }
  };

  const getCountryFlagEmoji = (country?: string) => {
    if (!country) return '🌍';
    
    const countryToEmoji: Record<string, string> = {
      "United States": "🇺🇸",
      "UK": "🇬🇧",
      "Canada": "🇨🇦",
      "Australia": "🇦🇺",
      "European Union": "🇪🇺",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "India": "🇮🇳",
      "China": "🇨🇳",
      "Japan": "🇯🇵",
      "Spain": "🇪🇸",
      "Italy": "🇮🇹",
    };
    
    return countryToEmoji[country] || '🌍';
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {visaReminders.map((item) => {
          const { reminder, visaReminder } = item;
          const status = getExpiryStatusText(visaReminder.expiryDate);
          const visaTypeFormatted = visaReminder.visaType 
            ? `${visaReminder.visaType.charAt(0).toUpperCase()}${visaReminder.visaType.slice(1)}`
            : 'Visa';

          return (
            <li key={reminder.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="text-orange-500 mr-4 h-5 w-5" />
                    <p className="text-sm font-medium text-primary truncate">
                      {visaTypeFormatted} Visa - {reminder.title}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <Badge variant="outline" className={status.color}>
                      {status.text}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      Expiry: {visaReminder.expiryDate ? format(visaReminder.expiryDate, "PPP") : 'Not set'}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      <Globe className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      {getCountryFlagEmoji(visaReminder.country)} {visaReminder.country || 'Unknown country'}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <Button
                      variant="link"
                      className="text-primary"
                      onClick={() => onViewDetails(item)}
                    >
                      View details
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VisaListSkeleton() {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {[1, 2, 3].map((item) => (
          <li key={item}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-4 w-24 sm:mt-0 sm:ml-6" />
                </div>
                <Skeleton className="mt-2 h-4 w-24 sm:mt-0" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}