import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWizard } from '../WizardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, RefreshCw, AlertTriangle, Calculator, Loader2, Receipt } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PaymentScheduleItem {
  name: string;
  percentage: number;
  amount: number;
  phase: string;
}

interface PricingBreakdown {
  totalDesignFee: number;
  totalOffsite: number;
  totalOnsite: number;
  totalCustomizations: number;
  totalShipping: number;
}

interface PricingSummary {
  breakdown: PricingBreakdown;
  grandTotal: number;
  contractValue: number;
  serviceModel: string;
  paymentSchedule: PaymentScheduleItem[];
  unitCount: number;
}

export const Step7Pricing: React.FC = () => {
  const { 
    wizardState, 
    draftProjectId,
    updateProjectData
  } = useWizard();
  
  const { projectData } = wizardState;
  const queryClient = useQueryClient();
  
  const [additionalSiteWork, setAdditionalSiteWork] = useState<number>(0);
  const [designFeeAmount, setDesignFeeAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDesignFee, setIsSavingDesignFee] = useState(false);
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };
  
  const { data: pricingSummary, isLoading, isError, refetch } = useQuery<PricingSummary>({
    queryKey: ['/api/projects', draftProjectId, 'pricing-summary'],
    enabled: !!draftProjectId,
  });
  
  const { data: financialsData } = useQuery<{ prelimOnsite?: number; designFee?: number }>({
    queryKey: ['/api/projects', draftProjectId, 'financials'],
    enabled: !!draftProjectId,
  });
  
  useEffect(() => {
    if (financialsData?.prelimOnsite != null) {
      setAdditionalSiteWork(financialsData.prelimOnsite);
    } else if (financialsData !== undefined) {
      setAdditionalSiteWork(0);
    }
  }, [financialsData?.prelimOnsite]);

  useEffect(() => {
    if (financialsData?.designFee !== undefined && financialsData.designFee !== null) {
      setDesignFeeAmount(financialsData.designFee);
    }
  }, [financialsData?.designFee]);
  
  // Sync pricing data to wizard context when loaded
  useEffect(() => {
    if (pricingSummary && pricingSummary.grandTotal > 0) {
      updateProjectData({
        contractPrice: pricingSummary.grandTotal / 100,
        designFee: pricingSummary.breakdown.totalDesignFee / 100,
        preliminaryOffsiteCost: pricingSummary.breakdown.totalOffsite / 100,
        preliminaryOnsiteCost: pricingSummary.breakdown.totalOnsite / 100,
      });
    }
  }, [pricingSummary, updateProjectData]);
  
  const hasUnits = pricingSummary && pricingSummary.unitCount > 0;
  
  const saveDesignFeeMutation = useMutation({
    mutationFn: async (designFee: number) => {
      if (!draftProjectId) throw new Error('Project not saved yet');
      return apiRequest('PATCH', `/api/projects/${draftProjectId}/financials`, {
        designFee
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'pricing-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'financials'] });
    }
  });

  const handleSaveDesignFee = async () => {
    if (!draftProjectId) return;
    setIsSavingDesignFee(true);
    try {
      await saveDesignFeeMutation.mutateAsync(designFeeAmount);
      await refetch();
    } finally {
      setIsSavingDesignFee(false);
    }
  };

  const savePrelimOnsiteMutation = useMutation({
    mutationFn: async (prelimOnsite: number) => {
      if (!draftProjectId) throw new Error('Project not saved yet');
      return apiRequest('PATCH', `/api/projects/${draftProjectId}/financials`, {
        prelimOnsite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'pricing-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'financials'] });
    }
  });
  
  const handleSaveAndRecalculate = async () => {
    if (!draftProjectId) return;
    setIsSaving(true);
    try {
      await savePrelimOnsiteMutation.mutateAsync(additionalSiteWork);
      await refetch();
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!draftProjectId) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Project Not Saved</p>
                <p className="text-sm text-muted-foreground">
                  Please complete Steps 1-6 and save the project to view dynamic pricing. 
                  The pricing engine calculates costs based on your selected home model units.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Dashboard
          </CardTitle>
          <CardDescription>
            Costs calculated from your selected home model units
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to load pricing data</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : hasUnits ? (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {pricingSummary.unitCount} Unit{pricingSummary.unitCount !== 1 ? 's' : ''} Selected
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => refetch()}
                  data-testid="button-refresh-pricing"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Design Fee</p>
                  <p className="text-xl font-bold" data-testid="text-total-design-fee">
                    {formatCurrency(pricingSummary.breakdown.totalDesignFee)}
                  </p>
                  {pricingSummary.breakdown.totalDesignFee === 0 && (
                    <p className="text-xs text-amber-500 mt-1">Set design fee below</p>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Offsite (Factory + Shipping)</p>
                  <p className="text-xl font-bold" data-testid="text-total-offsite">
                    {formatCurrency(pricingSummary.breakdown.totalOffsite + (pricingSummary.breakdown.totalShipping || 0))}
                  </p>
                  {(pricingSummary.breakdown.totalShipping || 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Factory: {formatCurrency(pricingSummary.breakdown.totalOffsite)} + Shipping: {formatCurrency(pricingSummary.breakdown.totalShipping)}
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Onsite Estimate</p>
                  <p className="text-xl font-bold" data-testid="text-total-onsite">
                    {formatCurrency(pricingSummary.breakdown.totalOnsite)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-grand-total">
                    {formatCurrency(pricingSummary.grandTotal)}
                  </p>
                </div>
              </div>
              
              {pricingSummary.breakdown.totalCustomizations > 0 && (
                <div className="text-sm text-muted-foreground">
                  Includes {formatCurrency(pricingSummary.breakdown.totalCustomizations)} in customizations
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No units added to this project yet.</p>
              <p className="text-sm">Go to Step 1 to add home model units.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Design Fee
          </CardTitle>
          <CardDescription>
            Total design/pre-production fee for this project (set during sales process)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="designFeeInput">Design Fee Amount (in dollars)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="designFeeInput"
                  type="number"
                  value={designFeeAmount / 100 || ''}
                  onChange={(e) => setDesignFeeAmount(Math.round(parseFloat(e.target.value || '0') * 100))}
                  placeholder="0"
                  className="pl-9"
                  min={0}
                  data-testid="input-design-fee-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This is the project-level design fee used in contract pricing
              </p>
            </div>
            <div>
              <Button
                onClick={handleSaveDesignFee}
                disabled={isSavingDesignFee || !draftProjectId}
                data-testid="button-save-design-fee"
              >
                {isSavingDesignFee ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Save & Recalculate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Additional Site Work / Buffer
          </CardTitle>
          <CardDescription>
            Extra costs added to the standard model onsite estimates (foundation work, special permits, site access, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="additionalSiteWork">Additional Amount (in dollars)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="additionalSiteWork"
                  type="number"
                  value={additionalSiteWork / 100 || ''}
                  onChange={(e) => setAdditionalSiteWork(Math.round(parseFloat(e.target.value || '0') * 100))}
                  placeholder="0"
                  className="pl-9"
                  min={0}
                  data-testid="input-additional-site-work"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This amount is added to the Total Onsite Estimate calculated from your units
              </p>
            </div>
            <div>
              <Button 
                onClick={handleSaveAndRecalculate}
                disabled={isSaving || !draftProjectId}
                data-testid="button-save-recalculate"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Save & Recalculate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Schedule
          </CardTitle>
          <CardDescription>
            Milestone-based payment breakdown generated from pricing engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : pricingSummary && pricingSummary.paymentSchedule.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase Name</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingSummary.paymentSchedule.map((item, index) => (
                  <TableRow key={index} data-testid={`row-payment-schedule-${index}`}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.phase}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.percentage}%</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">
                    {pricingSummary.paymentSchedule.reduce((sum, item) => sum + item.percentage, 0)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(pricingSummary.paymentSchedule.reduce((sum, item) => sum + item.amount, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment schedule available.</p>
              <p className="text-sm">Add units in Step 1 to generate a payment schedule.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Contract Variables</p>
              <p className="text-xs text-muted-foreground">
                Pricing data flows into contract generation automatically
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              GRAND_TOTAL, DESIGN_FEE, OFFSITE_COST, ONSITE_ESTIMATE
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
