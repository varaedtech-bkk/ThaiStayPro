import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { visaTypeEnum } from "@shared/schema";

interface VisaReminderFormProps {
  isEditMode?: boolean;
  isViewMode?: boolean;
  reminderId?: number;
}

export function VisaReminderForm({
  isEditMode = false,
  reminderId,
  isViewMode = false,
}: VisaReminderFormProps) {
  const formContext = useFormContext();
  if (!formContext) {
    return <div className="text-red-500">Form context not available</div>;
  }

  const { control, setValue, getValues, watch } = formContext;
  const [isLoading, setIsLoading] = useState(isEditMode && !isViewMode);

  useEffect(() => {
    if (isEditMode && !isViewMode && reminderId) {
      const fetchVisaData = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/reminders/${reminderId}/visa`);
          if (!response.ok) throw new Error("Failed to fetch visa data");
          const visaData = await response.json();

          setValue("visaData", {
            visaType: visaData?.visaType || "work",
            country: visaData?.country || "",
            expiryDate: visaData?.expiryDate
              ? new Date(visaData.expiryDate)
              : new Date(new Date().setMonth(new Date().getMonth() + 6)),
            notes: visaData?.notes || "",
          });
        } catch (error) {
          console.error("Error fetching visa data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchVisaData();
    }
  }, [isEditMode, isViewMode, reminderId, setValue]);

  useEffect(() => {
    if (!isEditMode && !getValues("visaData")) {
      setValue("visaData", {
        visaType: "work",
        country: "",
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        notes: "",
      });
    }
  }, [isEditMode, setValue, getValues]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        Loading visa data...
      </div>
    );
  }
  const visaData = watch("visaData");

  return (
    <div className="space-y-4 border p-4 rounded-md bg-gray-50">
      <h3 className="font-medium text-sm text-gray-700">Visa Details</h3>
      {isViewMode ? (
        // View mode - display read-only data
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Visa Type</p>
            <p className="font-medium">
              {visaData?.visaType
                ? `${visaData.visaType
                    .charAt(0)
                    .toUpperCase()}${visaData.visaType.slice(1)} Visa`
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Country</p>
            <p className="font-medium">{visaData?.country || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expiry Date</p>
            <p className="font-medium">
              {visaData?.expiryDate
                ? format(new Date(visaData.expiryDate), "PPP")
                : "-"}
            </p>
          </div>
          {visaData?.notes && (
            <div>
              <p className="text-sm text-gray-500">Additional Notes</p>
              <p className="font-medium">{visaData.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <FormField
            control={control}
            name="visaData.visaType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visa Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visa type">
                        {field.value
                          ? `${field.value
                              .charAt(0)
                              .toUpperCase()}${field.value.slice(1)} Visa`
                          : "Select visa type"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {visaTypeEnum.enumValues.map((type) => (
                      <SelectItem key={type} value={type}>
                        {`${type.charAt(0).toUpperCase()}${type.slice(1)} Visa`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="visaData.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter country name"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="visaData.expiryDate"
            render={({ field }) => {
              const dateValue = field.value ? new Date(field.value) : undefined;
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !dateValue && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {dateValue ? (
                            format(dateValue, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={field.onChange}
                        initialFocus
                        disabled={isLoading}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name="visaData.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any additional details"
                    className="resize-none"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
}
