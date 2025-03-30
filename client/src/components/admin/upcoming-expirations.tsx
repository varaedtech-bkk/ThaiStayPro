import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ExpirationData {
  timeFrame: string;
  count: number;
  status: "Critical" | "Attention" | "Planning";
}

interface UpcomingExpirationsProps {
  data: ExpirationData[];
  isLoading?: boolean;
}

export function UpcomingExpirations({ data, isLoading = false }: UpcomingExpirationsProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Critical":
        return "bg-red-100 text-red-800";
      case "Attention":
        return "bg-yellow-100 text-yellow-800";
      case "Planning":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-medium text-gray-900 mb-4">Upcoming Visa Expirations</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time Frame</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.timeFrame}>
                <TableCell className="font-medium">{item.timeFrame}</TableCell>
                <TableCell>{item.count}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getStatusBadgeColor(item.status)}
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
