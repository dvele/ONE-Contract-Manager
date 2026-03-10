import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle, Plus, Building2, TrendingUp } from "lucide-react";
import type { DashboardStats, LLC } from "@shared/schema";

// Contract package type returned by /api/contracts
interface ContractPackage {
  packageId: number;
  projectId: number;
  projectName: string;
  projectNumber: string;
  status: string;
  contractValue: number;
  generatedAt: string;
  isDraft: boolean;
  contracts: any[];
  title: string;
  clientName: string;
  contractCount: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  isLoading?: boolean;
}

function StatCard({ title, value, description, icon: Icon, testId, isLoading }: StatCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`${testId}-value`}>
            {value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}


export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ContractPackage[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: llcs = [], isLoading: llcsLoading } = useQuery<LLC[]>({
    queryKey: ["/api/llcs"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const recentContracts = contracts.slice(-4).reverse();
  const recentLLCs = llcs.slice(-4).reverse();

  return (
    <div className="flex-1 p-6 md:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contract and LLC management overview
          </p>
        </div>
        <Link href="/generate-contracts">
          <Button data-testid="button-new-contract">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Primary KPIs - Contract Pipeline Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Contracts"
          value={stats?.totalContracts ?? 0}
          description="All time"
          icon={FileText}
          testId="card-total-contracts"
          isLoading={statsLoading}
        />
        <StatCard
          title="Drafts"
          value={stats?.drafts ?? 0}
          description="In progress"
          icon={FileText}
          testId="card-drafts"
          isLoading={statsLoading}
        />
        <StatCard
          title="Pending Review"
          value={stats?.pendingReview ?? 0}
          description="Awaiting approval"
          icon={Clock}
          testId="card-pending-review"
          isLoading={statsLoading}
        />
        <StatCard
          title="Signed"
          value={stats?.signed ?? 0}
          description="Completed"
          icon={CheckCircle}
          testId="card-signed"
          isLoading={statsLoading}
        />
      </div>

      {/* Secondary Row - Operations & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Operations Overview */}
        <Card data-testid="card-operations">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="stat-active-projects">
                <p className="text-xs text-muted-foreground mb-1">Active Projects</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold">{stats?.activeProjects ?? 0}</p>
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="stat-pending-llcs">
                <p className="text-xs text-muted-foreground mb-1">Pending LLCs</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold">{stats?.pendingLLCs ?? 0}</p>
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="stat-total-value">
                <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-16 mx-auto" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(stats?.totalContractValue ?? 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Value Breakdown */}
        <Card data-testid="card-value-overview">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Value by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="value-drafts">
                <p className="text-xs text-muted-foreground mb-1">Drafts</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-16 mx-auto" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(stats?.draftsValue ?? 0)}</p>
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="value-pending">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-16 mx-auto" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(stats?.pendingValue ?? 0)}</p>
                )}
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50" data-testid="value-signed">
                <p className="text-xs text-muted-foreground mb-1">Signed</p>
                {statsLoading ? (
                  <Skeleton className="h-7 w-16 mx-auto" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(stats?.signedValue ?? 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Section - Tabbed Recent Items + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity with Tabs */}
        <Card className="lg:col-span-2" data-testid="card-recent-activity">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="contracts" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="contracts" data-testid="tab-contracts">Contracts</TabsTrigger>
                <TabsTrigger value="llcs" data-testid="tab-llcs">LLCs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="contracts" className="mt-0">
                {contractsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : recentContracts.length > 0 ? (
                  <div className="space-y-1">
                    {recentContracts.map((contract, index) => (
                      <div 
                        key={contract.packageId} 
                        className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover-elevate"
                        data-testid={`row-contract-${index}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{contract.projectName}</p>
                            <p className="text-xs text-muted-foreground truncate">{contract.projectNumber}</p>
                          </div>
                        </div>
                        <StatusBadge status={contract.status || 'draft'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <p className="text-sm">No contracts yet</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="llcs" className="mt-0">
                {llcsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : recentLLCs.length > 0 ? (
                  <div className="space-y-1">
                    {recentLLCs.map((llc, index) => (
                      <div 
                        key={llc.id} 
                        className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover-elevate"
                        data-testid={`row-llc-${index}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{llc.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{llc.projectName}</p>
                          </div>
                        </div>
                        <LLCStatusBadge status={llc.status || 'pending'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <p className="text-sm">No LLCs yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card data-testid="card-quick-start">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quick Start</CardTitle>
            <CardDescription>Get started with contracts and LLCs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-col flex">
            <Link href="/generate-contracts">
              <Button className="w-full" data-testid="button-create-contract">
                <FileText className="h-4 w-4 mr-2" />
                Create New Contract
              </Button>
            </Link>
            <Link href="/admin/llcs">
              <Button variant="outline" className="w-full" data-testid="button-manage-llcs">
                <Building2 className="h-4 w-4 mr-2" />
                Manage LLCs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    pending_review: { label: "Pending", variant: "outline" },
    approved: { label: "Approved", variant: "default" },
    signed: { label: "Signed", variant: "default" },
    expired: { label: "Expired", variant: "destructive" },
  };
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}

function LLCStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "outline" },
    formed: { label: "Formed", variant: "default" },
    dissolved: { label: "Dissolved", variant: "destructive" },
  };
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant={config.variant} data-testid={`badge-llc-status-${status}`}>
      {config.label}
    </Badge>
  );
}
