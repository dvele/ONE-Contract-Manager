import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { ContractTypePicker } from "@/components/ui/contract-type-picker";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Search,
  FileText,
  ChevronDown,
  ChevronRight,
  Edit,
  Save,
  X,
  AlertTriangle,
  Zap,
  Code,
  Hash,
  Layers,
  BookOpen,
  RotateCcw,
  Settings,
  Square,
  FolderTree,
  Eye,
  GripVertical,
  Table,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Clause {
  id: number;
  clause_code: string;
  parent_clause_id: number | null;
  hierarchy_level: number;
  sort_order: number;
  header_text: string;
  body_html: string;
  contract_types: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface TableDefinition {
  id: number;
  variable_name: string;
  display_name: string;
  description: string | null;
}

interface ClauseStats {
  total: string;
  contract_types: string;
  categories: string;
  conditional: string;
}

interface ClauseResponse {
  clauses: Clause[];
  stats: ClauseStats;
}

interface TreeNode {
  clause: Clause;
  children: TreeNode[];
}

const CONTRACT_TYPE_OPTIONS = [
  { value: "MASTER_EF", label: "Master Purchase Agreement" },
  { value: "CMOS", label: "CMOS" },
  { value: "CRC", label: "CRC" },
  { value: "ONSITE", label: "OnSite" },
];

const CONTRACT_TYPES = [
  { value: "ALL", label: "All Contract Types" },
  { value: "MASTER_EF", label: "Master Purchase Agreement" },
  { value: "ONE", label: "ONE Agreement (Archived)" },
  { value: "MANUFACTURING", label: "Manufacturing Subcontract (Archived)" },
  { value: "ONSITE", label: "OnSite Subcontract (Archived)" },
];

const HIERARCHY_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "1", label: "Sections (Level 1)" },
  { value: "2", label: "Subsections (Level 2)" },
  { value: "3", label: "Paragraphs (Level 3)" },
  { value: "4", label: "Sub-headers (Level 4)" },
  { value: "5", label: "Body Text (Level 5)" },
  { value: "6", label: "Conspicuous (Level 6)" },
  { value: "7", label: "List Items (Level 7)" },
  { value: "8", label: "Nested List (Level 8)" },
];

const EDIT_HIERARCHY_OPTIONS = [
  { value: 1, label: "Level 1 - Heading 1" },
  { value: 2, label: "Level 2 - Heading 2" },
  { value: 3, label: "Level 3 - Heading 3" },
  { value: 4, label: "Level 4 - Heading 4" },
  { value: 5, label: "Level 5 - Normal Text" },
  { value: 6, label: "Level 6 - Heading 6" },
  { value: 7, label: "Level 7 - Heading 5" },
  { value: 8, label: "Level 8 - Nested List" },
];


