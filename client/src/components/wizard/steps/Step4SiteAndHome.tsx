import { useState, useEffect } from 'react';
import { useWizard } from '../WizardContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Home, Plus, Trash2, AlertTriangle, Package } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface HomeModel {
  id: number;
  name: string;
  modelCode: string;
  bedrooms: number;
  bathrooms: number;
  sqFt: number;
  designFee: number;
  offsiteBasePrice: number;
  onsiteEstPrice: number;
}

interface ProjectUnit {
  id: number;
  projectId: number;
  modelId: number;
  unitLabel: string;
  quantity: number;
  basePriceSnapshot: number;
  customizationTotal: number;
  model: HomeModel;
}

export const Step4SiteAndHome: React.FC = () => {
  const { 
    wizardState, 
    updateProjectData,
    draftProjectId,
    setDbUnitsCount
  } = useWizard();
  
  const queryClient = useQueryClient();
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  const { projectData, validationErrors } = wizardState;

  const { data: homeModels = [], isLoading: modelsLoading } = useQuery<HomeModel[]>({
    queryKey: ['/api/home-models'],
  });

  const { data: projectUnits = [], isLoading: unitsLoading, refetch: refetchUnits } = useQuery<ProjectUnit[]>({
    queryKey: ['/api/projects', draftProjectId, 'units'],
    enabled: !!draftProjectId,
  });

  const addUnitMutation = useMutation({
    mutationFn: async (modelId: number) => {
      return apiRequest('POST', `/api/projects/${draftProjectId}/units`, { modelId });
    },
    onSuccess: () => {
      refetchUnits();
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'pricing-summary'] });
      setSelectedModelId('');
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      return apiRequest('DELETE', `/api/project-units/${unitId}`);
    },
    onSuccess: () => {
      refetchUnits();
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'pricing-summary'] });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ unitId, quantity }: { unitId: number; quantity: number }) => {
      return apiRequest('PATCH', `/api/project-units/${unitId}`, { quantity });
    },
    onSuccess: () => {
      refetchUnits();
      queryClient.invalidateQueries({ queryKey: ['/api/projects', draftProjectId, 'pricing-summary'] });
    },
  });

  useEffect(() => {
    const totalUnitCount = projectUnits.reduce((sum, unit) => sum + (unit.quantity || 1), 0);
    if (totalUnitCount !== projectData.totalUnits) {
      updateProjectData({ totalUnits: totalUnitCount || 1 });
    }
    setDbUnitsCount(totalUnitCount);
  }, [projectUnits]);

  useEffect(() => {
    const totalPrice = projectUnits.reduce((sum, unit) => sum + unit.basePriceSnapshot * (unit.quantity || 1), 0);
    if (totalPrice !== projectData.preliminaryOffsiteCost) {
      updateProjectData({ preliminaryOffsiteCost: totalPrice / 100 });
    }
  }, [projectUnits]);
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleAddUnit = () => {
    if (selectedModelId && draftProjectId) {
      addUnitMutation.mutate(parseInt(selectedModelId));
    }
  };

  const handleDeleteUnit = (unitId: number) => {
    deleteUnitMutation.mutate(unitId);
  };

  const handleQuantityChange = (unitId: number, value: string) => {
    const qty = parseInt(value);
    if (!isNaN(qty) && qty >= 1 && qty <= 999) {
      updateQuantityMutation.mutate({ unitId, quantity: qty });
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Home Models
          </CardTitle>
          <CardDescription>
            Add home models to this project. Each unit will be priced individually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!draftProjectId ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete the previous steps and save the project to add home models.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="modelSelect">Add Home Model</Label>
                  <Select
                    value={selectedModelId}
                    onValueChange={setSelectedModelId}
                    disabled={modelsLoading}
                  >
                    <SelectTrigger data-testid="select-home-model">
                      <SelectValue placeholder="Select a home model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {homeModels.map((model) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.name} - {model.bedrooms}BR/{model.bathrooms}BA, {model.sqFt.toLocaleString()} sqft ({formatCurrency(model.offsiteBasePrice)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddUnit}
                  disabled={!selectedModelId || addUnitMutation.isPending}
                  data-testid="button-add-unit"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
              </div>

              {unitsLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading units...</div>
              ) : projectUnits.length === 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You must add at least one home model to proceed.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {projectUnits.map((unit, index) => (
                    <Card key={unit.id} className="border" data-testid={`card-unit-${unit.id}`}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">
                              {unit.unitLabel}: {unit.model.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {unit.model.bedrooms}BR / {unit.model.bathrooms}BA / {unit.model.sqFt.toLocaleString()} sqft
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`qty-${unit.id}`} className="text-xs text-muted-foreground whitespace-nowrap">Qty:</Label>
                              <Input
                                id={`qty-${unit.id}`}
                                type="number"
                                min={1}
                                max={999}
                                value={unit.quantity || 1}
                                onChange={(e) => handleQuantityChange(unit.id, e.target.value)}
                                className="w-16 h-8 text-center text-sm"
                                data-testid={`input-quantity-${unit.id}`}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUnit(unit.id)}
                              disabled={deleteUnitMutation.isPending}
                              data-testid={`button-delete-unit-${unit.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
                          <div className="space-y-1">
                            <div className="flex justify-between gap-8">
                              <span className="text-muted-foreground">Unit Price (Offsite):</span>
                              <span className="font-mono">{formatCurrency(unit.basePriceSnapshot)}</span>
                            </div>
                            <div className="flex justify-between gap-8">
                              <span className="text-muted-foreground">Unit Price (Est. Onsite):</span>
                              <span className="font-mono text-muted-foreground">{formatCurrency(unit.model.onsiteEstPrice)}</span>
                            </div>
                            {(unit.quantity || 1) > 1 && (
                              <div className="flex justify-between gap-8 pt-1 border-t">
                                <span className="text-muted-foreground font-medium">x{unit.quantity} Subtotal:</span>
                                <span className="font-mono font-medium">
                                  {formatCurrency((unit.basePriceSnapshot + unit.model.onsiteEstPrice) * (unit.quantity || 1))}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">
                              {(unit.quantity || 1) > 1 ? `Total (x${unit.quantity})` : 'Total Unit Value'}
                            </span>
                            <span className="font-mono font-semibold text-primary" data-testid={`text-unit-total-${unit.id}`}>
                              {formatCurrency((unit.basePriceSnapshot + unit.model.onsiteEstPrice) * (unit.quantity || 1))}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">Total Units:</Label>
                  <Badge variant="secondary" data-testid="badge-total-units">
                    {projectUnits.reduce((sum, u) => sum + (u.quantity || 1), 0)}
                    {projectUnits.length > 1 && ` (${projectUnits.length} line items)`}
                  </Badge>
                </div>
                {projectUnits.length > 0 && (
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Offsite (Manufacturing): {formatCurrency(projectUnits.reduce((sum, u) => sum + u.basePriceSnapshot * (u.quantity || 1), 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Est. Onsite: {formatCurrency(projectUnits.reduce((sum, u) => sum + u.model.onsiteEstPrice * (u.quantity || 1), 0))}
                    </div>
                    <div className="text-lg font-semibold text-primary" data-testid="text-grand-total">
                      Grand Total: {formatCurrency(projectUnits.reduce((sum, u) => sum + (u.basePriceSnapshot + u.model.onsiteEstPrice) * (u.quantity || 1), 0))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Contract Variables</p>
              <p className="text-xs text-muted-foreground">
                This step populates {projectUnits.length * 5} contract variables
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              UNIT_MODEL, UNIT_SQFT, UNIT_PRICE, PRELIMINARY_OFFSITE_COST
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
