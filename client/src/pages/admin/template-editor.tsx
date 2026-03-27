import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  ChevronRight, Search, Save,
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

interface DraftClause {
  clause_id: number;
  header_text: string;
  slug: string;
}

interface DraftExhibit {
  exhibit_id: number;
  letter: string;
  title: string;
}

type DialogFilter = "all" | "clauses" | "exhibits";

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Draft state — null means "not yet initialized from server"
  const [draftClauses, setDraftClauses] = useState<DraftClause[] | null>(null);
  const [draftExhibits, setDraftExhibits] = useState<DraftExhibit[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<DialogFilter>("all");
  const [dialogSearch, setDialogSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Expand/collapse for template rows
  const [expandedTemplateNodes, setExpandedTemplateNodes] = useState<Set<number>>(new Set());

  // Drag state
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

  // ── Server-derived data (source of truth for diffs) ───────────────────────

  const rootTemplateClauses = useMemo(
    () =>
      templateClauses
        .filter((c) => c.parent_clause_id === null)
        .sort((a, b) => a.order_index - b.order_index),
    [templateClauses]
  );

  const sortedTemplateExhibits = useMemo(
    () => [...templateExhibits].sort((a, b) => a.order_index - b.order_index),
    [templateExhibits]
  );

  // ── Draft initialization ──────────────────────────────────────────────────

  useEffect(() => {
    if (draftClauses === null && !clausesLoading) {
      setDraftClauses(
        rootTemplateClauses.map((c) => ({
          clause_id: c.clause_id,
          header_text: c.header_text,
          slug: c.slug,
        }))
      );
    }
  }, [rootTemplateClauses, clausesLoading, draftClauses]);

  useEffect(() => {
    if (draftExhibits === null && !exhibitsLoading) {
      setDraftExhibits(
        sortedTemplateExhibits.map((e) => ({
          exhibit_id: e.exhibit_id,
          letter: e.letter,
          title: e.title,
        }))
      );
    }
  }, [sortedTemplateExhibits, exhibitsLoading, draftExhibits]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Read from draft so dialog shows pending additions as already-added
  const linkedClauseIds = useMemo(
    () => new Set((draftClauses ?? []).map((c) => c.clause_id)),
    [draftClauses]
  );

  const linkedExhibitIds = useMemo(
    () => new Set((draftExhibits ?? []).map((e) => e.exhibit_id)),
    [draftExhibits]
  );

  const isDirty = useMemo(() => {
    if (!draftClauses || !draftExhibits) return false;
    const serverC = rootTemplateClauses.map((c) => c.clause_id).join(",");
    const draftC = draftClauses.map((c) => c.clause_id).join(",");
    const serverE = sortedTemplateExhibits.map((e) => e.exhibit_id).join(",");
    const draftE = draftExhibits.map((e) => e.exhibit_id).join(",");
    return serverC !== draftC || serverE !== draftE;
  }, [draftClauses, draftExhibits, rootTemplateClauses, sortedTemplateExhibits]);

  // Children from library data (for display in right panel)
  const getLibraryChildren = useCallback(
    (clauseId: number): LibraryClause[] =>
      (allClausesData?.clauses ?? [])
        .filter((c) => c.parent_clause_id === clauseId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [allClausesData]
  );

  // Root library clauses for the dialog
  const rootLibraryClauses = useMemo(
    () =>
      (allClausesData?.clauses ?? [])
        .filter((c) => c.parent_clause_id === null)
        .sort((a, b) => a.sort_order - b.sort_order),
    [allClausesData]
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
            .map((c) => ({
              type: "clause" as const,
              id: c.id,
              label: c.header_text || c.clause_code,
            }))
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

  const toggleTemplateNode = (clauseId: number) =>
    setExpandedTemplateNodes((prev) => {
      const next = new Set(prev);
      next.has(clauseId) ? next.delete(clauseId) : next.add(clauseId);
      return next;
    });

  // ── Handlers (local state only — no API calls) ────────────────────────────

  const handleAddSelected = () => {
    const clauseLibIds = Array.from(selectedItems)
      .filter((k) => k.startsWith("clause:"))
      .map((k) => parseInt(k.split(":")[1]));
    const exhibitLibIds = Array.from(selectedItems)
      .filter((k) => k.startsWith("exhibit:"))
      .map((k) => parseInt(k.split(":")[1]));

    if (clauseLibIds.length > 0) {
      const newClauses = clauseLibIds.flatMap((libId) => {
        const lib = (allClausesData?.clauses ?? []).find((c) => c.id === libId);
        if (!lib) return [];
        return [{ clause_id: lib.id, header_text: lib.header_text, slug: lib.clause_code }];
      });
      setDraftClauses((prev) => [...(prev ?? []), ...newClauses]);
    }

    if (exhibitLibIds.length > 0) {
      const newExhibits = exhibitLibIds.flatMap((libId) => {
        const lib = allExhibits.find((e) => e.id === libId);
        if (!lib) return [];
        return [{ exhibit_id: lib.id, letter: lib.letter, title: lib.title }];
      });
      setDraftExhibits((prev) => [...(prev ?? []), ...newExhibits]);
    }

    setIsAddDialogOpen(false);
    setSelectedItems(new Set());
  };

  const moveClause = (index: number, direction: "up" | "down") => {
    setDraftClauses((prev) => {
      if (!prev) return prev;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const reordered = [...prev];
      [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
      return reordered;
    });
  };

  const moveExhibit = (index: number, direction: "up" | "down") => {
    setDraftExhibits((prev) => {
      if (!prev) return prev;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const reordered = [...prev];
      [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
      return reordered;
    });
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
    setDraftClauses((prev) => {
      if (!prev) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      return reordered;
    });
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
    setDraftExhibits((prev) => {
      if (!prev) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      return reordered;
    });
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setClauseDragOver(null);
    setExhibitDragOver(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!draftClauses || !draftExhibits) return;
    setIsSaving(true);
    try {
      // Recursively get all library descendants of a clause
      const getAllDescendants = (clauseId: number): number[] => {
        const children = (allClausesData?.clauses ?? [])
          .filter((c) => c.parent_clause_id === clauseId)
          .sort((a, b) => a.sort_order - b.sort_order);
        return children.flatMap((c) => [c.id, ...getAllDescendants(c.id)]);
      };

      // Diff clauses
      const serverCSet = new Set(rootTemplateClauses.map((c) => c.clause_id));
      const draftCSet = new Set(draftClauses.map((c) => c.clause_id));
      const toAddClauses = draftClauses.filter((c) => !serverCSet.has(c.clause_id));
      const toRemoveClauses = rootTemplateClauses.filter((c) => !draftCSet.has(c.clause_id));

      // Diff exhibits
      const serverESet = new Set(sortedTemplateExhibits.map((e) => e.exhibit_id));
      const draftESet = new Set(draftExhibits.map((e) => e.exhibit_id));
      const toAddExhibits = draftExhibits.filter((e) => !serverESet.has(e.exhibit_id));
      const toRemoveExhibits = sortedTemplateExhibits.filter((e) => !draftESet.has(e.exhibit_id));

      // Step 1: Deletes (parallel)
      await Promise.all([
        ...toRemoveClauses.map((c) =>
          apiRequest("DELETE", `/api/contract-templates/${id}/clauses/${c.clause_id}`)
        ),
        ...toRemoveExhibits.map((e) =>
          apiRequest("DELETE", `/api/contract-templates/${id}/exhibits/${e.exhibit_id}`)
        ),
      ]);

      // Step 2: Adds (parallel)
      await Promise.all([
        ...toAddClauses.map((c) =>
          apiRequest("POST", `/api/contract-templates/${id}/clauses`, { clauseId: c.clause_id })
        ),
        ...toAddExhibits.map((e) =>
          apiRequest("POST", `/api/contract-templates/${id}/exhibits`, { exhibitId: e.exhibit_id })
        ),
      ]);

      // Step 3: Reorder (parallel, skip if empty)
      const reorderJobs: Promise<Response>[] = [];

      if (draftClauses.length > 0) {
        const order = draftClauses.flatMap((c, i) => {
          const rootIdx = (i + 1) * 100;
          const descendants = getAllDescendants(c.clause_id);
          return [
            { clauseId: c.clause_id, orderIndex: rootIdx },
            ...descendants.map((descId, j) => ({
              clauseId: descId,
              orderIndex: rootIdx + (j + 1) * 10,
            })),
          ];
        });
        reorderJobs.push(
          apiRequest("PUT", `/api/contract-templates/${id}/clauses/reorder`, { order })
        );
      }

      if (draftExhibits.length > 0) {
        const order = draftExhibits.map((e, i) => ({
          exhibitId: e.exhibit_id,
          orderIndex: (i + 1) * 10,
        }));
        reorderJobs.push(
          apiRequest("PUT", `/api/contract-templates/${id}/exhibits/reorder`, { order })
        );
      }

      await Promise.all(reorderJobs);

      // Step 4: Bump template version
      await apiRequest("PATCH", `/api/contract-templates/${id}/version`);

      // Step 5: Invalidate + reset draft
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}/clauses`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/contract-templates/${id}/exhibits`] }),
      ]);
      setDraftClauses(null);
      setDraftExhibits(null);
      toast({ title: "Template saved successfully" });
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!isDirty || isSaving}
              onClick={handleSave}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={openAddDialog} data-testid="button-add-section">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        </div>

        {/* ── CLAUSES SECTION ── */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Clauses
              </span>
              <Badge variant="secondary">{(draftClauses ?? []).length}</Badge>
            </div>
          </div>

          {clausesLoading || draftClauses === null ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : draftClauses.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No clauses added yet. Click "Add Section" to get started.
            </p>
          ) : (
            draftClauses.map((clause, index) => {
              const children = getLibraryChildren(clause.clause_id);
              const isExpanded = expandedTemplateNodes.has(clause.clause_id);
              const isDragOver = clauseDragOver === index;

              return (
                <div key={clause.clause_id}>
                  <div
                    draggable
                    onDragStart={() => handleClauseDragStart(index)}
                    onDragOver={(e) => handleClauseDragOver(e, index)}
                    onDrop={(e) => handleClauseDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-colors ${
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
                        disabled={index === draftClauses.length - 1}
                        onClick={() => moveClause(index, "down")}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() =>
                          setDraftClauses((prev) =>
                            (prev ?? []).filter((c) => c.clause_id !== clause.clause_id)
                          )
                        }
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
                          {child.header_text || child.clause_code}
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
              <Badge variant="secondary">{(draftExhibits ?? []).length}</Badge>
            </div>
          </div>

          {exhibitsLoading || draftExhibits === null ? (
            <div className="p-4 space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : draftExhibits.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No exhibits added yet. Click "Add Section" to get started.
            </p>
          ) : (
            draftExhibits.map((exhibit, index) => {
              const isDragOver = exhibitDragOver === index;
              return (
                <div
                  key={exhibit.exhibit_id}
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
                      disabled={index === draftExhibits.length - 1}
                      onClick={() => moveExhibit(index, "down")}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() =>
                        setDraftExhibits((prev) =>
                          (prev ?? []).filter((e) => e.exhibit_id !== exhibit.exhibit_id)
                        )
                      }
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
                        alreadyAdded ? "opacity-50 cursor-default" : "hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={alreadyAdded}
                        onCheckedChange={() => !alreadyAdded && toggleSelected(key)}
                      />
                      <span className="flex-1 text-sm truncate">{item.label}</span>
                      <Badge variant="outline" className="text-xs shrink-0 capitalize">
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
              {selectedCount > 0 ? `${selectedCount} selected` : "Select items to add"}
            </span>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={selectedCount === 0} onClick={handleAddSelected}>
              Add{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
