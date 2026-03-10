import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Code,
  Box,
  Layers,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Edit,
  Table,
  FileCode,
  Copy,
  ChevronRight,
  ChevronDown,
  Database,
  Save,
  ToggleLeft,
  Power,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComponentRow {
  id: number;
  tag_name: string;
  content: string;
  description: string | null;
  service_model: string | null;
  is_system: boolean;
  is_active: boolean;
}

interface BuiltinTable {
  id: string;
  variableName: string;
  displayName: string;
  description: string;
  columns: string[];
  icon: React.ReactNode;
}

type SelectedItem =
  | { type: "block"; data: ComponentRow }
  | { type: "table"; data: ComponentRow }
  | { type: "builtin"; data: BuiltinTable };

const BUILTIN_TABLES: BuiltinTable[] = [
  {
    id: "pricing_breakdown",
    variableName: "{{PRICING_BREAKDOWN_TABLE}}",
    displayName: "Pricing Breakdown Table",
    description: "Displays the itemized pricing breakdown including base price, customizations, and totals.",
    columns: ["Item", "Description", "Amount"],
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    id: "payment_schedule",
    variableName: "{{PAYMENT_SCHEDULE_TABLE}}",
    displayName: "Payment Schedule Table",
    description: "Shows the milestone-based payment schedule with dates and amounts.",
    columns: ["Milestone", "Due Date", "Percentage", "Amount"],
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "unit_spec",
    variableName: "{{UNIT_SPEC_TABLE}}",
    displayName: "Unit Specification Table",
    description: "Lists all home units with their model, specifications, and pricing.",
    columns: ["Unit", "Model", "Bed/Bath", "Sq Ft", "Base Price", "Customizations", "Total"],
    icon: <Layers className="h-4 w-4" />,
  },
];

