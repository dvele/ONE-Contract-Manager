import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileCheck,
  Edit3,
  Code,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Eye } from "lucide-react";

// HTML escape function for XSS protection
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Format clause content: convert markdown tables/bullets to HTML
const formatContent = (content: string): string => {
  if (!content) return "";

  const lines = content.split("\n");
  const outputBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect table: line starts and ends with | and has multiple cells
    if (
      line.startsWith("|") &&
      line.endsWith("|") &&
      line.split("|").length > 2
    ) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const tLine = lines[i].trim();
        if (tLine.startsWith("|") && tLine.endsWith("|")) {
          tableLines.push(tLine);
          i++;
        } else {
          break;
        }
      }

      let tableHtml =
        '<table class="w-full text-sm border-collapse mb-4"><tbody>';
      let isHeader = true;

      for (const tLine of tableLines) {
        // Skip separator rows (|---|---|---| with any number of columns)
        if (tLine.match(/^\|[\s\-:|]+\|$/)) continue;

        const cells = tLine
          .split("|")
          .slice(1, -1)
          .map((c) => escapeHtml(c.trim()));
        if (cells.length > 0) {
          const tag = isHeader ? "th" : "td";
          const cellClass = isHeader
            ? "border border-border bg-muted/50 px-3 py-2 text-left font-medium"
            : "border border-border px-3 py-2";
          tableHtml += `<tr>${cells.map((c) => `<${tag} class="${cellClass}">${c}</${tag}>`).join("")}</tr>`;
          isHeader = false;
        }
      }
      tableHtml += "</tbody></table>";
      outputBlocks.push(tableHtml);
      continue;
    }

    // Detect bullet list: line starts with • or - followed by space
    if (
      line.startsWith("•") ||
      (line.startsWith("- ") && !line.startsWith("---"))
    ) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const bulletLine = lines[i].trim();
        if (
          bulletLine.startsWith("•") ||
          (bulletLine.startsWith("- ") && !bulletLine.startsWith("---"))
        ) {
          listItems.push(escapeHtml(bulletLine.replace(/^[•\-]\s*/, "")));
          i++;
        } else {
          break;
        }
      }
      const listHtml = `<ul class="list-disc pl-4 my-2">${listItems.map((item) => `<li class="ml-4">${item}</li>`).join("")}</ul>`;
      outputBlocks.push(listHtml);
      continue;
    }

    // Empty line creates paragraph break (skip consecutive empties)
    if (line === "") {
      if (
        outputBlocks.length === 0 ||
        !outputBlocks[outputBlocks.length - 1].endsWith("<br/>")
      ) {
        outputBlocks.push("<br/>");
      }
      i++;
      continue;
    }

    // Regular text - collect consecutive non-special lines
    const textLines: string[] = [];
    while (i < lines.length) {
      const tLine = lines[i].trim();
      const isBullet =
        tLine.startsWith("•") ||
        (tLine.startsWith("- ") && !tLine.startsWith("---"));
      const isTable = tLine.startsWith("|") && tLine.endsWith("|");
      if (tLine === "" || isBullet || isTable) {
        break;
      }
      textLines.push(escapeHtml(tLine));
      i++;
    }
    if (textLines.length > 0) {
      outputBlocks.push(`<p class="my-1">${textLines.join("<br/>")}</p>`);
    }
  }

  let formatted = outputBlocks.join("");

  // Wrap in container
  formatted = `<div class="prose prose-sm max-w-none dark:prose-invert">${formatted}</div>`;

  // Highlight variables
  formatted = formatted.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    '<span class="bg-primary/20 text-primary px-1 rounded font-mono text-sm">{{$1}}</span>'
  );

  return formatted;
};

interface Contract {
  id: number;
  projectId: number;
  contractType: string;
  version: number;
  status: string;
  generatedAt: string;
  generatedBy: string;
  templateVersion: string;
  fileName: string;
  filePath: string;
  notes: string;
  projectName?: string;
  projectNumber?: string;
}

interface Clause {
  id: number;
  name: string;
  content: string;
  hierarchy_level: string;
  risk_level: string;
  section_number: string;
}

const statusSteps = [
  {
    key: "Draft",
    label: "Draft",
    icon: Edit3,
    description: "Initial draft created",
  },
  {
    key: "PendingReview",
    label: "Pending Review",
    icon: Clock,
    description: "Awaiting review",
  },
  {
    key: "Approved",
    label: "Approved",
    icon: CheckCircle2,
    description: "Approved by reviewer",
  },
  {
    key: "Signed",
    label: "Signed",
    icon: FileCheck,
    description: "Fully executed",
  },
];

