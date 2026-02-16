import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  ScrollText,
  Blocks,
  Plus,
  Check,
  X,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface EnrichedVariable {
  id: number | null;
  variableName: string;
  displayName: string | null;
  category: string | null;
  dataType: string;
  defaultValue: string | null;
  isRequired: boolean;
  description: string | null;
  erpSource: string | null;
  clauseUsage: { id: number; clauseCode: string; name: string; contractType: string[]; hierarchyLevel: number }[];
  clauseCount: number;
  exhibitUsage: { id: number; letter: string; title: string }[];
  exhibitCount: number;
  componentUsage: { id: number; tagName: string; description: string; serviceModel: string }[];
  componentCount: number;
  totalUsageCount: number;
  isRegistered: boolean;
  mapperCategory: string | null;
  inMapper: boolean;
}

interface VariableRegistryResponse {
  variables: EnrichedVariable[];
  unregisteredVariables: EnrichedVariable[];
  mapperCategories: Record<string, string[]>;
  mapperVariableCount: number;
  orphanedMapperVars: string[];
  stats: {
    totalRegistered: number;
    totalUnregistered: number;
    totalInMapper: number;
    usedInClauses: number;
    usedInExhibits: number;
    usedInComponents: number;
    orphanedInMapper: number;
    erpMapped: number;
    required: number;
  };
}

const CATEGORY_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "client", label: "Client" },
  { value: "childLlc", label: "Child LLC" },
  { value: "site", label: "Site" },
  { value: "home", label: "Home" },
  { value: "specifications", label: "Specifications" },
  { value: "dates", label: "Dates" },
  { value: "pricing", label: "Pricing" },
  { value: "milestones", label: "Milestones" },
  { value: "warranty", label: "Warranty" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "onsiteContractor", label: "Onsite Contractor" },
  { value: "liquidatedDamages", label: "Liquidated Damages" },
  { value: "schedule", label: "Schedule" },
  { value: "legal", label: "Legal" },
  { value: "insurance", label: "Insurance" },
  { value: "tables", label: "Tables" },
  { value: "conditional", label: "Conditional" },
];

const DATA_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Boolean" },
];

type FilterTab = "all" | "unregistered" | "orphaned";

const variableFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  displayName: z.string().optional(),
  category: z.string().optional(),
  dataType: z.string().default("text"),
  isRequired: z.boolean().default(false),
  description: z.string().optional(),
});

type VariableFormValues = z.infer<typeof variableFormSchema>;

function StatusDot({ status }: { status: "active" | "unregistered" | "orphaned" }) {
  if (status === "active") return <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />;
  if (status === "unregistered") return <AlertTriangle className="h-3 w-3 text-amber-500" />;
  return <Circle className="h-2.5 w-2.5 fill-muted-foreground/40 text-muted-foreground/40" />;
}

function getStatus(v: EnrichedVariable): "active" | "unregistered" | "orphaned" {
  if (!v.isRegistered) return "unregistered";
  if (v.totalUsageCount > 0) return "active";
  return "orphaned";
}

