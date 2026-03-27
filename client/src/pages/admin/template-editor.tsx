import { useState, useMemo, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  ChevronRight, Search,
} from "lucide-react";
import { Link } from "wouter";

interface ContractTemplate {
  id: number;
  name: string;
  contract_type: string;
  version: string;
}

interface TemplateClause {
  id: number;
  clause_id: number;
  order_index: number;
  slug: string;
  header_text: string;
  level: number;
  parent_clause_id: number | null;
}

interface TemplateExhibit {
  id: number;
  exhibit_id: number;
  order_index: number;
  letter: string;
  title: string;
}

interface LibraryClause {
  id: number;
  clause_code: string;
  parent_clause_id: number | null;
  hierarchy_level: number;
  sort_order: number;
  header_text: string;
  body_html: string;
  contract_types: string[];
}

interface LibraryExhibit {
  id: number;
  letter: string;
  title: string;
  is_active: boolean;
}

type DialogFilter = "all" | "clauses" | "exhibits";

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<DialogFilter>("all");
  const [dialogSearch, setDialogSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Expand/collapse state for template section rows
  const [expandedTemplateNodes, setExpandedTemplateNodes] = useState<Set<number>>(new Set());

  // Drag state — shared ref, separate dragOver per section
  const dragIndexRef = useRef<number | null>(null);
  const [clauseDragOver, setClauseDragOver] = useState<number | null>(null);
  const [exhibitDragOver, setExhibitDragOver] = useState<number | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: template, isLoading: templateLoading } = useQuery<ContractTemplate>({
    queryKey: [`/api/contract-templates/${id}`],
  });

  const { data: templateClauses = [], isLoading: clausesLoading } = useQuery<TemplateClause[]>({
    queryKey: [`/api/contract-templates/${id}/clauses`],
  });

  const { data: templateExhibits = [], isLoading: exhibitsLoading } = useQuery<TemplateExhibit[]>({
    queryKey: [`/api/contract-templates/${id}/exhibits`],
  });

  const { data: allClausesData } = useQuery<{ clauses: LibraryClause[] }>({
    queryKey: [`/api/clauses`, template?.contract_type],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/clauses${template?.contract_type ? `?contractType=${template.contract_type}` : ""}`
      );
      return res.json();
    },
    enabled: !!template,
  });

  const { data: allExhibits = [] } = useQuery<LibraryExhibit[]>({
    queryKey: [`/api/exhibits`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/exhibits?includeInactive=false`);
      return res.json();
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addClauseMutation = useMutation({
    mutationFn: (clauseId: number) =>
      apiRequest("POST", `/api/contract-templates/${id}/clauses`, { clauseId }),
  });

  const removeClauseMutation = useMutation({
    mutationFn: (clauseId: number) =>
      apiRequest("DELETE", `/api/contract-templates/${id}/clauses/${clauseId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}/clauses`] }),
    onError: () => toast({ title: "Failed to remove clause", variant: "destructive" }),
  });

  const reorderClausesMutation = useMutation({
    mutationFn: (order: { clauseId: number; orderIndex: number }[]) =>
      apiRequest("PUT", `/api/contract-templates/${id}/clauses/reorder`, { order }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}/clauses`] }),
    onError: () => toast({ title: "Failed to reorder clauses", variant: "destructive" }),
  });

  const addExhibitMutation = useMutation({
    mutationFn: (exhibitId: number) =>
      apiRequest("POST", `/api/contract-templates/${id}/exhibits`, { exhibitId }),
  });

  const removeExhibitMutation = useMutation({
    mutationFn: (exhibitId: number) =>
      apiRequest("DELETE", `/api/contract-templates/${id}/exhibits/${exhibitId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}/exhibits`] }),
    onError: () => toast({ title: "Failed to remove exhibit", variant: "destructive" }),
  });

  const reorderExhibitsMutation = useMutation({
    mutationFn: (order: { exhibitId: number; orderIndex: number }[]) =>
      apiRequest("PUT", `/api/contract-templates/${id}/exhibits/reorder`, { order }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}/exhibits`] }),
    onError: () => toast({ title: "Failed to reorder exhibits", variant: "destructive" }),
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const linkedClauseIds = useMemo(
    () => new Set(templateClauses.map((c) => c.clause_id)),
    [templateClauses]
  );

  const linkedExhibitIds = useMemo(
    () => new Set(templateExhibits.map((e) => e.exhibit_id)),
    [templateExhibits]
  );

  // Root-level library clauses only (adding a parent cascades children)
  const rootLibraryClauses = useMemo(
    () =>
      (allClausesData?.clauses ?? [])
        .filter((c) => c.parent_clause_id === null)
        .sort((a, b) => a.sort_order - b.sort_order),
    [allClausesData]
  );

  // Root template clauses sorted by order_index
  const rootTemplateClauses = useMemo(
    () =>
      templateClauses
        .filter((c) => c.parent_clause_id === null)
        .sort((a, b) => a.order_index - b.order_index),
    [templateClauses]
  );

  // Children of each root clause, keyed by parent's clause_id
  const templateChildrenMap = useMemo(() => {
    const map = new Map<number, TemplateClause[]>();
    for (const c of templateClauses) {
      if (c.parent_clause_id !== null) {
        const arr = map.get(c.parent_clause_id) ?? [];
        arr.push(c);
        map.set(c.parent_clause_id, arr);
      }
    }
    return map;
  }, [templateClauses]);

  const sortedTemplateExhibits = useMemo(
    () => [...templateExhibits].sort((a, b) => a.order_index - b.order_index),
    [templateExhibits]
  );

  // Dialog filtered list
  const dialogItems = useMemo(() => {
    const q = dialogSearch.trim().toLowerCase();

    const clauses =
      dialogFilter !== "exhibits"
        ? rootLibraryClauses
            .filter(
              (c) =>
                !q ||
                c.header_text?.toLowerCase().includes(q) ||
                c.clause_code?.toLowerCase().includes(q)
            )
            .map((c) => ({ type: "clause" as const, id: c.id, label: c.header_text || c.clause_code }))
        : [];

    const exhibits =
      dialogFilter !== "clauses"
        ? allExhibits
            .filter(
              (e) =>
                !q ||
                e.title?.toLowerCase().includes(q) ||
                e.letter?.toLowerCase().includes(q)
            )
            .map((e) => ({
              type: "exhibit" as const,
              id: e.id,
              label: e.letter ? `Exhibit ${e.letter}: ${e.title}` : e.title,
            }))
        : [];

    return [...clauses, ...exhibits];
  }, [rootLibraryClauses, allExhibits, dialogFilter, dialogSearch]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const itemKey = (type: "clause" | "exhibit", id: number) => `${type}:${id}`;

  const toggleSelected = (key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openAddDialog = () => {
    setSelectedItems(new Set());
    setDialogSearch("");
    setDialogFilter("all");
    setIsAddDialogOpen(true);
  };

  const handleAddSelected = async () => {
    const clauseIds = Array.from(selectedItems)
      .filter((k) => k.startsWith("clause:"))
      .map((k) => parseInt(k.split(":")[1]));
    const exhibitIds = Array.from(selectedItems)
      .filter((k) => k.startsWith("exhibit:"))
      .map((k) => parseInt(k.split(":")[1]));

    if (clauseIds.length === 0 && exhibitIds.length === 0) return;

    setIsAdding(true);
    try {
      await Promise.all([
        ...clauseIds.map((id) => addClauseMutation.mutateAsync(id)),
        ...exhibitIds.map((id) => addExhibitMutation.mutateAsync(id)),
      ]);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [`/api/contract-templates/${id}/clauses`],
        }),
        queryClient.invalidateQueries({
          queryKey: [`/api/contract-templates/${id}/exhibits`],
        }),
      ]);
      const total = clauseIds.length + exhibitIds.length;
      toast({
        title: `${total} item${total !== 1 ? "s" : ""} added to template`,
      });
      setIsAddDialogOpen(false);
      setSelectedItems(new Set());
    } catch {
      toast({ title: "Some items failed to add", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTemplateNode = (clauseId: number) =>
    setExpandedTemplateNodes((prev) => {
      const next = new Set(prev);
      next.has(clauseId) ? next.delete(clauseId) : next.add(clauseId);
      return next;
    });

  // Build full reorder payload: roots get multiples of 100, children fill the gap
  const buildClauseReorderPayload = (newRoots: TemplateClause[]) =>
    newRoots.flatMap((root, i) => {
      const rootIdx = (i + 1) * 100;
      const children = (templateChildrenMap.get(root.clause_id) ?? []).sort(
        (a, b) => a.order_index - b.order_index
      );
      return [
        { clauseId: root.clause_id, orderIndex: rootIdx },
        ...children.map((child, j) => ({
          clauseId: child.clause_id,
          orderIndex: rootIdx + (j + 1) * 10,
        })),
      ];
    });

  const moveClause = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= rootTemplateClauses.length) return;
    const reordered = [...rootTemplateClauses];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    reorderClausesMutation.mutate(buildClauseReorderPayload(reordered));
  };

  const moveExhibit = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedTemplateExhibits.length) return;
    const reordered = [...sortedTemplateExhibits];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    reorderExhibitsMutation.mutate(
      reordered.map((e, i) => ({ exhibitId: e.exhibit_id, orderIndex: (i + 1) * 10 }))
    );
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleClauseDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleClauseDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setClauseDragOver(index);
  };

  const handleClauseDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setClauseDragOver(null);
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex === null || fromIndex === dropIndex) return;
    const reordered = [...rootTemplateClauses];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    reorderClausesMutation.mutate(buildClauseReorderPayload(reordered));
  };

  const handleExhibitDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleExhibitDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setExhibitDragOver(index);
  };

  const handleExhibitDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setExhibitDragOver(null);
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex === null || fromIndex === dropIndex) return;
    const reordered = [...sortedTemplateExhibits];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    reorderExhibitsMutation.mutate(
      reordered.map((e, i) => ({ exhibitId: e.exhibit_id, orderIndex: (i + 1) * 10 }))
    );
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setClauseDragOver(null);
    setExhibitDragOver(null);
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (templateLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!template) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Template not found.</p>
      </AdminLayout>
    );
  }

  const selectedCount = selectedItems.size;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/contract-templates">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-page-title">
                {template.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{template.contract_type.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground">v{template.version}</span>
              </div>
            </div>
          </div>
          <Button onClick={openAddDialog} data-testid="button-add-section">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* ── CLAUSES SECTION ── */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Clauses
              </span>
              <Badge variant="secondary">{rootTemplateClauses.length}</Badge>
            </div>
          </div>

          {clausesLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rootTemplateClauses.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No clauses added yet. Click "Add Section" to get started.
            </p>
          ) : (
            rootTemplateClauses.map((clause, index) => {
              const children = (templateChildrenMap.get(clause.clause_id) ?? []).sort(
                (a, b) => a.order_index - b.order_index
              );
              const isExpanded = expandedTemplateNodes.has(clause.clause_id);
              const isDragOver = clauseDragOver === index;

              return (
                <div key={clause.id}>
                  <div
                    draggable
                    onDragStart={() => handleClauseDragStart(index)}
                    onDragOver={(e) => handleClauseDragOver(e, index)}
                    onDrop={(e) => handleClauseDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-colors ${
                      isDragOver ? "bg-primary/10" : ""
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    {children.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleTemplateNode(clause.clause_id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : (
                      <div className="w-3.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {clause.header_text || clause.slug}
                      </p>
                      {children.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {children.length} sub-clause{children.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveClause(index, "up")}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={index === rootTemplateClauses.length - 1}
                        onClick={() => moveClause(index, "down")}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeClauseMutation.mutate(clause.clause_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded &&
                    children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center gap-3 py-2 border-b last:border-0 bg-muted/20"
                        style={{ paddingLeft: "56px", paddingRight: "16px" }}
                      >
                        <p className="text-sm text-muted-foreground truncate">
                          {child.header_text || child.slug}
                        </p>
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>

        {/* ── EXHIBITS SECTION ── */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Exhibits
              </span>
              <Badge variant="secondary">{sortedTemplateExhibits.length}</Badge>
            </div>
          </div>

          {exhibitsLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedTemplateExhibits.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No exhibits added yet. Click "Add Section" to get started.
            </p>
          ) : (
            sortedTemplateExhibits.map((exhibit, index) => {
              const isDragOver = exhibitDragOver === index;
              return (
                <div
                  key={exhibit.id}
                  draggable
                  onDragStart={() => handleExhibitDragStart(index)}
                  onDragOver={(e) => handleExhibitDragOver(e, index)}
                  onDrop={(e) => handleExhibitDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-colors ${
                    isDragOver ? "bg-primary/10" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {exhibit.letter ? `Exhibit ${exhibit.letter}: ` : ""}
                      {exhibit.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveExhibit(index, "up")}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === sortedTemplateExhibits.length - 1}
                      onClick={() => moveExhibit(index, "down")}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeExhibitMutation.mutate(exhibit.exhibit_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── ADD SECTION DIALOG ── */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add to Template</DialogTitle>
          </DialogHeader>

          {/* Filter tabs */}
          <div className="flex gap-1 border-b pb-3">
            {(["all", "clauses", "exhibits"] as DialogFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDialogFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                  dialogFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {dialogItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No items found.</p>
            ) : (
              <div className="space-y-0.5 py-1">
                {dialogItems.map((item) => {
                  const key = itemKey(item.type, item.id);
                  const alreadyAdded =
                    item.type === "clause"
                      ? linkedClauseIds.has(item.id)
                      : linkedExhibitIds.has(item.id);
                  const checked = alreadyAdded || selectedItems.has(key);

                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 px-2 py-2.5 rounded-md cursor-pointer transition-colors ${
                        alreadyAdded
                          ? "opacity-50 cursor-default"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={alreadyAdded}
                        onCheckedChange={() => !alreadyAdded && toggleSelected(key)}
                      />
                      <span className="flex-1 text-sm truncate">{item.label}</span>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0 capitalize"
                      >
                        {item.type}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-2">
            <span className="text-sm text-muted-foreground mr-auto">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : "Select items to add"}
            </span>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedCount === 0 || isAdding}
              onClick={handleAddSelected}
            >
              {isAdding ? "Adding..." : `Add${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
