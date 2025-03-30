import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  description?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconBgColor = "bg-primary-100",
  iconColor = "text-primary",
  description,
  trend,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div 
            className={cn(
              "flex-shrink-0 rounded-md p-3",
              iconBgColor
            )}
          >
            <Icon 
              className={cn(
                "h-6 w-6",
                iconColor
              )} 
            />
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="text-sm font-medium text-gray-500 truncate">
              {title}
            </div>
            <div className="text-lg font-medium text-gray-900">
              {value}
            </div>
          </div>
        </div>
        
        {(description || trend) && (
          <div className="mt-6">
            <div className="flex justify-between items-center">
              {description && (
                <div className="space-y-1">
                  {description}
                </div>
              )}
              
              {trend && (
                <div>
                  <span 
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      trend.isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}
                  >
                    {trend.isPositive ? (
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                    {trend.value}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