export default function AdminVariables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedVariable, setSelectedVariable] = useState<EnrichedVariable | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteVariable, setDeleteVariable] = useState<EnrichedVariable | null>(null);
  const [clausesOpen, setClausesOpen] = useState(true);
  const [exhibitsOpen, setExhibitsOpen] = useState(true);
  const [componentsOpen, setComponentsOpen] = useState(true);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<VariableRegistryResponse>({
    queryKey: ["/api/variable-mappings"],
  });

  const form = useForm<VariableFormValues>({
    resolver: zodResolver(variableFormSchema),
    defaultValues: {
      variableName: "",
      displayName: "",
      category: "",
      dataType: "text",
      isRequired: false,
      description: "",
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/system/sync-variables-from-mapper");
    },
    onSuccess: async () => {
      const res = await syncMutation.data;
      queryClient.invalidateQueries({ queryKey: ["/api/variable-mappings"] });
      toast({ title: "Variables synced from mapper" });
    },
    onError: () => {
      toast({ title: "Failed to sync variables", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VariableFormValues) => {
      return apiRequest("POST", "/api/variable-mappings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variable-mappings"] });
      setIsEditing(false);
      toast({ title: "Variable created" });
    },
    onError: () => {
      toast({ title: "Failed to create variable", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VariableFormValues }) => {
      return apiRequest("PATCH", `/api/variable-mappings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variable-mappings"] });
      setIsEditing(false);
      toast({ title: "Variable updated" });
    },
    onError: () => {
      toast({ title: "Failed to update variable", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/variable-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variable-mappings"] });
      setDeleteVariable(null);
      if (selectedVariable?.id === deleteVariable?.id) {
        setSelectedVariable(null);
      }
      toast({ title: "Variable deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete variable", variant: "destructive" });
    },
  });

  const allVariables = useMemo(() => {
    if (!data) return [];
    const combined = [...data.variables, ...data.unregisteredVariables];
    const orphanedNames = new Set(data.orphanedMapperVars || []);
    const existingNames = new Set(combined.map((v) => v.variableName));
    for (const varName of data.orphanedMapperVars || []) {
      if (!existingNames.has(varName)) {
        combined.push({
          id: null,
          variableName: varName,
          displayName: null,
          category: null,
          dataType: "text",
          defaultValue: null,
          isRequired: false,
          description: null,
          erpSource: null,
          clauseUsage: [],
          clauseCount: 0,
          exhibitUsage: [],
          exhibitCount: 0,
          componentUsage: [],
          componentCount: 0,
          totalUsageCount: 0,
          isRegistered: false,
          mapperCategory: (data.mapperCategories ? Object.entries(data.mapperCategories).find(([, vars]) => (vars as string[]).includes(varName))?.[0] : null) || null,
          inMapper: true,
        });
      }
    }
    return combined;
  }, [data]);

  const filteredVariables = useMemo(() => {
    let list = allVariables;

    if (filterTab === "unregistered") {
      list = list.filter((v) => !v.isRegistered && v.totalUsageCount > 0);
    } else if (filterTab === "orphaned") {
      list = list.filter((v) => v.totalUsageCount === 0);
    }

    if (categoryFilter && categoryFilter !== "all") {
      list = list.filter((v) => v.category === categoryFilter || v.mapperCategory === categoryFilter);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (v) =>
          v.variableName.toLowerCase().includes(s) ||
          v.displayName?.toLowerCase().includes(s) ||
          v.category?.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => a.variableName.localeCompare(b.variableName));
    return list;
  }, [allVariables, filterTab, categoryFilter, searchTerm]);

  const stats = data?.stats;
  const orphanedCount = data?.orphanedMapperVars?.length || 0;

  function handleSelectVariable(v: EnrichedVariable) {
    setSelectedVariable(v);
    setIsEditing(false);
  }

  function handleStartEdit(v: EnrichedVariable) {
    setIsEditing(true);
    form.reset({
      variableName: v.variableName,
      displayName: v.displayName || "",
      category: v.category || v.mapperCategory || "",
      dataType: v.dataType || "text",
      isRequired: v.isRequired || false,
      description: v.description || "",
    });
  }

  function handleStartCreate() {
    setSelectedVariable(null);
    setIsEditing(true);
    form.reset({
      variableName: "",
      displayName: "",
      category: "",
      dataType: "text",
      isRequired: false,
      description: "",
    });
  }

  function handleRegister(v: EnrichedVariable) {
    setIsEditing(true);
    form.reset({
      variableName: v.variableName,
      displayName: v.displayName || v.variableName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      category: v.mapperCategory || "",
      dataType: v.dataType || "text",
      isRequired: false,
      description: "",
    });
  }

  function onSubmit(formData: VariableFormValues) {
    if (selectedVariable?.id) {
      updateMutation.mutate({ id: selectedVariable.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-b">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Variable Registry</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage contract variables, track usage across clauses, exhibits, and components
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} data-testid="button-sync-mapper">
              <RefreshCw className={cn("h-4 w-4 mr-2", syncMutation.isPending && "animate-spin")} />
              Sync from Mapper{data ? ` (${data.mapperVariableCount})` : ""}
            </Button>
            <Button onClick={handleStartCreate} data-testid="button-add-variable">
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-3 px-4 py-2 border-b text-sm text-muted-foreground flex-wrap">
            <span>{stats.totalRegistered} registered</span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-amber-600">{stats.totalUnregistered} unregistered</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{orphanedCount} orphaned</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{stats.totalInMapper} in mapper</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{stats.usedInClauses} in clauses</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{stats.usedInExhibits} in exhibits</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{stats.usedInComponents} in components</span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[380px] min-w-[320px] border-r flex flex-col">
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search variables..."
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "unregistered", "orphaned"] as FilterTab[]).map((tab) => (
                  <Button
                    key={tab}
                    variant={filterTab === tab ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterTab(tab)}
                    data-testid={`button-filter-${tab}`}
                  >
                    {tab === "all" ? "All" : tab === "unregistered" ? "Unregistered" : "Orphaned"}
                  </Button>
                ))}
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : filteredVariables.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No variables match your filters.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredVariables.map((v) => {
                    const status = getStatus(v);
                    const isSelected = selectedVariable?.variableName === v.variableName;
                    return (
                      <div
                        key={v.variableName}
                        className={cn(
                          "flex items-center justify-between py-2 px-3 cursor-pointer",
                          isSelected ? "bg-accent" : "hover-elevate"
                        )}
                        onClick={() => handleSelectVariable(v)}
                        data-testid={`item-variable-${v.variableName}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-xs block truncate">{v.variableName}</span>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {(v.category || v.mapperCategory) && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{v.category || v.mapperCategory}</Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{v.totalUsageCount} uses</Badge>
                            {v.inMapper && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600">mapper</Badge>}
                          </div>
                        </div>
                        <StatusDot status={status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              {filteredVariables.length} variables shown
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {isEditing ? (
              <div className="p-6 max-w-2xl">
                <h2 className="text-lg font-semibold mb-4" data-testid="text-form-title">
                  {selectedVariable?.id ? "Edit Variable" : "Add Variable"}
                </h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="variableName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variable Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="CLIENT_LEGAL_NAME" className="font-mono" data-testid="input-variable-name" />
                          </FormControl>
                          {selectedVariable?.id && (
                            <p className="text-xs text-amber-600">Renaming will not update existing clause/exhibit content.</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Client Legal Name" data-testid="input-display-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dataType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-data-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DATA_TYPE_OPTIONS.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="isRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="input-is-required" />
                          </FormControl>
                          <FormLabel className="!mt-0">Required for contract generation</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : selectedVariable?.id ? "Update" : "Create"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            ) : selectedVariable ? (
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                  <div>
                    <h2 className="font-mono text-lg font-semibold" data-testid="text-variable-name">{selectedVariable.variableName}</h2>
                    {selectedVariable.displayName && (
                      <p className="text-muted-foreground mt-0.5">{selectedVariable.displayName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!selectedVariable.isRegistered && (
                      <Button variant="outline" size="sm" onClick={() => handleRegister(selectedVariable)} data-testid="button-register">
                        <Plus className="h-4 w-4 mr-1" />
                        Register
                      </Button>
                    )}
                    {selectedVariable.isRegistered && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleStartEdit(selectedVariable)} data-testid="button-edit">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteVariable(selectedVariable)} data-testid="button-delete">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p className="font-medium">{selectedVariable.category || selectedVariable.mapperCategory || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Type</span>
                    <p className="font-medium">{selectedVariable.dataType || "text"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Required</span>
                    <p className="font-medium">{selectedVariable.isRequired ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={getStatus(selectedVariable)} />
                      <span className="font-medium capitalize">{getStatus(selectedVariable)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">In Mapper</span>
                    <p className="font-medium flex items-center gap-1">
                      {selectedVariable.inMapper ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                      {selectedVariable.inMapper ? `Yes (${selectedVariable.mapperCategory})` : "No"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Usage</span>
                    <p className="font-medium">{selectedVariable.totalUsageCount} references</p>
                  </div>
                </div>

                {selectedVariable.description && (
                  <div className="mb-6 text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <p className="mt-0.5">{selectedVariable.description}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Collapsible open={clausesOpen} onOpenChange={setClausesOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium">
                      {clausesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <ScrollText className="h-4 w-4 text-muted-foreground" />
                      Clauses ({selectedVariable.clauseCount})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {selectedVariable.clauseUsage.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-6 py-1">Not used in any clauses</p>
                      ) : (
                        <div className="pl-6 space-y-1 pb-2">
                          {selectedVariable.clauseUsage.map((clause) => (
                            <div key={clause.id} className="flex items-center gap-2 py-1 text-sm">
                              <span className="font-mono text-xs text-muted-foreground">{clause.clauseCode}</span>
                              <span className="truncate flex-1">{clause.name}</span>
                              {clause.contractType?.map((t: string) => (
                                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={exhibitsOpen} onOpenChange={setExhibitsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium">
                      {exhibitsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Exhibits ({selectedVariable.exhibitCount})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {selectedVariable.exhibitUsage.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-6 py-1">Not used in any exhibits</p>
                      ) : (
                        <div className="pl-6 space-y-1 pb-2">
                          {selectedVariable.exhibitUsage.map((exhibit) => (
                            <div key={exhibit.id} className="flex items-center gap-2 py-1 text-sm">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Exhibit {exhibit.letter}</Badge>
                              <span className="truncate flex-1">{exhibit.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={componentsOpen} onOpenChange={setComponentsOpen}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium">
                      {componentsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Blocks className="h-4 w-4 text-muted-foreground" />
                      Components ({selectedVariable.componentCount})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {selectedVariable.componentUsage.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-6 py-1">Not used in any components</p>
                      ) : (
                        <div className="pl-6 space-y-1 pb-2">
                          {selectedVariable.componentUsage.map((comp) => (
                            <div key={comp.id} className="flex items-center gap-2 py-1 text-sm">
                              <span className="font-mono text-xs text-muted-foreground">{comp.tagName}</span>
                              <span className="truncate flex-1">{comp.description}</span>
                              {comp.serviceModel && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{comp.serviceModel}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a variable from the list to view details
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteVariable} onOpenChange={() => setDeleteVariable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-mono">{deleteVariable?.variableName}</span> from the registry?
              This will not remove it from clause or exhibit content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVariable?.id && deleteMutation.mutate(deleteVariable.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
