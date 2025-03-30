import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown } from "lucide-react";

interface UsageProgressProps {
  used: number;
  total: number;
}

export function UsageProgress({ used, total }: UsageProgressProps) {
  const { user } = useAuth();
  const percent = Math.min(Math.round((used / total) * 100), 100);
  const isPro = user?.planType === "pro";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isPro ? "Pro Plan" : "Free Plan"}
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                {isPro
                  ? "You are on the Pro Plan with unlimited reminders and SMS notifications."
                  : "You are currently on the Free Plan. Upgrade to Pro for unlimited reminders and SMS notifications."}
              </p>
            </div>
          </div>
          
          {!isPro && (
            <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
              <Link href="/upgrade">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          )}
        </div>
        
        {!isPro && (
          <div className="mt-6">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span 
                    className={cn(
                      "text-xs font-semibold inline-block py-1 px-2 rounded-full",
                      "text-primary-600 bg-primary-200"
                    )}
                  >
                    Reminder Usage
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-primary-600">
                    {used}/{total}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                <div
                  style={{ width: `${percent}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                ></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
