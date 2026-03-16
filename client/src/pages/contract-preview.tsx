import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code,
  ArrowRightLeft,
  Layers,
  Eye,
  Hash,
  DollarSign,
  Calendar,
  Building2,
  MapPin,
  Home,
  Users,
  Shield,
} from "lucide-react";

interface VariableCategory {
  category: string;
  variables: { name: string; category: string }[];
}

interface VariablesResponse {
  categories: VariableCategory[];
  allVariables: string[];
  totalCount: number;
}

interface ClauseComparison {
  crc: { totalClauses: number; clauses: any[] };
  cmos: { totalClauses: number; clauses: any[] };
  comparison: {
    crcOnly: { id: number; code: string; name: string }[];
    cmosOnly: { id: number; code: string; name: string }[];
    shared: number;
    crcTotal: number;
    cmosTotal: number;
  };
}

const CATEGORY_ICONS: Record<string, any> = {
  project: Building2,
  client: Users,
  childLlc: Building2,
  site: MapPin,
  home: Home,
  specifications: Shield,
  dates: Calendar,
  pricing: DollarSign,
  milestones: Hash,
  warranty: Shield,
  contractors: Users,
  insurance: Shield,
};

const SAMPLE_PROJECT_DATA = {
  serviceModel: "CRC",
  projectNumber: "PRJ-2025-001",
  projectName: "Smith Residence",
  clientLegalName: "John Smith",
  deliveryAddress: "123 Main St",
};

