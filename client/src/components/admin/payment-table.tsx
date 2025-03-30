import { useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface PaymentUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

interface Payment {
  id: number;
  userId: number;
  amount: number;
  planType: string;
  isPaid: boolean;
  stripePaymentId: string | null;
  paymentDate: string;
  user: PaymentUser | null;
}

interface PaymentTableProps {
  payments: Payment[] | undefined;
  isLoading: boolean;
}

export function PaymentTable({ payments, isLoading }: PaymentTableProps) {
  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Sort payments by date
  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    return [...payments].sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  }, [payments]);

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="ml-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32 mt-1" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!sortedPayments || sortedPayments.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-gray-500">No payment records found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <div className="flex items-center">
                  <Avatar>
                    <AvatarFallback>
                      {payment.user ? getInitials(payment.user.fullName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.user?.fullName || 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.user?.email || 'N/A'}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  {payment.planType === 'pro' ? 'Pro' : 'Free'} 
                  {payment.planType === 'pro' && ' (Monthly)'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  {formatCurrency(payment.amount)}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={payment.isPaid 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                  }
                >
                  {payment.isPaid ? 'Successful' : 'Failed'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