const componentFormSchema = z.object({
  tagName: z.string().min(1, "Tag name is required").regex(/^(BLOCK|TABLE)_[A-Z0-9_.]+$/, "Tag name must start with BLOCK_ or TABLE_ and contain only uppercase letters, numbers, underscores, and dots"),
  content: z.string().min(1, "Content is required"),
  description: z.string().optional(),
  serviceModel: z.string().optional(),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

function groupBlocksByTagName(blocks: ComponentRow[]): Map<string, ComponentRow[]> {
  const grouped = new Map<string, ComponentRow[]>();
  for (const block of blocks) {
    const existing = grouped.get(block.tag_name) || [];
    existing.push(block);
    grouped.set(block.tag_name, existing);
  }
  return grouped;
}

export default function ComponentLibrary() {
  const { toast } = useToast();

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [blocksExpanded, setBlocksExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [builtinExpanded, setBuiltinExpanded] = useState(true);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentRow | null>(null);
  const [deleteComponent, setDeleteComponent] = useState<ComponentRow | null>(null);

  const { data: projects } = useQuery<{ id: number; project_number: string; name: string; status: string }[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allComponents, isLoading: componentsLoading } = useQuery<ComponentRow[]>({
    queryKey: ["/api/components"],
  });

  const blockComponents = allComponents?.filter(c => c.tag_name.startsWith("BLOCK_")) || [];
  const tableComponents = allComponents?.filter(c => c.tag_name.startsWith("TABLE_")) || [];
  const groupedBlocks = groupBlocksByTagName(blockComponents);
  const uniqueBlockTagNames = new Set(blockComponents.map(b => b.tag_name));

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      tagName: "",
      content: "",
      description: "",
      serviceModel: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ComponentFormValues) => {
      return apiRequest("POST", "/api/components", {
        tagName: data.tagName,
        content: data.content,
        description: data.description || null,
        serviceModel: data.serviceModel || null,
        isSystem: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
      setIsFormDialogOpen(false);
      form.reset();
      toast({ title: "Component created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create component", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ComponentFormValues }) => {
      return apiRequest("PUT", `/api/components/${id}`, {
        tagName: data.tagName,
        content: data.content,
        description: data.description || null,
        serviceModel: data.serviceModel || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
      setIsFormDialogOpen(false);
      setEditingComponent(null);
      form.reset();
      toast({ title: "Component updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update component", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/components/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
      if (selectedItem && selectedItem.type !== "builtin" && selectedItem.data.id === deleteComponent?.id) {
        setSelectedItem(null);
      }
      setDeleteComponent(null);
      toast({ title: "Component deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete component", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/components/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
      toast({ title: "Component status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const { data: builtinPreview, isLoading: previewLoading } = useQuery<{ html: string }>({
    queryKey: ["/api/components/preview", selectedItem?.type === "builtin" ? selectedItem.data.id : "", selectedProjectId],
    queryFn: async () => {
      if (selectedItem?.type !== "builtin" || !selectedProjectId) return { html: "" };
      const response = await fetch(`/api/components/preview/${selectedItem.data.id}?projectId=${selectedProjectId}`);
      if (!response.ok) throw new Error("Failed to fetch preview");
      return response.json();
    },
    enabled: selectedItem?.type === "builtin" && !!selectedProjectId,
  });

  const isDbComponent = selectedItem?.type === "table" || selectedItem?.type === "block";
  const { data: resolvedPreview, isLoading: resolvedPreviewLoading } = useQuery<{ html: string }>({
    queryKey: ["/api/components/preview-resolved", isDbComponent ? selectedItem.data.id : "", selectedProjectId],
    queryFn: async () => {
      if (!isDbComponent || !selectedProjectId) return { html: "" };
      const response = await fetch(`/api/components/preview-resolved/${selectedItem.data.id}?projectId=${selectedProjectId}`);
      if (!response.ok) throw new Error("Failed to fetch resolved preview");
      return response.json();
    },
    enabled: isDbComponent && !!selectedProjectId,
  });

  const openCreateDialog = (prefix: "BLOCK" | "TABLE") => {
    setEditingComponent(null);
    form.reset({ tagName: `${prefix}_`, content: "", description: "", serviceModel: "" });
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (component: ComponentRow) => {
    setEditingComponent(component);
    form.reset({
      tagName: component.tag_name,
      content: component.content,
      description: component.description || "",
      serviceModel: component.service_model || "",
    });
    setIsFormDialogOpen(true);
  };

  const openDuplicateDialog = (component: ComponentRow) => {
    setEditingComponent(null);
    form.reset({
      tagName: component.tag_name,
      content: component.content,
      description: component.description || "",
      serviceModel: component.service_model === "CRC" ? "CMOS" : "CRC",
    });
    setIsFormDialogOpen(true);
  };

  const handleFormSubmit = (values: ComponentFormValues) => {
    if (editingComponent) {
      updateMutation.mutate({ id: editingComponent.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getServiceModelBadge = (items: ComponentRow[]) => {
    const models = items.map(i => i.service_model).filter(Boolean);
    if (models.length === 0) return "ALL";
    if (models.length === 1) return models[0];
    return models.join("/");
  };

  const isBlockSelected = (tagName: string) => {
    if (!selectedItem || selectedItem.type !== "block") return false;
    return selectedItem.data.tag_name === tagName;
  };

  const isTableSelected = (id: number) => {
    if (!selectedItem || selectedItem.type !== "table") return false;
    return selectedItem.data.id === id;
  };

  const isBuiltinSelected = (id: string) => {
    if (!selectedItem || selectedItem.type !== "builtin") return false;
    return selectedItem.data.id === id;
  };

  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3" data-testid="empty-state">
          <Box className="h-12 w-12 opacity-30" />
          <p className="text-sm">Select a component to view details</p>
        </div>
      );
    }

    if (selectedItem.type === "block") {
      const comp = selectedItem.data;
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-2 flex-wrap p-4 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold" data-testid="detail-tag-name">{comp.tag_name}</h2>
              {comp.service_model && <Badge variant="secondary" data-testid="detail-service-model">{comp.service_model}</Badge>}
              {comp.is_system && <Badge variant="outline" data-testid="detail-system-badge">System</Badge>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px]" data-testid="select-project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)} data-testid={`project-option-${p.id}`}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!comp.is_system && (
                <>
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(comp)} data-testid="button-edit-component">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openDuplicateDialog(comp)} data-testid="button-duplicate-component">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteComponent(comp)} data-testid="button-delete-component">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {comp.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1" data-testid="detail-description">{comp.description}</p>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">HTML Content</Label>
                </div>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap" data-testid="detail-code-block">
                  {comp.content}
                </pre>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Rendered Preview</Label>
                </div>
                {selectedProjectId && resolvedPreviewLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : selectedProjectId && resolvedPreview?.html ? (
                  <div
                    className="border rounded-md p-4 bg-white"
                    data-testid="detail-preview"
                    dangerouslySetInnerHTML={{ __html: resolvedPreview.html }}
                  />
                ) : (
                  <div
                    className="border rounded-md p-4 bg-white"
                    data-testid="detail-preview"
                    dangerouslySetInnerHTML={{ __html: comp.content }}
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (selectedItem.type === "table") {
      const comp = selectedItem.data;
      const freshComp = allComponents?.find(c => c.id === comp.id) || comp;
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-2 flex-wrap p-4 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold" data-testid="detail-tag-name">{freshComp.tag_name}</h2>
              {freshComp.is_system && <Badge variant="outline" data-testid="detail-system-badge">System</Badge>}
              {!freshComp.is_system && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch
                    checked={freshComp.is_active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: freshComp.id, isActive: checked })}
                    data-testid="toggle-active"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px]" data-testid="select-project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)} data-testid={`project-option-${p.id}`}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!freshComp.is_system && (
                <>
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(freshComp)} data-testid="button-edit-component">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteComponent(freshComp)} data-testid="button-delete-component">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {freshComp.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1" data-testid="detail-description">{freshComp.description}</p>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">HTML Content</Label>
                </div>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap" data-testid="detail-code-block">
                  {freshComp.content}
                </pre>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Rendered Preview</Label>
                </div>
                {!selectedProjectId ? (
                  <div
                    className="border rounded-md p-4 bg-white"
                    data-testid="detail-preview"
                    dangerouslySetInnerHTML={{ __html: freshComp.content }}
                  />
                ) : resolvedPreviewLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : resolvedPreview?.html ? (
                  <div
                    className="border rounded-md p-4 bg-white"
                    data-testid="detail-preview"
                    dangerouslySetInnerHTML={{ __html: resolvedPreview.html }}
                  />
                ) : (
                  <div
                    className="border rounded-md p-4 bg-white"
                    data-testid="detail-preview"
                    dangerouslySetInnerHTML={{ __html: freshComp.content }}
                  />
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (selectedItem.type === "builtin") {
      const item = selectedItem.data;
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-2 flex-wrap p-4 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              {item.icon}
              <h2 className="text-lg font-semibold" data-testid="detail-tag-name">{item.displayName}</h2>
              <Badge variant="outline">Data-Driven</Badge>
            </div>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]" data-testid="select-project">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} data-testid={`project-option-${p.id}`}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Variable Name</Label>
                <p className="text-sm font-mono mt-1" data-testid="detail-variable-name">{item.variableName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1" data-testid="detail-description">{item.description}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Columns</Label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {item.columns.map(col => (
                    <Badge key={col} variant="secondary">{col}</Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Live Preview</Label>
                </div>
                {!selectedProjectId ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="preview-no-project">
                    Select a project to preview live data
                  </p>
                ) : previewLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : builtinPreview?.html ? (
                  <div
                    className="border rounded-md p-4 bg-white"
                    data-testid="detail-preview"
                    dangerouslySetInnerHTML={{ __html: builtinPreview.html }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No preview available</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      );
    }

    return null;
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full" data-testid="component-library-page">
      <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
        <div className="h-full flex flex-col bg-muted/30">
          <div className="p-4 border-b bg-background">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Box className="h-5 w-5" />
              Component Library
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage block components and table templates
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              <div className="mb-4">
                <button
                  onClick={() => setBlocksExpanded(!blocksExpanded)}
                  className="flex items-center justify-between gap-2 w-full p-2 rounded hover-elevate"
                  data-testid="toggle-blocks-section"
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    {blocksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <FileCode className="h-4 w-4" />
                    Text Blocks
                  </span>
                  <Badge variant="secondary">{uniqueBlockTagNames.size}</Badge>
                </button>

                {blocksExpanded && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {componentsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1" />)
                    ) : (
                      <>
                        {Array.from(groupedBlocks.entries()).map(([tagName, items]) => (
                          <button
                            key={tagName}
                            onClick={() => setSelectedItem({ type: "block", data: items[0] })}
                            className={`flex items-center justify-between gap-2 w-full p-2 rounded text-sm hover-elevate ${isBlockSelected(tagName) ? "bg-primary/10" : ""}`}
                            data-testid={`sidebar-block-${tagName}`}
                          >
                            <span className="truncate text-left">{tagName}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {getServiceModelBadge(items)}
                            </Badge>
                          </button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 mt-1"
                          onClick={() => openCreateDialog("BLOCK")}
                          data-testid="button-add-block"
                        >
                          <Plus className="h-4 w-4" />
                          Add Block Component
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              <div className="mb-4">
                <button
                  onClick={() => setTablesExpanded(!tablesExpanded)}
                  className="flex items-center justify-between gap-2 w-full p-2 rounded hover-elevate"
                  data-testid="toggle-tables-section"
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    {tablesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Table className="h-4 w-4" />
                    Table Components
                  </span>
                  <Badge variant="secondary">{tableComponents.length}</Badge>
                </button>

                {tablesExpanded && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {componentsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1" />)
                    ) : (
                      <>
                        {tableComponents.map(comp => (
                          <button
                            key={comp.id}
                            onClick={() => setSelectedItem({ type: "table", data: comp })}
                            className={`flex items-center justify-between gap-2 w-full p-2 rounded text-sm hover-elevate ${isTableSelected(comp.id) ? "bg-primary/10" : ""}`}
                            data-testid={`sidebar-table-${comp.id}`}
                          >
                            <span className="truncate text-left flex items-center gap-1.5">
                              {!comp.is_active && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />}
                              {comp.tag_name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {comp.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                            </div>
                          </button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 mt-1"
                          onClick={() => openCreateDialog("TABLE")}
                          data-testid="button-add-table"
                        >
                          <Plus className="h-4 w-4" />
                          Add Table Component
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              <div className="mb-4">
                <button
                  onClick={() => setBuiltinExpanded(!builtinExpanded)}
                  className="flex items-center justify-between gap-2 w-full p-2 rounded hover-elevate"
                  data-testid="toggle-builtin-section"
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    {builtinExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Database className="h-4 w-4" />
                    Data-Driven Tables
                  </span>
                  <Badge variant="outline">{BUILTIN_TABLES.length}</Badge>
                </button>

                {builtinExpanded && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {BUILTIN_TABLES.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem({ type: "builtin", data: item })}
                        className={`flex items-center gap-2 w-full p-2 rounded text-sm hover-elevate ${isBuiltinSelected(item.id) ? "bg-primary/10" : ""}`}
                        data-testid={`sidebar-builtin-${item.id}`}
                      >
                        {item.icon}
                        <span className="truncate text-left">{item.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={75}>
        <div className="h-full bg-background">
          {renderDetailPanel()}
        </div>
      </ResizablePanel>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="component-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingComponent ? "Edit Component" : "Create Component"}</DialogTitle>
            <DialogDescription>
              {editingComponent ? "Update the component details below." : "Fill in the details to create a new component."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tagName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Name</FormLabel>
                    <FormControl>
                      <Input placeholder="BLOCK_MY_COMPONENT or TABLE_MY_TABLE" {...field} data-testid="input-tag-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Model</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val === "none" ? "" : val)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-model">
                          <SelectValue placeholder="None (applies to all)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (applies to all)</SelectItem>
                        <SelectItem value="CRC">CRC</SelectItem>
                        <SelectItem value="CMOS">CMOS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                      <Input placeholder="Optional description" {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (HTML)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="<p>Your HTML content here...</p>"
                        className="min-h-[200px] font-mono text-xs"
                        {...field}
                        data-testid="textarea-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} data-testid="button-cancel-form">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-form">
                  <Save className="h-4 w-4 mr-2" />
                  {editingComponent ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteComponent}
        onOpenChange={(open) => !open && setDeleteComponent(null)}
        title="Delete Component"
        description={`Are you sure you want to delete "${deleteComponent?.tag_name}"? This action cannot be undone.`}
        onConfirm={() => deleteComponent && deleteMutation.mutate(deleteComponent.id)}
      />
    </ResizablePanelGroup>
  );
}