function normalizeStatusKey(status: string): string {
  // Handle various status formats: "Draft", "draft", "PendingReview", "pending_review", "Pending Review"
  const normalized = status.replace(/[\s_]+/g, "").toLowerCase();
  const statusMap: Record<string, string> = {
    draft: "Draft",
    pendingreview: "PendingReview",
    pending: "PendingReview",
    approved: "Approved",
    signed: "Signed",
    executed: "Signed", // Map legacy status
    sent: "Approved", // Map legacy status
  };
  return statusMap[normalized] || "Draft";
}

function getStatusDisplayLabel(status: string): string {
  const normalizedKey = normalizeStatusKey(status);
  const labels: Record<string, string> = {
    Draft: "Draft",
    PendingReview: "Pending Review",
    Approved: "Approved",
    Signed: "Signed",
  };
  return labels[normalizedKey] || status;
}

function getStatusIndex(status: string): number {
  const normalizedKey = normalizeStatusKey(status);
  return statusSteps.findIndex((s) => s.key === normalizedKey);
}

function getContractTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    master_ef: "Master Purchase Agreement",
    MASTER_EF: "Master Purchase Agreement",
    ONE: "ONE Agreement (Archived)",
    one_agreement: "ONE Agreement (Archived)",
    MANUFACTURING: "Manufacturing Subcontract (Archived)",
    manufacturing_sub: "Manufacturing Subcontract (Archived)",
    ONSITE: "OnSite Subcontract (Archived)",
    onsite_sub: "OnSite Subcontract (Archived)",
  };
  return typeMap[type] || type;
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  const normalizedKey = normalizeStatusKey(status);
  switch (normalizedKey) {
    case "Draft":
      return "secondary";
    case "PendingReview":
      return "outline";
    case "Approved":
      return "default";
    case "Signed":
      return "default";
    default:
      return "secondary";
  }
}

