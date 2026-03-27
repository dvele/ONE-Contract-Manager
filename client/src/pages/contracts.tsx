import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  FileCheck,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  Pencil,
  Download,
  Code,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";

interface ContractInfo {
  id: number;
  contractType: string;
  fileName: string;
  status: string;
  generatedAt: string;
  templateVersion: number | null;
  currentTemplateVersion: number | null;
}

interface ContractPackage {
  packageId: number;
  projectId: number;
  projectName: string;
  projectNumber: string;
  status: string;
  contractValue: number;
  generatedAt: string;
  contracts: ContractInfo[];
  title: string;
  clientName: string;
  contractCount: number;
  isDraft?: boolean;
}

export default function Contracts() {
  const queryClient = useQueryClient();
  const { data: packages = [], isLoading } = useQuery<ContractPackage[]>({
    queryKey: ["/api/contracts"],
  });
  const { toast } = useToast();

  const [expandedPackages, setExpandedPackages] = useState<Set<number>>(
    new Set()
  );
  const [generatingContract, setGeneratingContract] = useState<number | null>(
    null
  );
  const [scrapTarget, setScrapTarget] = useState<ContractPackage | null>(null);

  const scrapMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}/draft`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Draft scrapped",
        description: "The draft has been deleted.",
      });
      setScrapTarget(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to scrap draft.",
        variant: "destructive",
      });
      setScrapTarget(null);
    },
  });

  const getContractTypeForApi = (type: string): string => {
    const typeMap: Record<string, string> = {
      master_ef: "MASTER_EF",
      MASTER_EF: "MASTER_EF",
      "Master Ef": "MASTER_EF",
      one_agreement: "ONE",
      manufacturing_sub: "MANUFACTURING",
      onsite_sub: "ONSITE",
      ONE: "ONE",
      MANUFACTURING: "MANUFACTURING",
      ONSITE: "ONSITE",
    };
    return typeMap[type] || type.toUpperCase();
  };

  const handleHtmlPreview = async (
    projectId: number,
    contractType: string,
    contractId: number
  ) => {
    setGeneratingContract(contractId);
    try {
      const response = await apiRequest("POST", "/api/contracts/draft-preview", {
        contractType: getContractTypeForApi(contractType),
        projectId,
      });
      const html = await response.text();
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Preview Failed",
        description: "Failed to generate HTML preview.",
        variant: "destructive",
      });
    } finally {
      setGeneratingContract(null);
    }
  };

  const handleDownloadPdf = async (
    projectId: number,
    contractType: string,
    contractId: number,
    projectNumber: string
  ) => {
    setGeneratingContract(contractId);
    try {
      const apiType = getContractTypeForApi(contractType);
      window.open(
        `/api/contracts/download-pdf/${projectId}/${apiType}`,
        "_blank"
      );
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download PDF.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setGeneratingContract(null), 2000);
    }
  };

  const handleRegenerate = async (contractId: number) => {
    setGeneratingContract(contractId);
    try {
      await apiRequest("POST", `/api/contracts/${contractId}/regenerate`);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract regenerated with latest template" });
    } catch {
      toast({
        title: "Regeneration failed",
        description: "Could not regenerate contract.",
        variant: "destructive",
      });
    } finally {
      setGeneratingContract(null);
    }
  };

  const isStale = (contract: ContractInfo): boolean =>
    contract.templateVersion !== null &&
    contract.currentTemplateVersion !== null &&
    contract.currentTemplateVersion > contract.templateVersion;

  const togglePackage = (packageId: number) => {
    setExpandedPackages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(packageId)) {
        newSet.delete(packageId);
      } else {
        newSet.add(packageId);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatContractType = (type: string) => {
    const typeMap: Record<string, string> = {
      master_ef: "Master Purchase Agreement",
      MASTER_EF: "Master Purchase Agreement",
      one_agreement: "ONE Agreement (Archived)",
      manufacturing_sub: "Manufacturing Subcontract (Archived)",
      onsite_sub: "OnSite Subcontract (Archived)",
    };
    return (
      typeMap[type] ||
      type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground"
            data-testid="text-page-title">
            Active Contracts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all your contract packages
          </p>
        </div>
        <Link href="/generate-contracts">
          <Button data-testid="button-new-contract">
            <Plus className="mr-2 h-4 w-4" />
            New Contract Package
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Contract Packages
          </CardTitle>
          <CardDescription>
            Each package contains ONE Agreement, Manufacturing Subcontract, and
            OnSite Subcontract
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b py-4 last:border-b-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : packages.length > 0 ? (
            <div className="space-y-2">
              {packages.map((pkg, index) =>
                pkg.isDraft ? (
                  <div
                    key={pkg.packageId}
                    className="rounded-lg border bg-card"
                    data-testid={`row-package-${index}`}>
                    <div className="flex items-center justify-between gap-4 px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10">
                          <Pencil className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {pkg.projectName}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              Draft
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pkg.projectNumber} • Not yet generated
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Link
                          href={`/generate-contracts?projectId=${pkg.projectId}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-resume-draft-${pkg.projectId}`}>
                            <Pencil className="mr-2 h-3 w-3" />
                            Resume Draft
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          // className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setScrapTarget(pkg)}
                          data-testid={`button-scrap-draft-${pkg.projectId}`}>
                          <Trash2 className="mr-2 h-3 w-3" />
                          Scrap
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Collapsible
                    key={pkg.packageId}
                    open={expandedPackages.has(pkg.packageId)}
                    onOpenChange={() => togglePackage(pkg.packageId)}>
                    <div
                      className="rounded-lg border bg-card"
                      data-testid={`row-package-${index}`}>
                      <CollapsibleTrigger asChild>
                        <div className="hover-elevate flex cursor-pointer items-center justify-between gap-4 rounded-lg px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {pkg.projectName}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {pkg.contractCount} contracts
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {pkg.projectNumber} •{" "}
                                {formatCurrency(pkg.contractValue)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <StatusBadge status={pkg.status} />
                            {pkg.status === "draft" && (
                              <>
                                <Link
                                  href={`/generate-contracts?projectId=${pkg.projectId}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`button-edit-package-${pkg.projectId}`}
                                    onClick={(e) => e.stopPropagation()}>
                                    <Pencil className="mr-2 h-3 w-3" />
                                    Edit
                                  </Button>
                                </Link>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  // className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setScrapTarget(pkg);
                                  }}
                                  data-testid={`button-scrap-draft-${pkg.projectId}`}>
                                  <Trash2 className="mr-2 h-3 w-3" />
                                  Scrap
                                </Button>
                              </>
                            )}
                            {expandedPackages.has(pkg.packageId) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 px-4 py-3">
                          <p className="mb-3 text-xs font-medium text-muted-foreground">
                            Contracts in this package:
                          </p>
                          <div className="space-y-2">
                            {pkg.contracts.map((contract) => (
                              <div
                                key={contract.id}
                                className="flex items-center justify-between gap-4 rounded-md bg-background px-3 py-2"
                                data-testid={`row-contract-${contract.id}`}>
                                <div className="flex min-w-0 items-center gap-3">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">
                                        {formatContractType(contract.contractType)}
                                      </p>
                                      {isStale(contract) && (
                                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                          Template v{contract.templateVersion} → v{contract.currentTemplateVersion}
                                        </span>
                                      )}
                                      {!isStale(contract) && contract.currentTemplateVersion !== null && (
                                        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                          Template v{contract.currentTemplateVersion}
                                        </span>
                                      )}
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {contract.fileName}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <StatusBadge
                                    status={contract.status}
                                    size="sm"
                                  />
                                  {isStale(contract) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRegenerate(contract.id);
                                      }}
                                      disabled={generatingContract === contract.id}
                                      data-testid={`button-regenerate-${contract.id}`}>
                                      <RotateCcw className="mr-1 h-3 w-3" />
                                      Regenerate
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHtmlPreview(
                                        pkg.projectId,
                                        contract.contractType,
                                        contract.id
                                      );
                                    }}
                                    disabled={
                                      generatingContract === contract.id
                                    }
                                    data-testid={`button-html-preview-${contract.id}`}
                                    title="View HTML">
                                    <Code className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadPdf(
                                        pkg.projectId,
                                        contract.contractType,
                                        contract.id,
                                        pkg.projectNumber
                                      );
                                    }}
                                    disabled={
                                      generatingContract === contract.id
                                    }
                                    data-testid={`button-download-${contract.id}`}
                                    title="Download PDF">
                                    <Download className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    data-testid={`button-edit-contract-${contract.id}`}>
                                    <Link
                                      href={`/contracts/${contract.id}/edit`}>
                                      Open
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileCheck className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No contract packages yet</p>
              <p className="mt-1 text-xs">
                Create your first contract package to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!scrapTarget}
        onOpenChange={(open) => {
          if (!open) setScrapTarget(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scrap this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the draft for{" "}
              <strong>{scrapTarget?.projectName}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                scrapTarget && scrapMutation.mutate(scrapTarget.projectId)
              }
              disabled={scrapMutation.isPending}>
              {scrapMutation.isPending ? "Scrapping…" : "Scrap Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
