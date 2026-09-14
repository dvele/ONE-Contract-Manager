import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Home, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Property {
  id: number;
  propertyCode: string;
  lotNumber: string | null;
  address: string | null;
}

interface HomeModel {
  id: number;
  name: string;
  modelCode: string;
  sqFt: number;
  offsiteBasePrice: number;
}

interface UnitConfiguration {
  id: number;
  name: string;
  sqFt: number;
  pricePerSqFtLow: number;
  pricePerSqFtHigh: number;
  derivedOffsitePrice: number;
}

interface AttachedUnit {
  id: number;
  unitLabel: string | null;
  propertyId: number | null;
  unitRole: string | null;
  model: HomeModel | null;
  configuration: UnitConfiguration | null;
}

const UNIT_ROLES = ["home", "adu"] as const;
type UnitRole = (typeof UNIT_ROLES)[number];

const ROLE_LABELS: Record<UnitRole, string> = { home: "Home", adu: "ADU" };

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const perSqFtFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormat = new Intl.NumberFormat("en-US");

const NON_BREAKING_SPACE = " ";

function sqFtLabel(sqFt: number): string {
  return `${numberFormat.format(sqFt)}${NON_BREAKING_SPACE}sqft`;
}

/** Every stored money value is an integer number of cents. */
function formatCents(cents: number): string {
  return currencyFormat.format(cents / 100);
}

function formatCentsPerSqFt(cents: number): string {
  return perSqFtFormat.format(cents / 100);
}

/** The only dollars-to-cents conversion in this component. */
function dollarsToCents(dollars: string): number {
  return Math.round(Number(dollars) * 100);
}

/**
 * `apiRequest` throws `Error("409: {\"error\":\"…\"}")`. Recover the route's own
 * message so the reader sees "This property already has a home" rather than a
 * generic failure.
 */
function serverMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const body = error.message.slice(error.message.indexOf(":") + 1).trim();
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not a JSON body — fall through to the caller's message.
  }
  return fallback;
}

const WHOLE_NUMBER = /^\d+$/;
const DOLLAR_AMOUNT = /^\d+(\.\d{1,2})?$/;

// Every field stays a string through the form so react-hook-form's values match
// what the inputs hold; dollars become cents once, at submit.
const configurationFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name for this configuration.").max(120),
    sqFt: z
      .string()
      .refine((value) => WHOLE_NUMBER.test(value.trim()), "Enter the square footage as a whole number.")
      .refine((value) => Number(value) > 0, "Square footage must be greater than 0.")
      .refine((value) => Number(value) <= 100_000, "Square footage must be 100,000 or less."),
    pricePerSqFtLow: z
      .string()
      .refine((value) => DOLLAR_AMOUNT.test(value.trim()), "Enter the low price in dollars, such as 450.00."),
    pricePerSqFtHigh: z
      .string()
      .refine((value) => DOLLAR_AMOUNT.test(value.trim()), "Enter the high price in dollars, such as 520.00."),
  })
  .refine((values) => Number(values.pricePerSqFtHigh) >= Number(values.pricePerSqFtLow), {
    message: "The high price must be at least the low price.",
    path: ["pricePerSqFtHigh"],
  });

type ConfigurationFormValues = z.infer<typeof configurationFormSchema>;

const EMPTY_CONFIGURATION_FORM: ConfigurationFormValues = {
  name: "",
  sqFt: "",
  pricePerSqFtLow: "",
  pricePerSqFtHigh: "",
};

function modelSummary(model: HomeModel): string {
  return `${sqFtLabel(model.sqFt)} · ${formatCents(model.offsiteBasePrice)}`;
}

function configurationRange(configuration: UnitConfiguration): string {
  return `${formatCentsPerSqFt(configuration.pricePerSqFtLow)}–${formatCentsPerSqFt(
    configuration.pricePerSqFtHigh,
  )}/sqft`;
}

function configurationSummary(configuration: UnitConfiguration): string {
  return `${configurationRange(configuration)} · ${sqFtLabel(configuration.sqFt)} · ${formatCents(
    configuration.derivedOffsitePrice,
  )} at the high end`;
}