export default function ClauseLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contractType, setContractType] = useState("ALL");
  const [hierarchyLevel, setHierarchyLevel] = useState("all");
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [editingClause, setEditingClause] = useState<Clause | null>(null);
  const [editHeaderText, setEditHeaderText] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [editHierarchyLevel, setEditHierarchyLevel] = useState<number>(3);
  const [editContractTypes, setEditContractTypes] = useState<string[]>([]);
  const [draggedClause, setDraggedClause] = useState<Clause | null>(null);
  const [dragOverClauseId, setDragOverClauseId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'child' | null>(null);
  const [previewProjectId, setPreviewProjectId] = useState<string>("");
  const [resolveTablesPreview, setResolveTablesPreview] = useState(false);
  
  const [selectedClauseIds, setSelectedClauseIds] = useState<Set<number>>(new Set());
  const [bulkLevelDialogOpen, setBulkLevelDialogOpen] = useState(false);
  const [bulkNewLevel, setBulkNewLevel] = useState<number>(3);
  const [bulkConfirmDialogOpen, setBulkConfirmDialogOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<{ type: string; data?: any } | null>(null);
  
  const { toast } = useToast();
  
  const toggleClauseSelection = (clauseId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedClauseIds(prev => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      return next;
    });
  };
  
  const selectAllClauses = () => {
    const allIds = new Set(clauses.map(c => c.id));
    setSelectedClauseIds(allIds);
  };
  
  const clearSelection = () => {
    setSelectedClauseIds(new Set());
  };
  
  const getSelectedClauses = (): Clause[] => {
    return clauses.filter(c => selectedClauseIds.has(c.id));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setContractType("ALL");
    setHierarchyLevel("all");
  };

  const hasActiveFilters = searchTerm !== "" || contractType !== "ALL" || hierarchyLevel !== "all";

  const { data, isLoading, error } = useQuery<ClauseResponse>({
    queryKey: ["/api/clauses", contractType, hierarchyLevel, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contractType !== "ALL") params.append("contractType", contractType);
      if (hierarchyLevel !== "all") params.append("hierarchyLevel", hierarchyLevel);
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(`/api/clauses?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch clauses");
      return response.json();
    },
  });

  const { data: tableDefs } = useQuery<TableDefinition[]>({
    queryKey: ["/api/table-definitions"],
  });

  const { data: projects } = useQuery<{ id: number; project_number: string; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const getContentForPreview = () => {
    if (selectedClause && editingClause?.id === selectedClause.id) {
      return editBodyHtml;
    }
    return selectedClause?.body_html || "";
  };

  const previewContent = selectedClause && editingClause?.id === selectedClause.id ? editBodyHtml : (selectedClause?.body_html || "");
  
  const { data: resolvedPreviewData, isLoading: isResolvingPreview } = useQuery<{ html: string }>({
    queryKey: ["/api/resolve-clause-tables", previewContent, previewProjectId, resolveTablesPreview],
    queryFn: async () => {
      if (!previewContent || !previewProjectId) {
        return { html: "" };
      }
      const response = await fetch("/api/resolve-clause-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: previewContent, projectId: previewProjectId }),
      });
      if (!response.ok) throw new Error("Failed to resolve tables");
      return response.json();
    },
    enabled: resolveTablesPreview && !!previewProjectId && !!selectedClause,
  });

  const insertTableVariable = (variableName: string) => {
    const textarea = document.querySelector('[data-testid="textarea-edit-body"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = editBodyHtml.slice(0, start) + `{{${variableName}}}` + editBodyHtml.slice(end);
      setEditBodyHtml(newContent);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + variableName.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setEditBodyHtml(editBodyHtml + `{{${variableName}}}`);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Clause> & { id: number }) => {
      const { id, ...rest } = updates;
      const response = await apiRequest("PATCH", `/api/clauses/${id}`, rest);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clauses"] });
      // Update selectedClause so the preview reflects the saved content immediately
      if (selectedClause && selectedClause.id === variables.id) {
        setSelectedClause({
          ...selectedClause,
          header_text: variables.header_text ?? selectedClause.header_text,
          body_html: variables.body_html ?? selectedClause.body_html,
          hierarchy_level: variables.hierarchy_level ?? selectedClause.hierarchy_level,
          contract_types: variables.contract_types ?? selectedClause.contract_types,
        });
      }
      setEditingClause(null);
      toast({
        title: "Clause Updated",
        description: "The clause has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update clause. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: number; parent_clause_id: number | null; insert_after_id: number | null }) => {
      const { id, ...rest } = updates;
      const response = await apiRequest("POST", `/api/clauses/${id}/reorder`, rest);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clauses"] });
      clearSelection();
      toast({
        title: "Clause Reordered",
        description: "The clause position has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder clause. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { ids: number[]; changes: Partial<Clause> }) => {
      const promises = updates.ids.map(id => 
        apiRequest("PATCH", `/api/clauses/${id}`, updates.changes)
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clauses"] });
      clearSelection();
      toast({
        title: "Bulk Update Complete",
        description: `Successfully updated ${variables.ids.length} clauses.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update clauses. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkReorderMutation = useMutation({
    mutationFn: async (updates: { ids: number[]; parent_clause_id: number | null; insert_after_id: number | null }) => {
      let lastInsertId = updates.insert_after_id;
      for (const id of updates.ids) {
        await apiRequest("POST", `/api/clauses/${id}/reorder`, {
          parent_clause_id: updates.parent_clause_id,
          insert_after_id: lastInsertId,
        });
        lastInsertId = id;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clauses"] });
      clearSelection();
      toast({
        title: "Bulk Reorder Complete",
        description: `Successfully moved ${variables.ids.length} clauses.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder clauses. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmBulkAction = (type: string, data?: any) => {
    setPendingBulkAction({ type, data });
    setBulkConfirmDialogOpen(true);
  };

  const executeBulkAction = () => {
    if (!pendingBulkAction) return;
    
    const selectedIds = Array.from(selectedClauseIds);
    
    const sortedSelectedIds = selectedIds
      .map(id => clauses.find(c => c.id === id))
      .filter(Boolean)
      .sort((a, b) => (a?.sort_order || 0) - (b?.sort_order || 0))
      .map(c => c!.id);
    
    if (pendingBulkAction.type === 'level') {
      bulkUpdateMutation.mutate({
        ids: sortedSelectedIds,
        changes: { hierarchy_level: pendingBulkAction.data.level },
      });
    } else if (pendingBulkAction.type === 'reorder') {
      bulkReorderMutation.mutate({
        ids: sortedSelectedIds,
        parent_clause_id: pendingBulkAction.data.parent_clause_id,
        insert_after_id: pendingBulkAction.data.insert_after_id,
      });
    }
    
    setBulkConfirmDialogOpen(false);
    setPendingBulkAction(null);
  };

  const openBulkLevelDialog = () => {
    if (selectedClauseIds.size === 0) {
      toast({
        title: "No Clauses Selected",
        description: "Please select one or more clauses first.",
        variant: "destructive",
      });
      return;
    }
    setBulkLevelDialogOpen(true);
  };

  const applyBulkLevel = () => {
    setBulkLevelDialogOpen(false);
    confirmBulkAction('level', { level: bulkNewLevel });
  };

  const clauses = data?.clauses || [];
  const stats = data?.stats;

  const buildTree = useMemo(() => {
    const clauseMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    const sortedClauses = [...clauses].sort((a, b) => {
      if (a.hierarchy_level !== b.hierarchy_level) {
        return a.hierarchy_level - b.hierarchy_level;
      }
      return a.sort_order - b.sort_order;
    });

    for (const clause of sortedClauses) {
      clauseMap.set(clause.id, { clause, children: [] });
    }

    for (const clause of sortedClauses) {
      const node = clauseMap.get(clause.id)!;
      if (clause.parent_clause_id && clauseMap.has(clause.parent_clause_id)) {
        clauseMap.get(clause.parent_clause_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortedRoots = roots.sort((a, b) => a.clause.sort_order - b.clause.sort_order);
    return sortedRoots;
  }, [clauses]);

  const toggleNode = (id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditing = (clause: Clause) => {
    setEditingClause(clause);
    setEditHeaderText(clause.header_text || "");
    setEditBodyHtml(clause.body_html || "");
    setEditHierarchyLevel(clause.hierarchy_level);
    setEditContractTypes(clause.contract_types || []);
  };

  const saveEdits = () => {
    if (!editingClause) return;
    updateMutation.mutate({
      id: editingClause.id,
      header_text: editHeaderText,
      body_html: editBodyHtml,
      hierarchy_level: editHierarchyLevel,
      contract_types: editContractTypes,
    } as any);
  };

  const cancelEditing = () => {
    setEditingClause(null);
    setEditHeaderText("");
    setEditBodyHtml("");
    setEditContractTypes([]);
  };

  const handleDragStart = (e: React.DragEvent, clause: Clause) => {
    setDraggedClause(clause);
    e.dataTransfer.effectAllowed = 'move';
    const dragIds = selectedClauseIds.has(clause.id) 
      ? Array.from(selectedClauseIds).join(',')
      : String(clause.id);
    e.dataTransfer.setData('text/plain', dragIds);
  };
  
  const isDraggingMultiple = draggedClause && selectedClauseIds.has(draggedClause.id) && selectedClauseIds.size > 1;

  const handleDragEnd = () => {
    setDraggedClause(null);
    setDragOverClauseId(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, clause: Clause) => {
    e.preventDefault();
    if (!draggedClause || draggedClause.id === clause.id) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    let position: 'before' | 'after' | 'child';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'child';
    }
    
    setDragOverClauseId(clause.id);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverClauseId(null);
    setDropPosition(null);
  };

  const isDescendantOf = (targetId: number, ancestorId: number): boolean => {
    let currentId: number | null = targetId;
    const visited = new Set<number>();
    
    while (currentId !== null) {
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      
      const current = clauses.find(c => c.id === currentId);
      if (!current) return false;
      if (current.parent_clause_id === ancestorId) return true;
      currentId = current.parent_clause_id;
    }
    return false;
  };
  
  const isTargetDescendantOfSelection = (targetId: number): boolean => {
    const idsToCheck = isDraggingMultiple 
      ? Array.from(selectedClauseIds)
      : draggedClause ? [draggedClause.id] : [];
    
    for (const id of idsToCheck) {
      if (targetId === id || isDescendantOf(targetId, id)) {
        return true;
      }
    }
    return false;
  };

  const findPreviousSibling = (targetClause: Clause, parentId: number | null): number | null => {
    const idsToExclude = isDraggingMultiple 
      ? new Set([...Array.from(selectedClauseIds), draggedClause?.id].filter(Boolean) as number[])
      : new Set([draggedClause?.id].filter(Boolean) as number[]);
    
    const siblings = clauses
      .filter(c => c.parent_clause_id === parentId && !idsToExclude.has(c.id))
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const targetIdx = siblings.findIndex(s => s.id === targetClause.id);
    if (targetIdx > 0) {
      return siblings[targetIdx - 1].id;
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent, targetClause: Clause) => {
    e.preventDefault();
    if (!draggedClause || draggedClause.id === targetClause.id || !dropPosition) return;

    if (isDraggingMultiple && selectedClauseIds.has(targetClause.id)) {
      toast({
        title: "Invalid Drop Target",
        description: "Cannot drop selected clauses onto another selected clause.",
        variant: "destructive",
      });
      handleDragEnd();
      return;
    }
    
    if (isTargetDescendantOfSelection(targetClause.id)) {
      toast({
        title: "Invalid Drop Target",
        description: "Cannot drop a clause into or next to its own descendant.",
        variant: "destructive",
      });
      handleDragEnd();
      return;
    }

    let newParentId: number | null;
    let insertAfterId: number | null = null;

    if (dropPosition === 'before') {
      newParentId = targetClause.parent_clause_id;
      insertAfterId = findPreviousSibling(targetClause, newParentId);
    } else if (dropPosition === 'after') {
      newParentId = targetClause.parent_clause_id;
      insertAfterId = targetClause.id;
    } else {
      newParentId = targetClause.id;
      insertAfterId = null;
    }

    if (isDraggingMultiple) {
      confirmBulkAction('reorder', {
        parent_clause_id: newParentId,
        insert_after_id: insertAfterId,
      });
    } else {
      reorderMutation.mutate({
        id: draggedClause.id,
        parent_clause_id: newParentId,
        insert_after_id: insertAfterId,
      });
    }

    handleDragEnd();
  };

  const getHierarchyLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: "Section",
      2: "Subsection",
      3: "Paragraph",
      4: "Sub-header",
      5: "Body",
      6: "Conspicuous",
      7: "List Item",
      8: "Nested",
    };
    return labels[level] || `L${level}`;
  };

  const getHierarchyColor = (level: number) => {
    const colors: Record<number, string> = {
      1: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300",
      2: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300",
      3: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300",
      4: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-300",
      5: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300",
      6: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300",
      7: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300",
      8: "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-300",
    };
    return colors[level] || "";
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const getPreviewHtml = (clause: { header_text: string; body_html: string; hierarchy_level: number }) => {
    const level = clause.hierarchy_level;
    const headerText = clause.header_text || "";
    let bodyHtml = clause.body_html || "";
    
    bodyHtml = bodyHtml
      .replace(/\{\{([A-Z0-9_]+)\}\}/g, '<span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded font-mono text-xs">[[$1]]</span>');

    const styles: Record<number, { header: string; body: string }> = {
      1: {
        header: "font-bold text-xl uppercase tracking-wide text-center border-b-2 border-gray-300 pb-2 mb-4 text-[#1a73e8]",
        body: "text-base leading-relaxed",
      },
      2: {
        header: "font-bold text-lg uppercase tracking-wide mb-2 text-[#1a73e8]",
        body: "text-base leading-relaxed ml-4",
      },
      3: {
        header: "font-semibold text-base mb-1 text-[#1a73e8]",
        body: "text-sm leading-relaxed ml-6",
      },
      4: {
        header: "font-semibold text-sm uppercase mb-1 ml-6 text-[#1a73e8]",
        body: "text-sm leading-relaxed ml-8",
      },
      5: {
        header: "font-medium text-sm ml-8",
        body: "text-sm leading-relaxed text-justify ml-8",
      },
      6: {
        header: "font-bold uppercase text-sm ml-8 text-amber-700 dark:text-amber-400",
        body: "text-sm leading-relaxed text-justify ml-8 border-l-4 border-amber-400 pl-3",
      },
      7: {
        header: "text-sm ml-10",
        body: "text-sm leading-relaxed ml-12",
      },
      8: {
        header: "text-sm ml-14",
        body: "text-sm leading-relaxed ml-16",
      },
    };

    const style = styles[level] || styles[5];

    return `
      <div class="clause-preview py-2" data-level="${level}">
        ${headerText ? `<div class="clause-header level-${level} ${style.header}">${escapeHtml(headerText)}</div>` : ''}
        <div class="clause-body ${style.body}">${bodyHtml}</div>
      </div>
    `;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0, siblingIndex: number = 0, parentNumber: string = "") => {
    const { clause, children } = node;
    const isExpanded = expandedNodes.has(clause.id);
    const isSelected = selectedClause?.id === clause.id;
    const isChecked = selectedClauseIds.has(clause.id);
    const hasChildren = children.length > 0;
    const isDragOver = dragOverClauseId === clause.id;
    const isDragging = draggedClause?.id === clause.id || (isDraggingMultiple && isChecked);
    
    const currentNumber = clause.hierarchy_level === 1 
      ? `${siblingIndex + 1}` 
      : parentNumber 
        ? `${parentNumber}.${siblingIndex + 1}` 
        : `${siblingIndex + 1}`;

    const getDropIndicatorClass = () => {
      if (!isDragOver || !dropPosition) return '';
      if (dropPosition === 'before') return 'border-t-2 border-t-primary';
      if (dropPosition === 'after') return 'border-b-2 border-b-primary';
      if (dropPosition === 'child') return 'ring-2 ring-primary ring-inset';
      return '';
    };

    return (
      <div key={clause.id} className="select-none">
        <div
          className={`flex items-start gap-1 py-1.5 px-2 rounded-md cursor-pointer hover-elevate transition-colors ${
            isSelected ? 'bg-primary/10 border border-primary/30' : ''
          } ${isChecked ? 'bg-accent/50' : ''} ${isDragging ? 'opacity-50' : ''} ${getDropIndicatorClass()}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedClause(clause)}
          draggable
          onDragStart={(e) => handleDragStart(e, clause)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, clause)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, clause)}
          data-testid={`tree-node-${clause.id}`}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => toggleClauseSelection(clause.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
            data-testid={`checkbox-clause-${clause.id}`}
          />
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab flex-shrink-0 mt-0.5" />
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(clause.id);
              }}
              className="p-0.5 hover:bg-muted rounded flex-shrink-0"
              data-testid={`toggle-node-${clause.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0 mt-0.5">{currentNumber}</span>
          <span className="text-sm flex-1 break-words">
            {clause.header_text || <span className="italic text-muted-foreground">(Untitled)</span>}
          </span>
          {clause.tags && clause.tags.length > 0 && (
            <span title="Has tags" className="flex-shrink-0 mt-0.5">
              <Zap className="h-3 w-3 text-amber-500" />
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {children.map((child, idx) => renderTreeNode(child, depth + 1, idx, currentNumber))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex-1 p-6 md:p-8">
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p>Failed to load clauses. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-page-title">Clause Explorer</h1>
            {stats && (
              <Badge variant="secondary" className="ml-2">
                {stats.total} clauses
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clauses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-48"
                data-testid="input-search"
              />
            </div>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger className="w-44" data-testid="select-contract-type">
                <SelectValue placeholder="Contract Type" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hierarchyLevel} onValueChange={setHierarchyLevel}>
              <SelectTrigger className="w-40" data-testid="select-hierarchy">
                <SelectValue placeholder="Hierarchy" />
              </SelectTrigger>
              <SelectContent>
                {HIERARCHY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={35} minSize={15}>
          <div className="flex flex-col h-full border-r overflow-hidden bg-muted/30">
          <div className="p-2 border-b bg-background flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Hierarchy Tree
              </h2>
              {selectedClauseIds.size > 0 && (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {selectedClauseIds.size} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-6 px-2"
                    data-testid="button-clear-selection"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openBulkLevelDialog}
                    className="h-6 px-2 text-xs"
                    data-testid="button-bulk-level"
                  >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Level
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : buildTree.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No clauses found</p>
                </div>
              ) : (
                buildTree.map((node, idx) => renderTreeNode(node, 0, idx))
              )}
            </div>
          </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel>
          <div className="flex flex-col h-full min-h-0">
          {selectedClause ? (
            <>
              <div className="p-3 border-b bg-background flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">
                      {selectedClause.clause_code || `#${selectedClause.id}`}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getHierarchyColor(selectedClause.hierarchy_level)}
                    >
                      {getHierarchyLabel(selectedClause.hierarchy_level)}
                    </Badge>
                    {(selectedClause.contract_types || []).filter(Boolean).map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingClause?.id === selectedClause.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditing}
                          data-testid="button-cancel-edit"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveEdits}
                          disabled={updateMutation.isPending}
                          data-testid="button-save-edit"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(selectedClause)}
                        data-testid="button-edit-clause"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {editingClause?.id === selectedClause.id ? (
              <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                <ResizablePanel defaultSize={55}>
                  <div className="flex flex-col h-full">
                  <div className="p-2 border-b bg-muted/30 flex-shrink-0">
                    <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Code className="h-3 w-3" />
                      Editor
                    </h3>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <div className="p-4 space-y-4">
                        <div>
                          <Label htmlFor="edit-header" className="flex items-center gap-2">
                            Header / Title
                            <Badge variant="outline" className={`text-xs ${getHierarchyColor(editHierarchyLevel)}`}>
                              Level {editHierarchyLevel}
                            </Badge>
                          </Label>
                          <Input
                            id="edit-header"
                            value={editHeaderText}
                            onChange={(e) => setEditHeaderText(e.target.value)}
                            placeholder="Clause header..."
                            className={`mt-1 ${
                              editHierarchyLevel <= 2 ? 'font-bold text-lg text-[#1a73e8] uppercase' :
                              editHierarchyLevel <= 4 ? 'font-semibold text-[#1a73e8]' :
                              editHierarchyLevel === 6 ? 'font-bold uppercase text-amber-600' :
                              ''
                            }`}
                            data-testid="input-edit-header"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="edit-body">Body Content (HTML)</Label>
                            <Select onValueChange={insertTableVariable}>
                              <SelectTrigger className="w-48 h-8" data-testid="select-insert-table">
                                <Table className="h-4 w-4 mr-1" />
                                <SelectValue placeholder="Insert Table..." />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                  Built-in Tables
                                </div>
                                <SelectItem value="PRICING_BREAKDOWN_TABLE">Pricing Breakdown</SelectItem>
                                <SelectItem value="PAYMENT_SCHEDULE_TABLE">Payment Schedule</SelectItem>
                                <SelectItem value="UNIT_SPEC_TABLE">Unit Spec Table</SelectItem>
                                {tableDefs && tableDefs.length > 0 && (
                                  <>
                                    <Separator className="my-1" />
                                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                      Custom Tables
                                    </div>
                                    {tableDefs.map((table) => (
                                      <SelectItem key={table.id} value={table.variable_name}>
                                        {table.display_name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <WysiwygEditor
                            value={editBodyHtml}
                            onChange={(html) => setEditBodyHtml(html)}
                            placeholder="Clause body HTML content..."
                            data-testid="textarea-edit-body"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Hierarchy Level</Label>
                            <Select 
                              value={editHierarchyLevel.toString()} 
                              onValueChange={(v) => setEditHierarchyLevel(parseInt(v))}
                            >
                              <SelectTrigger data-testid="select-edit-hierarchy">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EDIT_HIERARCHY_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value.toString()}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Contract Types (Tags)</Label>
                            <ContractTypePicker
                              options={CONTRACT_TYPE_OPTIONS}
                              value={editContractTypes}
                              onChange={setEditContractTypes}
                            />
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel>
                  <div className="flex flex-col h-full">
                  <div className="p-2 border-b bg-muted/30 flex-shrink-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Eye className="h-3 w-3" />
                        HTML Preview
                      </h3>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="resolve-tables"
                          checked={resolveTablesPreview}
                          onCheckedChange={(checked) => setResolveTablesPreview(checked === true)}
                          className="h-3 w-3"
                          data-testid="checkbox-resolve-tables"
                        />
                        <Label htmlFor="resolve-tables" className="text-xs cursor-pointer">
                          Resolve Tables
                        </Label>
                        {resolveTablesPreview && (
                          <Select value={previewProjectId} onValueChange={setPreviewProjectId}>
                            <SelectTrigger className="w-36 h-6 text-xs" data-testid="select-preview-project">
                              <SelectValue placeholder="Select project..." />
                            </SelectTrigger>
                            <SelectContent>
                              {projects?.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.project_number} - {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <div className="p-4">
                      {resolveTablesPreview && previewProjectId ? (
                        isResolvingPreview ? (
                          <div className="text-center text-muted-foreground py-4">Resolving tables...</div>
                        ) : (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: resolvedPreviewData?.html || '<p class="text-muted-foreground">No content to preview</p>'
                            }}
                            data-testid="resolved-preview"
                          />
                        )
                      ) : (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: editingClause?.id === selectedClause.id
                              ? getPreviewHtml({ header_text: editHeaderText, body_html: editBodyHtml, hierarchy_level: editHierarchyLevel })
                              : getPreviewHtml(selectedClause)
                          }}
                          data-testid="standard-preview"
                        />
                      )}
                    </div>
                  </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
              ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="p-2 border-b bg-muted/30 flex-shrink-0 flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Eye className="h-3 w-3" />
                    Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="resolve-tables"
                      checked={resolveTablesPreview}
                      onCheckedChange={(checked) => setResolveTablesPreview(checked === true)}
                      className="h-3 w-3"
                      data-testid="checkbox-resolve-tables"
                    />
                    <Label htmlFor="resolve-tables" className="text-xs cursor-pointer">
                      Resolve Tables
                    </Label>
                    {resolveTablesPreview && (
                      <Select value={previewProjectId} onValueChange={setPreviewProjectId}>
                        <SelectTrigger className="w-36 h-6 text-xs" data-testid="select-preview-project">
                          <SelectValue placeholder="Select project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects?.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.project_number} - {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  <div className="p-4">
                    {resolveTablesPreview && previewProjectId ? (
                      isResolvingPreview ? (
                        <div className="text-center text-muted-foreground py-4">Resolving tables...</div>
                      ) : (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: resolvedPreviewData?.html || '<p class="text-muted-foreground">No content to preview</p>'
                          }}
                          data-testid="resolved-preview"
                        />
                      )
                    ) : (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: getPreviewHtml(selectedClause) }}
                        data-testid="standard-preview"
                      />
                    )}
                  </div>
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a clause from the tree</p>
                <p className="text-sm mt-1">Click on any clause to view and edit</p>
              </div>
            </div>
          )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={bulkLevelDialogOpen} onOpenChange={setBulkLevelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Hierarchy Level</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Change the hierarchy level for {selectedClauseIds.size} selected clause(s).
            </p>
            <Label>New Hierarchy Level</Label>
            <Select 
              value={bulkNewLevel.toString()} 
              onValueChange={(v) => setBulkNewLevel(parseInt(v))}
            >
              <SelectTrigger data-testid="select-bulk-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDIT_HIERARCHY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkLevelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulkLevel} data-testid="button-apply-bulk-level">
              Apply to {selectedClauseIds.size} Clauses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkConfirmDialogOpen} onOpenChange={setBulkConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Edit</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkAction?.type === 'level' && (
                <>
                  You are about to change the hierarchy level of {selectedClauseIds.size} clause(s) 
                  to Level {pendingBulkAction?.data?.level}. This action cannot be easily undone.
                </>
              )}
              {pendingBulkAction?.type === 'reorder' && (
                <>
                  You are about to move {selectedClauseIds.size} clause(s) to a new position. 
                  This will change their order in the contract hierarchy.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction} data-testid="button-confirm-bulk">
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
