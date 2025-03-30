import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Reminder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { VisaReminderForm } from "./visa-reminder-form";
// import { FormProvider, useForm } from "react-hook-form";
interface ReminderFormProps {
  reminder?: Reminder & { visaData?: VisaReminder };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  reminderType: z.enum(["general", "visa", "bill", "task"]),
  reminderDate: z.date({
    required_error: "Please select a date",
  }),
  notifications: z.array(z.enum(["email", "push", "sms"])),
  visaData: z.object({
    visaType: z.enum(["work", "tourist", "student", "business", "other"]),
    country: z.string().min(1, "Country is required"),
    expiryDate: z.date({
      required_error: "Please select an expiry date",
    }),
    notes: z.string().optional(),
  }).optional(),
});

type ReminderFormValues = z.infer<typeof formSchema>;

export function ReminderForm({ reminder, onSuccess, onCancel }: ReminderFormProps) {
  const [activeTab, setActiveTab] = useState("reminder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const defaultValues: Partial<ReminderFormValues> = {
    title: reminder?.title || "",
    description: reminder?.description || "",
    reminderType: reminder?.reminderType || "general",
    reminderDate: reminder?.reminderDate ? new Date(reminder.reminderDate) : new Date(),
    notifications: reminder?.notifications || ["email", "push"],
    visaData: reminder?.reminderType === 'visa' && reminder.visaData ? {
      visaType: reminder.visaData.visaType,
      country: reminder.visaData.country,
      expiryDate: reminder.visaData.expiryDate ? new Date(reminder.visaData.expiryDate) : new Date(new Date().setMonth(new Date().getMonth() + 6)),
      notes: reminder.visaData.notes || ""
    } : undefined
  };

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });


  const reminderType = form.watch("reminderType");
  const isPro = user?.planType === "pro";

  useEffect(() => {
    if (reminderType === 'visa' && !form.getValues('visaData')) {
      form.setValue('visaData', {
        visaType: "work",
        country: "",
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        notes: ""
      });
    }
  }, [reminderType, form]);

  async function onSubmit(values: ReminderFormValues) {
    setIsSubmitting(true);
    try {
      const formData = { ...values };
      if (formData.reminderType !== 'visa') {
        delete formData.visaData;
      }
      
      if (formData.reminderDate) {
        formData.reminderDate = new Date(formData.reminderDate).toISOString();
      }
      
      if (formData.reminderType === 'visa' && formData.visaData?.expiryDate) {
        formData.visaData.expiryDate = new Date(formData.visaData.expiryDate).toISOString();
      }
      
      if (reminder) {
        await apiRequest("PUT", `/api/reminders/${reminder.id}`, formData);
        toast({
          title: "Reminder updated",
          description: "Your reminder has been updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/reminders", formData);
        toast({
          title: "Reminder created",
          description: "Your reminder has been created successfully",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: [`/api/reminders/${values.reminderType}`] });
      if (values.reminderType === 'visa') {
        queryClient.invalidateQueries({ queryKey: ['/api/visa-reminders'] });
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `There was an error saving your reminder: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="reminderType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reminder Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reminder type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">General Reminder</SelectItem>
                    <SelectItem value="visa">Visa Reminder</SelectItem>
                    <SelectItem value="bill">Bill Payment Reminder</SelectItem>
                    <SelectItem value="task">Task Reminder</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter reminder title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reminderDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Reminder Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any additional details"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

{reminderType === "visa" && (
            <div className="mt-4">
              <div className="flex border-b">
                <button
                  type="button"
                  className={`px-4 py-2 font-medium ${activeTab === 'reminder' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('reminder')}
                >
                  Reminder Details
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 font-medium ${activeTab === 'visa' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('visa')}
                >
                  Visa Details
                </button>
              </div>

              <div className="mt-4">
              {activeTab === 'reminder' && (
  <>
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Title</FormLabel>
          <FormControl>
            <Input placeholder="Enter reminder title" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="reminderDate"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Reminder Date</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description (Optional)</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Enter any additional details"
              className="resize-none"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)}
                {activeTab === 'visa' && (
                  <VisaReminderForm 
                    isEditMode={!!reminder}
                   
                    reminderId={reminder?.id}
                  />
                )}
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="notifications"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Notification Settings</FormLabel>
                  <FormDescription>
                    Select how you want to be notified
                  </FormDescription>
                </div>
                <div className="space-y-2">
                  {["email", "push", "sms"].map((type) => (
                    <FormField
                      key={type}
                      control={form.control}
                      name="notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(type)}
                              onCheckedChange={(checked) => {
                                const updatedNotifications = checked
                                  ? [...(field.value || []), type]
                                  : (field.value || []).filter((v) => v !== type);
                                field.onChange(updatedNotifications);
                              }}
                              disabled={type === "sms" && !isPro}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={cn("cursor-pointer", type === "sms" && !isPro && "text-muted-foreground")}>
                              {type.charAt(0).toUpperCase() + type.slice(1)} Notification
                              {type === "sms" && !isPro && (
                                <span className="ml-2 text-xs text-orange-500">(Pro Plan Only)</span>
                              )}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : reminder ? 'Update Reminder' : 'Save Reminder'}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}