export const UnitAttachmentEditor: React.FC<{ projectId: number }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [openSlot, setOpenSlot] = useState<{ propertyId: number; role: UnitRole } | null>(null);
  const [source, setSource] = useState<string>("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttachedUnit | null>(null);
  // One slot is open at a time, so a single ref reaches the open slot's trigger
  // to move focus onto it when the attach is rejected for having no source.
  const sourceTriggerRef = useRef<HTMLButtonElement>(null);

  const propertiesKey = ["/api/projects", projectId, "properties"];
  const unitsKey = ["/api/projects", projectId, "units"];
  const configurationsKey = ["/api/projects", projectId, "unit-configurations"];
  const pricingKey = ["/api/projects", projectId, "pricing-summary"];

  const { data: properties = [] } = useQuery<Property[]>({ queryKey: propertiesKey });
  const { data: units = [] } = useQuery<AttachedUnit[]>({ queryKey: unitsKey });
  const { data: configurations = [] } = useQuery<UnitConfiguration[]>({ queryKey: configurationsKey });
  const { data: homeModels = [] } = useQuery<HomeModel[]>({ queryKey: ["/api/home-models"] });

  const form = useForm<ConfigurationFormValues>({
    resolver: zodResolver(configurationFormSchema),
    defaultValues: EMPTY_CONFIGURATION_FORM,
  });

  const closeSlot = () => {
    setOpenSlot(null);
    setSource("");
    setSourceError(null);
    form.reset(EMPTY_CONFIGURATION_FORM);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: unitsKey });
    queryClient.invalidateQueries({ queryKey: configurationsKey });
    queryClient.invalidateQueries({ queryKey: pricingKey });
  };

  const attachUnit = (
    slot: { propertyId: number; role: UnitRole },
    pricingSource: { modelId: number } | { configurationId: number },
  ) => {
    const property = properties.find((candidate) => candidate.id === slot.propertyId);
    return apiRequest("POST", `/api/projects/${projectId}/units`, {
      ...pricingSource,
      propertyId: slot.propertyId,
      unitRole: slot.role,
      quantity: 1,
      unitLabel: `${property?.propertyCode ?? "Property"} ${ROLE_LABELS[slot.role]}`,
    });
  };

  const attachExisting = useMutation({
    mutationFn: ({
      slot,
      pricingSource,
    }: {
      slot: { propertyId: number; role: UnitRole };
      pricingSource: { modelId: number } | { configurationId: number };
    }) => attachUnit(slot, pricingSource),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
      closeSlot();
    },
    onError: (error) =>
      setErrorMessage(serverMessage(error, "Could not attach the unit. Try again.")),
  });

  const createAndAttach = useMutation({
    mutationFn: async ({
      slot,
      values,
    }: {
      slot: { propertyId: number; role: UnitRole };
      values: ConfigurationFormValues;
    }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/unit-configurations`, {
        name: values.name.trim(),
        sqFt: Number(values.sqFt),
        pricePerSqFtLow: dollarsToCents(values.pricePerSqFtLow),
        pricePerSqFtHigh: dollarsToCents(values.pricePerSqFtHigh),
      });
      const configuration: UnitConfiguration = await response.json();
      await attachUnit(slot, { configurationId: configuration.id });
    },
    onSuccess: () => {
      setErrorMessage(null);
      closeSlot();
    },
    onError: (error) =>
      setErrorMessage(serverMessage(error, "Could not create the configuration. Try again.")),
    // Settled, not success: a configuration that was created before the attach
    // failed still has to appear in the list so it can be attached by hand.
    onSettled: () => invalidate(),
  });

  const removeUnit = useMutation({
    mutationFn: (unitId: number) => apiRequest("DELETE", `/api/project-units/${unitId}`),
    onSuccess: () => {
      invalidate();
      setErrorMessage(null);
    },
    onError: (error) =>
      setErrorMessage(serverMessage(error, "Could not remove the unit. Try again.")),
  });

  const isAttaching = attachExisting.isPending || createAndAttach.isPending;

  const handleAttach = (slot: { propertyId: number; role: UnitRole }) => {
    if (!source) {
      setSourceError("Choose a catalog model or a configuration first.");
      sourceTriggerRef.current?.focus();
      return;
    }
    setSourceError(null);
    const [kind, rawId] = source.split(":");
    const id = parseInt(rawId, 10);
    attachExisting.mutate({
      slot,
      pricingSource: kind === "model" ? { modelId: id } : { configurationId: id },
    });
  };

  const renderSlot = (property: Property, role: UnitRole) => {
    const roleLabel = ROLE_LABELS[role];
    const unit = units.find(
      (candidate) => candidate.propertyId === property.id && candidate.unitRole === role,
    );
    const isOpen = openSlot?.propertyId === property.id && openSlot.role === role;
    const slot = { propertyId: property.id, role };
    const sourceSelectId = `unit-source-${property.id}-${role}`;
    const sourceErrorId = `unit-source-error-${property.id}-${role}`;

    return (
      <div className="rounded-lg border p-3 space-y-2" data-testid={`slot-${property.id}-${role}`}>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{roleLabel}</Badge>
        </div>

        {unit ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium break-words" data-testid={`text-unit-name-${unit.id}`}>
                {unit.configuration?.name ?? unit.model?.name ?? unit.unitLabel ?? "Unnamed unit"}
              </p>
              <p className="text-xs text-muted-foreground break-words tabular-nums">
                {unit.configuration
                  ? configurationSummary(unit.configuration)
                  : unit.model
                    ? modelSummary(unit.model)
                    : "No pricing source on this unit."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(unit)}
              disabled={removeUnit.isPending}
              aria-label={`Remove the ${roleLabel} from property ${property.propertyCode}`}
              data-testid={`button-remove-unit-${unit.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
            </Button>
          </div>
        ) : isOpen ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={sourceSelectId} className="text-xs">
                Unit Source
              </Label>
              <Select
                value={source}
                onValueChange={(value) => {
                  setSource(value);
                  setSourceError(null);
                }}
              >
                <SelectTrigger
                  ref={sourceTriggerRef}
                  id={sourceSelectId}
                  aria-invalid={!!sourceError}
                  aria-describedby={sourceError ? sourceErrorId : undefined}
                  data-testid={`select-source-${property.id}-${role}`}
                >
                  <SelectValue placeholder="Choose a model or configuration…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Unpriced</SelectLabel>
                    <SelectItem value="new">New Configuration…</SelectItem>
                  </SelectGroup>
                  {configurations.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Configurations</SelectLabel>
                      {configurations.map((configuration) => (
                        <SelectItem key={configuration.id} value={`configuration:${configuration.id}`}>
                          {configuration.name} — {configurationRange(configuration)} ·{" "}
                          {sqFtLabel(configuration.sqFt)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {homeModels.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Catalog Models</SelectLabel>
                      {homeModels.map((model) => (
                        <SelectItem key={model.id} value={`model:${model.id}`}>
                          {model.name} — {sqFtLabel(model.sqFt)} · {formatCents(model.offsiteBasePrice)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {sourceError && (
                <p id={sourceErrorId} className="text-xs text-destructive">
                  {sourceError}
                </p>
              )}
            </div>

            {source === "new" ? (
              <Form {...form}>
                <form
                  className="space-y-3"
                  onSubmit={form.handleSubmit((values) =>
                    createAndAttach.mutate({ slot, values }),
                  )}
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Configuration Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Zaca ADU…"
                            autoComplete="off"
                            spellCheck={false}
                            data-testid={`input-configuration-name-${property.id}-${role}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sqFt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Square Footage</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            placeholder="1200…"
                            autoComplete="off"
                            data-testid={`input-configuration-sqft-${property.id}-${role}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="pricePerSqFtLow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Price per Sqft (Low, $)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={0}
                              step="0.01"
                              inputMode="decimal"
                              placeholder="450.00…"
                              autoComplete="off"
                              data-testid={`input-configuration-low-${property.id}-${role}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pricePerSqFtHigh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Price per Sqft (High, $)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={0}
                              step="0.01"
                              inputMode="decimal"
                              placeholder="520.00…"
                              autoComplete="off"
                              data-testid={`input-configuration-high-${property.id}-${role}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The unit total is derived from the high end of the range. It is an estimate,
                    not a quote.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isAttaching}
                      data-testid={`button-create-configuration-${property.id}-${role}`}
                    >
                      {isAttaching ? "Saving…" : `Create & Attach ${roleLabel}`}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={closeSlot}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAttach(slot)}
                  disabled={isAttaching}
                  data-testid={`button-attach-${property.id}-${role}`}
                >
                  {isAttaching ? "Attaching…" : `Attach ${roleLabel}`}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={closeSlot}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSource("");
              setSourceError(null);
              form.reset(EMPTY_CONFIGURATION_FORM);
              setOpenSlot(slot);
            }}
            data-testid={`button-add-${property.id}-${role}`}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add {roleLabel}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" aria-hidden="true" />
          Units on Properties
        </CardTitle>
        <CardDescription>
          Give each property its home and its ADU. Price a unit from the catalog, or create a
          configuration when the size you need is not in the catalog yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No properties yet. Add a property above, then attach its units here.
          </p>
        ) : (
          properties.map((property) => {
            const headingId = `property-units-${property.id}`;
            return (
              <section key={property.id} aria-labelledby={headingId} className="space-y-2">
                <h3 id={headingId} className="text-sm font-medium flex flex-wrap items-baseline gap-2">
                  <span translate="no">{property.propertyCode}</span>
                  {(property.lotNumber || property.address) && (
                    <span className="text-xs font-normal text-muted-foreground break-words">
                      {property.lotNumber ? `Lot ${property.lotNumber}` : property.address}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {UNIT_ROLES.map((role) => (
                    <div key={role}>{renderSlot(property, role)}</div>
                  ))}
                </div>
              </section>
            );
          })
        )}

        <p
          className="text-sm text-destructive"
          aria-live="polite"
          data-testid="text-unit-attachment-error"
        >
          {errorMessage}
        </p>
      </CardContent>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Unit"
        description={`Remove ${
          deleteTarget?.configuration?.name ?? deleteTarget?.model?.name ?? deleteTarget?.unitLabel ?? "this unit"
        } from this property? This action cannot be undone.`}
        actionLabel="Remove Unit"
        onConfirm={() => {
          if (!deleteTarget) return;
          removeUnit.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </Card>
  );
};
