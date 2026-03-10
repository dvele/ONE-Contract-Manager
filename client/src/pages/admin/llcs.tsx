import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Pencil, Trash2, CalendarIcon, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LLC {
  id: number;
  name: string;
  projectName?: string;
  projectAddress?: string;
  status?: string;
  stateOfFormation?: string;
  entityType?: string;
  formationDate?: string;
  ein?: string;
  address?: string;
  city?: string;
  stateAddress?: string;
  zip?: string;
  registeredAgent?: string;
  registeredAgentAddress?: string;
  members?: string;
  annualReportDueDate?: string;
  annualReportStatus?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const llcFormSchema = z.object({
  name: z.string().min(1, "LLC name is required"),
  projectName: z.string().optional(),
  projectAddress: z.string().optional(),
  stateOfFormation: z.string().optional(),
  entityType: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  stateAddress: z.string().optional(),
  zip: z.string().optional(),
  status: z.string().optional(),
  formationDate: z.date().optional().nullable(),
  ein: z.string().optional().refine(
    (val) => !val || /^\d{2}-\d{7}$/.test(val),
    "EIN must be in format XX-XXXXXXX"
  ),
  registeredAgent: z.string().optional(),
  registeredAgentAddress: z.string().optional(),
  annualReportDueDate: z.date().optional().nullable(),
  annualReportStatus: z.string().optional(),
  members: z.string().optional(),
});

type LLCFormValues = z.infer<typeof llcFormSchema>;

const statusColors: Record<string, string> = {
  forming: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  dissolved: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const complianceColors: Record<string, string> = {
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  filed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

function DatePickerField({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  placeholder: string;
  testId?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          data-testid={testId || "button-date-picker"}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={(date) => onChange(date || null)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default function AdminLLCs() {
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingLlc, setEditingLlc] = useState<LLC | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  const { data: llcs, isLoading } = useQuery<LLC[]>({
    queryKey: ["/api/llcs"],
  });

  const defaultFormValues: LLCFormValues = {
    name: "",
    projectName: "",
    projectAddress: "",
    stateOfFormation: "Delaware",
    entityType: "LLC",
    address: "",
    city: "",
    stateAddress: "",
    zip: "",
    status: "forming",
    formationDate: null,
    ein: "",
    registeredAgent: "",
    registeredAgentAddress: "",
    annualReportDueDate: null,
    annualReportStatus: "pending",
    members: "",
  };

  const form = useForm<LLCFormValues>({
    resolver: zodResolver(llcFormSchema),
    defaultValues: defaultFormValues,
  });

  const buildPayload = (data: LLCFormValues) => {
    const payload: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (key === "formationDate" || key === "annualReportDueDate") {
          payload[key] = (value as Date).toISOString();
        } else {
          payload[key] = value;
        }
      }
    });
    return payload;
  };

  const createMutation = useMutation({
    mutationFn: async (data: LLCFormValues) => {
      const payload = buildPayload(data);
      const res = await apiRequest("POST", "/api/llcs", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llcs"] });
      toast({ title: "LLC Created", description: "The LLC has been created successfully." });
      handleCloseSheet();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create LLC", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LLCFormValues }) => {
      const payload = buildPayload(data);
      const res = await apiRequest("PATCH", `/api/llcs/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llcs"] });
      toast({ title: "LLC Updated", description: "The LLC has been updated successfully." });
      handleCloseSheet();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update LLC", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/llcs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llcs"] });
      toast({ title: "LLC Deleted", description: "The LLC has been deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete LLC", variant: "destructive" });
    },
  });

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingLlc(null);
    setActiveTab("general");
    form.reset(defaultFormValues);
  };

  const handleOpenCreate = () => {
    setEditingLlc(null);
    form.reset(defaultFormValues);
    setActiveTab("general");
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (llc: LLC) => {
    setEditingLlc(llc);
    form.reset({
      name: llc.name || "",
      projectName: llc.projectName || "",
      projectAddress: llc.projectAddress || "",
      stateOfFormation: llc.stateOfFormation || "Delaware",
      entityType: llc.entityType || "LLC",
      address: llc.address || "",
      city: llc.city || "",
      stateAddress: llc.stateAddress || "",
      zip: llc.zip || "",
      status: llc.status || "forming",
      formationDate: llc.formationDate ? new Date(llc.formationDate) : null,
      ein: llc.ein || "",
      registeredAgent: llc.registeredAgent || "",
      registeredAgentAddress: llc.registeredAgentAddress || "",
      annualReportDueDate: llc.annualReportDueDate ? new Date(llc.annualReportDueDate) : null,
      annualReportStatus: llc.annualReportStatus?.toLowerCase() || "pending",
      members: llc.members || "",
    });
    setActiveTab("general");
    setIsSheetOpen(true);
  };

  const onSubmit = (data: LLCFormValues) => {
    if (editingLlc) {
      updateMutation.mutate({ id: editingLlc.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              LLC Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage project-specific LLCs and their lifecycle
            </p>
          </div>
          <Button onClick={handleOpenCreate} data-testid="button-create-llc">
            <Plus className="h-4 w-4 mr-2" />
            New LLC
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {llcs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-muted-foreground/50" />
                        <p>No LLCs found. Create your first LLC to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  llcs?.map((llc) => (
                    <TableRow key={llc.id} data-testid={`row-llc-${llc.id}`}>
                      <TableCell className="font-medium">{llc.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {llc.projectName || "-"}
                      </TableCell>
                      <TableCell>{llc.stateOfFormation || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[llc.status || "forming"]}
                        >
                          {llc.status || "forming"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {llc.annualReportStatus ? (
                          <Badge
                            variant="secondary"
                            className={complianceColors[llc.annualReportStatus.toLowerCase()] || complianceColors.pending}
                          >
                            {llc.annualReportStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(llc)}
                            data-testid={`button-edit-${llc.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this LLC?")) {
                                deleteMutation.mutate(llc.id);
                              }
                            }}
                            data-testid={`button-delete-${llc.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingLlc ? "Edit LLC" : "Create New LLC"}</SheetTitle>
            <SheetDescription>
              {editingLlc
                ? "Update the LLC information across all tabs."
                : "Fill in the details to create a new project LLC."}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general" data-testid="tab-general">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="corporate" data-testid="tab-corporate">
                    Corporate
                  </TabsTrigger>
                  <TabsTrigger value="compliance" data-testid="tab-compliance">
                    Compliance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LLC Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., DP 123 Main St LLC"
                            data-testid="input-llc-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Associated project name"
                            data-testid="input-project-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stateOfFormation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State of Formation</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "Delaware"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="123 Main Street"
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="City"
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stateAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="State"
                              data-testid="input-state-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="ZIP"
                              data-testid="input-zip"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "forming"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="forming">Forming</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="dissolved">Dissolved</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="corporate" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="formationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formation Date</FormLabel>
                        <FormControl>
                          <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select formation date"
                            testId="button-formation-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EIN Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="XX-XXXXXXX"
                            data-testid="input-ein"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registeredAgent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registered Agent</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Agent name or company"
                            data-testid="input-registered-agent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registeredAgentAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Agent's registered address"
                            data-testid="input-agent-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="annualReportDueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Report Due Date</FormLabel>
                        <FormControl>
                          <DatePickerField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select due date"
                            testId="button-annual-report-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="annualReportStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "pending"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-report-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="filed">Filed</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="members"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Members</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="List of LLC members (one per line)"
                            rows={4}
                            data-testid="textarea-members"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseSheet}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-save"
                >
                  {isPending ? "Saving..." : editingLlc ? "Update LLC" : "Create LLC"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