export default function ContractDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(
    new Set()
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const contractId = parseInt(params.id || "0");

  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", contractId],
    enabled: contractId > 0,
  });

  const { data: clauses, isLoading: clausesLoading } = useQuery<Clause[]>({
    queryKey: ["/api/contracts", contractId, "clauses"],
    enabled: contractId > 0,
  });

  // Note: PDF generation now passes projectId to server, which fetches and maps data itself

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/contracts/${contractId}`, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/contracts", contractId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Status Updated",
        description: "Contract status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update contract status.",
        variant: "destructive",
      });
    },
  });

  const toggleClause = (clauseId: number) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      return next;
    });
  };

  // Map contract type from stored format to API format
  const getContractTypeForApi = (contractType: string): string => {
    const typeMap: Record<string, string> = {
      master_ef: "MASTER_EF",
      MASTER_EF: "MASTER_EF",
      "Master Ef": "MASTER_EF",
      one_agreement: "ONE",
      ONE: "ONE",
      manufacturing_sub: "MANUFACTURING",
      MANUFACTURING: "MANUFACTURING",
      onsite_sub: "ONSITE",
      ONSITE: "ONSITE",
    };
    return typeMap[contractType] || contractType.toUpperCase();
  };

  const generatePdf = useCallback(async (): Promise<Blob | null> => {
    if (!contract?.projectId) {
      toast({
        title: "Cannot Generate PDF",
        description: "Contract or project data not available.",
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/contracts/download-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractType: getContractTypeForApi(contract.contractType),
          projectId: contract.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      return await response.blob();
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate PDF document.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [contract, toast]);

  const handleDownload = async () => {
    const blob = await generatePdf();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract?.projectNumber || "Contract"}_${getContractTypeName(contract?.contractType || "MASTER_EF").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handlePreview = async () => {
    const blob = await generatePdf();
    if (blob) {
      // Open PDF in a new tab for reliable viewing across all browsers
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Clean up the URL after a short delay to allow the tab to load
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const handleHtmlPreview = async () => {
    if (!contract?.projectId) {
      toast({
        title: "Error",
        description: "Contract or project data not available.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/contracts/draft-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractType: getContractTypeForApi(contract.contractType),
          projectId: contract.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate HTML preview");
      }

      const html = await response.text();

      // Open HTML in a new tab
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error("HTML preview error:", error);
      toast({
        title: "Preview Failed",
        description: "Failed to generate HTML preview.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  if (contractLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Contract Not Found</h2>
            <p className="mb-4 text-muted-foreground">
              The contract you're looking for doesn't exist.
            </p>
            <Button
              onClick={() => setLocation("/contracts")}
              data-testid="button-back-to-contracts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(contract.status);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/contracts")}
            data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1
              className="text-2xl font-bold"
              data-testid="text-contract-title">
              {getContractTypeName(contract.contractType)}
            </h1>
            <p className="text-muted-foreground">
              {contract.projectName} • {contract.projectNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={getStatusBadgeVariant(contract.status)}
            data-testid="badge-status">
            {getStatusDisplayLabel(contract.status)}
          </Badge>
          <Button
            variant="outline"
            onClick={handleHtmlPreview}
            disabled={isGenerating || !contract?.projectId}
            data-testid="button-html-preview">
            <Code className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "View HTML"}
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isGenerating || !contract?.projectId}
            data-testid="button-preview">
            <Eye className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "View PDF"}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isGenerating || !contract?.projectId}
            data-testid="button-download">
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>
            Overview and metadata for this contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Contract Type</p>
              <p className="font-medium" data-testid="text-contract-type">
                {getContractTypeName(contract.contractType)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium" data-testid="text-version">
                v{contract.version}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="font-medium" data-testid="text-generated-date">
                  {contract.generatedAt
                    ? new Date(contract.generatedAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Generated By</p>
                <p className="font-medium" data-testid="text-generated-by">
                  {contract.generatedBy || "System"}
                </p>
              </div>
            </div>
          </div>
          {contract.fileName && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-2 text-sm text-muted-foreground">File</p>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span data-testid="text-filename">{contract.fileName}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Workflow</CardTitle>
          <CardDescription>
            Track and update the contract through its lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isNextOrPrevious =
                index === currentStatusIndex + 1 ||
                index === currentStatusIndex - 1;

              return (
                <div
                  key={step.key}
                  className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {index > 0 && (
                      <div
                        className={`h-1 flex-1 ${
                          index <= currentStatusIndex
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )}
                    <button
                      onClick={() =>
                        isNextOrPrevious && handleStatusChange(step.key)
                      }
                      disabled={
                        !isNextOrPrevious || updateStatusMutation.isPending
                      }
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${isCompleted ? "border-primary bg-primary text-primary-foreground" : ""} ${isCurrent ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20" : ""} ${!isCompleted && !isCurrent ? "border-muted bg-background text-muted-foreground" : ""} ${isNextOrPrevious ? "cursor-pointer hover:border-primary hover:text-primary" : ""} ${!isNextOrPrevious && !isCurrent && !isCompleted ? "cursor-not-allowed" : ""} `}
                      data-testid={`button-status-${step.key.toLowerCase()}`}>
                      <Icon className="h-5 w-5" />
                    </button>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`h-1 flex-1 ${
                          index < currentStatusIndex ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-center text-xs ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"} `}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {currentStatusIndex < statusSteps.length - 1
              ? `Click "${statusSteps[currentStatusIndex + 1]?.label}" to advance the contract status`
              : "Contract is fully executed"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Included Clauses</CardTitle>
          <CardDescription>
            {clausesLoading
              ? "Loading clauses..."
              : `${clauses?.length || 0} clauses included in this contract`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clausesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : clauses && clauses.length > 0 ? (
            <div className="space-y-2">
              {clauses.map((clause) => (
                <Collapsible
                  key={clause.id}
                  open={expandedClauses.has(clause.id)}>
                  <CollapsibleTrigger asChild>
                    <button
                      onClick={() => toggleClause(clause.id)}
                      className="hover-elevate flex w-full items-center justify-between rounded-lg border p-3 text-left"
                      data-testid={`button-clause-${clause.id}`}>
                      <div className="flex items-center gap-3">
                        {expandedClauses.has(clause.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <span className="font-medium">
                            {clause.section_number}
                          </span>
                          <span className="ml-2">{clause.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {clause.hierarchy_level}
                        </Badge>
                        {clause.risk_level && (
                          <Badge
                            variant={
                              clause.risk_level === "high"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs">
                            {clause.risk_level} risk
                          </Badge>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-7 mt-1 border-l-2 border-muted p-4">
                      <div
                        className="text-sm"
                        dangerouslySetInnerHTML={{
                          __html: formatContent(clause.content),
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No clause data available for this contract.</p>
              <p className="mt-1 text-sm">
                Clauses are embedded in the generated document.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {contract.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm" data-testid="text-notes">
              {contract.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
