import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Phase {
  id: number;
  phaseNumber: number;
  name: string | null;
}

interface Property {
  id: number;
  propertyCode: string;
  phaseId: number | null;
  apn: string | null;
  lotNumber: string | null;
  address: string | null;
}

export const PropertyPhaseEditor: React.FC<{ projectId: number }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const phasesKey = ["/api/projects", projectId, "phases"];
  const propertiesKey = ["/api/projects", projectId, "properties"];

  const { data: phases = [] } = useQuery<Phase[]>({ queryKey: phasesKey });
  const { data: propertyRows = [] } = useQuery<Property[]>({ queryKey: propertiesKey });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: phasesKey });
    queryClient.invalidateQueries({ queryKey: propertiesKey });
  };

  const addPhase = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/projects/${projectId}/phases`, {
        name: `Phase ${phases.length + 1}`,
      }),
    onSuccess: invalidate,
  });

  const addProperty = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${projectId}/properties`, {}),
    onSuccess: invalidate,
  });

  const assignPhase = useMutation({
    mutationFn: ({ propertyId, phaseId }: { propertyId: number; phaseId: number | null }) =>
      apiRequest("PATCH", `/api/properties/${propertyId}`, { phaseId }),
    onSuccess: invalidate,
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, field, value }: { propertyId: number; field: string; value: string }) =>
      apiRequest("PATCH", `/api/properties/${propertyId}`, { [field]: value }),
    onSuccess: invalidate,
  });

  const removeProperty = useMutation({
    mutationFn: (propertyId: number) => apiRequest("DELETE", `/api/properties/${propertyId}`),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
              Properties &amp; Phases
            </CardTitle>
            <CardDescription>
              Each property is one lot, holding up to a home and an ADU. Phases group
              properties for pricing, scheduling and payment milestones.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addPhase.mutate()}
              disabled={addPhase.isPending}
              data-testid="button-add-phase"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add Phase
            </Button>
            <Button
              size="sm"
              onClick={() => addProperty.mutate()}
              disabled={addProperty.isPending}
              data-testid="button-add-property"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Add Property
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {propertyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No properties yet. Add one for each lot in the project.
          </p>
        ) : (
          propertyRows.map((property) => {
            const detailsId = `property-details-${property.id}`;
            const isExpanded = expanded === property.id;
            return (
              <div key={property.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{property.propertyCode}</Badge>
                    <Select
                      value={property.phaseId ? String(property.phaseId) : "unassigned"}
                      onValueChange={(value) =>
                        assignPhase.mutate({
                          propertyId: property.id,
                          phaseId: value === "unassigned" ? null : parseInt(value, 10),
                        })
                      }
                    >
                      <SelectTrigger
                        className="w-44"
                        aria-label={`Phase for property ${property.propertyCode}`}
                        data-testid={`select-phase-${property.id}`}
                      >
                        <SelectValue placeholder="Assign a phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {phases.map((phase) => (
                          <SelectItem key={phase.id} value={String(phase.id)}>
                            {phase.name || `Phase ${phase.phaseNumber}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isExpanded ? null : property.id)}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      data-testid={`button-details-${property.id}`}
                    >
                      {isExpanded ? "Hide details" : "Details"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProperty.mutate(property.id)}
                      disabled={removeProperty.isPending}
                      aria-label={`Delete property ${property.propertyCode}`}
                      data-testid={`button-delete-property-${property.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div id={detailsId} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                    {(["apn", "lotNumber", "address"] as const).map((field) => (
                      <div key={field} className="space-y-1">
                        <Label htmlFor={`${field}-${property.id}`} className="text-xs">
                          {field === "apn" ? "APN" : field === "lotNumber" ? "Lot Number" : "Address"}
                        </Label>
                        <Input
                          id={`${field}-${property.id}`}
                          defaultValue={property[field] || ""}
                          onBlur={(e) =>
                            patchProperty.mutate({
                              propertyId: property.id,
                              field,
                              value: e.target.value,
                            })
                          }
                          data-testid={`input-${field}-${property.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {removeProperty.isError && (
          <p className="text-sm text-destructive" role="alert" data-testid="text-delete-property-error">
            Remove the units attached to this property before deleting it.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