export default function ContractPreview() {
  const [serviceModel, setServiceModel] = useState<"CRC" | "CMOS">("CRC");
  const [populatedVariables, setPopulatedVariables] = useState<Set<string>>(new Set([
    "PROJECT_NUMBER", "PROJECT_NAME", "CLIENT_LEGAL_NAME", 
    "DELIVERY_ADDRESS", "AGREEMENT_EXECUTION_DATE"
  ]));

  const { data: variablesData, isLoading: variablesLoading } = useQuery<VariablesResponse>({
    queryKey: ["/api/variables"],
  });

  const { data: comparisonData, isLoading: comparisonLoading } = useQuery<ClauseComparison>({
    queryKey: ["/api/contracts/compare-service-models", serviceModel],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/contracts/compare-service-models", { projectData: { ...SAMPLE_PROJECT_DATA, serviceModel } });
      return response.json();
    },
  });

  const getCategoryIcon = (category: string) => {
    const Icon = CATEGORY_ICONS[category] || Code;
    return <Icon className="h-4 w-4" />;
  };

  const getPopulatedCount = (variables: { name: string }[]) => {
    return variables.filter(v => populatedVariables.has(v.name)).length;
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Contract Preview</h1>
            <p className="text-muted-foreground">
              Preview clauses, variables, and CRC/CMOS differences
            </p>
          </div>
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="service-model-toggle" className="text-sm">Service Model:</Label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${serviceModel === "CRC" ? "font-bold text-primary" : "text-muted-foreground"}`}>
                CRC
              </span>
              <Switch
                id="service-model-toggle"
                checked={serviceModel === "CMOS"}
                onCheckedChange={(checked) => setServiceModel(checked ? "CMOS" : "CRC")}
                data-testid="switch-service-model"
              />
              <span className={`text-sm ${serviceModel === "CMOS" ? "font-bold text-primary" : "text-muted-foreground"}`}>
                CMOS
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="clauses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="clauses" data-testid="tab-clauses">
              <FileText className="h-4 w-4 mr-2" />
              Clause Preview
            </TabsTrigger>
            <TabsTrigger value="variables" data-testid="tab-variables">
              <Code className="h-4 w-4 mr-2" />
              Variables
            </TabsTrigger>
            <TabsTrigger value="comparison" data-testid="tab-comparison">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              CRC vs CMOS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clauses" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {comparisonLoading ? "..." : (serviceModel === "CRC" ? comparisonData?.crc.totalClauses : comparisonData?.cmos.totalClauses) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Clauses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {comparisonLoading ? "..." : (serviceModel === "CRC" ? comparisonData?.comparison.crcOnly.length : comparisonData?.comparison.cmosOnly.length) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Conditional for {serviceModel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {comparisonLoading ? "..." : comparisonData?.comparison.shared || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Shared Clauses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Clauses for {serviceModel} Service Model
                </CardTitle>
                <CardDescription>
                  These clauses will be included in contracts for {serviceModel === "CRC" ? "Client-Retained Contractor" : "Client-Managed On-Site"} projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {(serviceModel === "CRC" ? comparisonData?.crc.clauses : comparisonData?.cmos.clauses)?.map((clause: any) => (
                        <div
                          key={clause.id}
                          className={`p-3 rounded-lg border ${
                            clause.conditions ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30"
                          }`}
                          data-testid={`clause-preview-${clause.id}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              {clause.clause_code}
                            </Badge>
                            <span className="font-medium text-sm">{clause.name}</span>
                            {clause.conditions && (
                              <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                <Zap className="h-3 w-3 mr-1" />
                                Conditional
                              </Badge>
                            )}
                          </div>
                          {clause.category && (
                            <p className="text-xs text-muted-foreground mt-1">{clause.category}</p>
                          )}
                        </div>
                      )) || (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No clauses found for this service model</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variables" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{variablesData?.totalCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Variables</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{populatedVariables.size}</p>
                      <p className="text-xs text-muted-foreground">Populated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(variablesData?.totalCount || 0) - populatedVariables.size}</p>
                      <p className="text-xs text-muted-foreground">Empty</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Contract Variables</CardTitle>
                <CardDescription>
                  View all {variablesData?.totalCount || 0} variables organized by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {variablesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variablesData?.categories.map((cat) => (
                      <div key={cat.category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(cat.category)}
                            <h4 className="font-medium capitalize">{cat.category}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {cat.variables.length} vars
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getPopulatedCount(cat.variables)} / {cat.variables.length} populated
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {cat.variables.map((v) => {
                            const isPopulated = populatedVariables.has(v.name);
                            return (
                              <Badge
                                key={v.name}
                                variant={isPopulated ? "default" : "outline"}
                                className={`font-mono text-xs cursor-pointer ${
                                  isPopulated 
                                    ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30" 
                                    : "opacity-60"
                                }`}
                                onClick={() => {
                                  setPopulatedVariables(prev => {
                                    const next = new Set(prev);
                                    if (next.has(v.name)) {
                                      next.delete(v.name);
                                    } else {
                                      next.add(v.name);
                                    }
                                    return next;
                                  });
                                }}
                                data-testid={`var-${v.name}`}
                              >
                                {isPopulated ? (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {v.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  CRC vs CMOS Clause Differences
                </CardTitle>
                <CardDescription>
                  Compare which clauses are unique to each service model
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-blue-500">CRC Only</Badge>
                        <span className="text-sm text-muted-foreground">
                          {comparisonData?.comparison.crcOnly.length || 0} clauses
                        </span>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {comparisonData?.comparison.crcOnly.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No CRC-specific clauses
                            </p>
                          ) : (
                            comparisonData?.comparison.crcOnly.map((clause) => (
                              <div key={clause.id} className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {clause.code}
                                  </Badge>
                                  <span className="text-sm">{clause.name}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-purple-500">CMOS Only</Badge>
                        <span className="text-sm text-muted-foreground">
                          {comparisonData?.comparison.cmosOnly.length || 0} clauses
                        </span>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {comparisonData?.comparison.cmosOnly.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No CMOS-specific clauses
                            </p>
                          ) : (
                            comparisonData?.comparison.cmosOnly.map((clause) => (
                              <div key={clause.id} className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {clause.code}
                                  </Badge>
                                  <span className="text-sm">{clause.name}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                <Separator className="my-6" />

                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-500">{comparisonData?.comparison.crcTotal || 0}</p>
                    <p className="text-sm text-muted-foreground">CRC Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">{comparisonData?.comparison.shared || 0}</p>
                    <p className="text-sm text-muted-foreground">Shared</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-500">{comparisonData?.comparison.cmosTotal || 0}</p>
                    <p className="text-sm text-muted-foreground">CMOS Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
