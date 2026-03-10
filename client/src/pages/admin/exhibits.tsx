import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContractTypePicker } from "@/components/ui/contract-type-picker";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { HtmlEditor } from "@/components/ui/html-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { VariablePreview } from "@/components/ui/variable-preview";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Code,
  Edit,
  Eye,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

interface Exhibit {
  id: number;
  letter: string;
  title: string;
  content: string;
  is_dynamic: boolean;
  disclosure_code: string | null;
  contract_types: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

const CONTRACT_TYPES = [
  { value: "MASTER_EF", label: "Master EF" },
  { value: "ONE", label: "ONE" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "ONSITE", label: "OnSite" },
];

const EXHIBIT_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export default function ExhibitsPage() {
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<Partial<Exhibit>>({});
  const [editorMode, setEditorMode] = useState<"visual" | "source">("source");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterContractType, setFilterContractType] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<Exhibit | null>(null);
  const { toast } = useToast();

  const { data: exhibits, isLoading } = useQuery<Exhibit[]>({
    queryKey: ["/api/exhibits", "includeInactive"],
    queryFn: async () => {
      const res = await fetch("/api/exhibits?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch exhibits");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Record<string, any> }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/exhibits/${data.id}`,
        data.updates
      );
      return response.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/exhibits", "includeInactive"],
      });
      setIsEditing(false);
      setSelectedExhibit(updated);
      toast({ title: "Exhibit updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update exhibit", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest("POST", "/api/exhibits", data);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/exhibits", "includeInactive"],
      });
      setIsCreating(false);
      setIsEditing(false);
      setSelectedExhibit(created);
      setEditData({});
      toast({ title: "Exhibit created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create exhibit", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/exhibits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/exhibits", "includeInactive"],
      });
      setSelectedExhibit(null);
      setDeleteTarget(null);
      setIsEditing(false);
      toast({ title: "Exhibit deactivated" });
    },
    onError: () => {
      toast({ title: "Failed to delete exhibit", variant: "destructive" });
    },
  });

  const startEditing = (exhibit: Exhibit) => {
    setEditData({
      letter: exhibit.letter,
      title: exhibit.title,
      content: exhibit.content,
      is_dynamic: exhibit.is_dynamic,
      disclosure_code: exhibit.disclosure_code,
      contract_types: exhibit.contract_types,
      sort_order: exhibit.sort_order,
      is_active: exhibit.is_active,
    });
    setIsEditing(true);
    setIsCreating(false);
    setEditorMode("source");
  };

  const startCreating = () => {
    setEditData({
      letter: "A",
      title: "",
      content: "",
      is_dynamic: false,
      disclosure_code: null,
      contract_types: ["MASTER_EF"],
      sort_order: (exhibits?.length || 0) + 1,
      is_active: true,
    });
    setSelectedExhibit(null);
    setIsCreating(true);
    setIsEditing(true);
    setEditorMode("source");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditData({});
  };

  const handleSave = () => {
    const payload = {
      letter: editData.letter,
      title: editData.title,
      content: editData.content,
      contractTypes: editData.contract_types,
      sortOrder: editData.sort_order,
      isDynamic: editData.is_dynamic,
      disclosureCode: editData.disclosure_code,
      isActive: editData.is_active,
    };

    if (isCreating) {
      createMutation.mutate(payload);
    } else if (selectedExhibit) {
      updateMutation.mutate({ id: selectedExhibit.id, updates: payload });
    }
  };

  const filteredExhibits = useMemo(() => {
    if (!exhibits) return [];
    return exhibits.filter((ex) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (
          !ex.letter?.toLowerCase().includes(s) &&
          !ex.title?.toLowerCase().includes(s)
        )
          return false;
      }
      if (filterContractType !== "ALL") {
        if (!ex.contract_types?.includes(filterContractType)) return false;
      }
      return true;
    });
  }, [exhibits, searchTerm, filterContractType]);

  const previewContent = useMemo(() => {
    if (isEditing) return editData.content || "";
    if (selectedExhibit) return selectedExhibit.content || "";
    return "";
  }, [isEditing, editData.content, selectedExhibit]);

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-[30%] space-y-2 border-r p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
        data-testid="exhibits-page"
      >
        <ResizablePanel defaultSize={30} minSize={15}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex-shrink-0 space-y-2 border-b p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold" data-testid="text-page-title">
                  Exhibit Library
                </h2>
                <Button
                  size="sm"
                  onClick={startCreating}
                  data-testid="button-create-exhibit">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  New
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search exhibits..."
                  className="pl-8"
                  data-testid="input-search-exhibits"
                />
              </div>
              <Select
                value={filterContractType}
                onValueChange={setFilterContractType}>
                <SelectTrigger data-testid="select-filter-contract-type">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Contract Types</SelectItem>
                  {CONTRACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {filteredExhibits.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No exhibits found
                  </div>
                ) : (
                  filteredExhibits.map((exhibit) => (
                    <button
                      key={exhibit.id}
                      onClick={() => {
                        if (isEditing && !isCreating) cancelEditing();
                        setSelectedExhibit(exhibit);
                        setIsCreating(false);
                      }}
                      className={`w-full rounded-md p-2.5 text-left transition-colors ${
                        selectedExhibit?.id === exhibit.id && !isCreating
                          ? "bg-accent"
                          : "hover-elevate"
                      } ${!exhibit.is_active ? "opacity-50" : ""}`}
                      data-testid={`button-exhibit-${exhibit.id}`}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="flex-shrink-0 font-mono text-xs">
                          {exhibit.letter}
                        </Badge>
                        <span className="truncate text-sm font-medium">
                          {exhibit.title}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {exhibit.contract_types?.map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="py-0 text-[10px]">
                            {type}
                          </Badge>
                        ))}
                        {exhibit.is_dynamic && (
                          <Badge variant="secondary" className="py-0 text-[10px]">
                            <Zap className="mr-0.5 h-2.5 w-2.5" />
                            Dynamic
                          </Badge>
                        )}
                        {!exhibit.is_active && (
                          <Badge variant="destructive" className="py-0 text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel className="flex flex-col">
          {selectedExhibit || isCreating ? (
            <>
              <div className="flex-shrink-0 border-b p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isCreating ? (
                      <h3 className="text-base font-semibold">New Exhibit</h3>
                    ) : (
                      <>
                        <Badge
                          variant="outline"
                          className="flex-shrink-0 font-mono text-base">
                          {selectedExhibit!.letter}
                        </Badge>
                        <h3 className="truncate text-base font-semibold">
                          {selectedExhibit!.title}
                        </h3>
                        {selectedExhibit!.is_dynamic && (
                          <Badge variant="secondary" className="flex-shrink-0">
                            <Zap className="mr-1 h-3 w-3" />
                            Dynamic
                          </Badge>
                        )}
                        {!selectedExhibit!.is_active && (
                          <Badge variant="destructive" className="flex-shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditing}
                          data-testid="button-cancel-edit">
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={
                            updateMutation.isPending || createMutation.isPending
                          }
                          data-testid="button-save-exhibit">
                          <Save className="mr-1 h-4 w-4" />
                          {updateMutation.isPending || createMutation.isPending
                            ? "Saving..."
                            : "Save"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(selectedExhibit)}
                          data-testid="button-delete-exhibit">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(selectedExhibit!)}
                          data-testid="button-edit-exhibit">
                          <Edit className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!isEditing && selectedExhibit && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {selectedExhibit.contract_types?.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {selectedExhibit.disclosure_code && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {selectedExhibit.disclosure_code}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <ResizablePanelGroup direction="vertical" className="flex-1">
                  <ResizablePanel defaultSize={55}>
                    <div className="h-full overflow-auto">
                      <div className="space-y-4 p-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Letter</Label>
                            <Select
                              value={editData.letter || "A"}
                              onValueChange={(v) =>
                                setEditData({ ...editData, letter: v })
                              }>
                              <SelectTrigger data-testid="select-exhibit-letter">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EXHIBIT_LETTERS.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    Exhibit {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Title</Label>
                            <Input
                              value={editData.title || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  title: e.target.value,
                                })
                              }
                              placeholder="Exhibit title"
                              data-testid="input-exhibit-title"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sort Order</Label>
                            <Input
                              type="number"
                              value={editData.sort_order || 0}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  sort_order: parseInt(e.target.value) || 0,
                                })
                              }
                              data-testid="input-sort-order"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Contract Types</Label>
                            <ContractTypePicker
                              options={CONTRACT_TYPES}
                              value={editData.contract_types}
                              onChange={(types) =>
                                setEditData({ ...editData, contract_types: types })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-active"
                              checked={editData.is_active !== false}
                              onCheckedChange={(v) =>
                                setEditData({ ...editData, is_active: v })
                              }
                              data-testid="switch-is-active"
                            />
                            <Label htmlFor="edit-active" className="text-xs">
                              Active
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="edit-dynamic"
                              checked={editData.is_dynamic || false}
                              onCheckedChange={(v) =>
                                setEditData({ ...editData, is_dynamic: v })
                              }
                              data-testid="switch-is-dynamic"
                            />
                            <Label htmlFor="edit-dynamic" className="text-xs">
                              Dynamic
                            </Label>
                          </div>
                        </div>

                        {editData.is_dynamic && (
                          <div className="space-y-1">
                            <Label className="text-xs">Disclosure Code</Label>
                            <Input
                              value={editData.disclosure_code || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  disclosure_code: e.target.value || null,
                                })
                              }
                              placeholder="e.g., WARRANTY_EXCLUSIVITY"
                              data-testid="input-disclosure-code"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs">Content</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant={editorMode === "visual" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setEditorMode("visual")}
                                data-testid="button-visual-mode">
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                Visual
                              </Button>
                              <Button
                                variant={editorMode === "source" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setEditorMode("source")}
                                data-testid="button-source-mode">
                                <Code className="mr-1 h-3.5 w-3.5" />
                                Source
                              </Button>
                            </div>
                          </div>
                          <HtmlEditor
                            value={editData.content || ""}
                            onChange={(html) =>
                              setEditData({ ...editData, content: html })
                            }
                            mode={editorMode}
                            placeholder="Enter exhibit content (HTML). Use {{VARIABLE_NAME}} for dynamic values."
                            data-testid="textarea-exhibit-content"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {editorMode === "source"
                              ? `Supports HTML and variable placeholders like ${"{{PRICING_BREAKDOWN_TABLE}}"} or ${"{{PROJECT_STATE}}"}`
                              : "Use Source mode to edit HTML tables and variable tags directly"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>

                  <ResizableHandle />

                  <ResizablePanel defaultSize={45}>
                    <div className="flex h-full flex-col">
                      <div className="flex-shrink-0 border-b bg-muted/30 p-2">
                        <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          Live Preview
                        </h3>
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto p-4">
                        <VariablePreview
                          html={previewContent}
                          data-testid="exhibit-live-preview"
                        />
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="flex-1 overflow-auto p-4">
                  <VariablePreview
                    html={previewContent}
                    data-testid="exhibit-preview"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-30" />
                <p className="text-lg">Select an exhibit</p>
                <p className="mt-1 text-sm">
                  Click on an exhibit from the list to view and edit
                </p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Deactivate Exhibit?"
        description={`This will deactivate Exhibit ${deleteTarget?.letter} - ${deleteTarget?.title}. It will no longer appear in generated contracts but can be reactivated later.`}
        actionLabel="Deactivate"
        actionClassName="bg-destructive text-destructive-foreground"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
