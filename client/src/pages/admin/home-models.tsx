import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HomeModel {
  id: number;
  name: string;
  modelCode: string;
  description?: string;
  sqFt: number;
  bedrooms: number;
  bathrooms: number;
  stories?: number;
  designFee: number;
  offsiteBasePrice: number;
  onsiteEstPrice?: number;
  shippingSetPrice?: number;
  isActive: boolean;
}

const homeModelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  modelCode: z.string().min(1, "Model code is required"),
  description: z.string().optional(),
  sqFt: z.coerce.number().min(1, "Square footage is required"),
  bedrooms: z.coerce.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().min(0, "Bathrooms must be 0 or more"),
  stories: z.coerce.number().optional(),
  designFee: z.coerce.number().min(0, "Design fee must be 0 or more"),
  offsiteBasePrice: z.coerce.number().min(0, "Base price must be 0 or more"),
  onsiteEstPrice: z.coerce.number().optional(),
  shippingSetPrice: z.coerce.number().optional(),
});

type HomeModelFormValues = z.infer<typeof homeModelSchema>;

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function AdminHomeModels() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<HomeModel | null>(null);
  const [deleteModel, setDeleteModel] = useState<HomeModel | null>(null);
  const { toast } = useToast();

  const { data: homeModels, isLoading } = useQuery<HomeModel[]>({
    queryKey: ["/api/home-models"],
  });

  const form = useForm<HomeModelFormValues>({
    resolver: zodResolver(homeModelSchema),
    defaultValues: {
      name: "",
      modelCode: "",
      description: "",
      sqFt: 0,
      bedrooms: 0,
      bathrooms: 0,
      stories: 1,
      designFee: 0,
      offsiteBasePrice: 0,
      onsiteEstPrice: 0,
      shippingSetPrice: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: HomeModelFormValues) => {
      return apiRequest("POST", "/api/home-models", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-models"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Home model created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create home model", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: HomeModelFormValues }) => {
      return apiRequest("PATCH", `/api/home-models/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-models"] });
      setIsDialogOpen(false);
      setEditingModel(null);
      form.reset();
      toast({ title: "Home model updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update home model", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/home-models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-models"] });
      setDeleteModel(null);
      toast({ title: "Home model deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete home model", variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingModel(null);
    form.reset({
      name: "",
      modelCode: "",
      description: "",
      sqFt: 0,
      bedrooms: 0,
      bathrooms: 0,
      stories: 1,
      designFee: 0,
      offsiteBasePrice: 0,
      onsiteEstPrice: 0,
      shippingSetPrice: 0,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (model: HomeModel) => {
    setEditingModel(model);
    form.reset({
      name: model.name,
      modelCode: model.modelCode,
      description: model.description || "",
      sqFt: model.sqFt,
      bedrooms: model.bedrooms,
      bathrooms: model.bathrooms,
      stories: model.stories || 1,
      designFee: model.designFee,
      offsiteBasePrice: model.offsiteBasePrice,
      onsiteEstPrice: model.onsiteEstPrice || 0,
      shippingSetPrice: model.shippingSetPrice || 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: HomeModelFormValues) => {
    if (editingModel) {
      updateMutation.mutate({ id: editingModel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              Home Models
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your home model catalog
            </p>
          </div>
          <Button onClick={handleOpenCreate} data-testid="button-add-model">
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Beds</TableHead>
                  <TableHead className="text-center">Baths</TableHead>
                  <TableHead className="text-right">Sq Ft</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homeModels?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No home models found. Click "Add Model" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  homeModels?.map((model) => (
                    <TableRow key={model.id} data-testid={`row-model-${model.id}`}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell className="text-muted-foreground">{model.modelCode}</TableCell>
                      <TableCell className="text-center">{model.bedrooms}</TableCell>
                      <TableCell className="text-center">{model.bathrooms}</TableCell>
                      <TableCell className="text-right">{model.sqFt?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(model.offsiteBasePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(model)}
                            data-testid={`button-edit-${model.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteModel(model)}
                            data-testid={`button-delete-${model.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Edit Home Model" : "Add Home Model"}
              </DialogTitle>
              <DialogDescription>
                {editingModel
                  ? "Update the home model details below."
                  : "Enter the details for the new home model."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="modelCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-model-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-bedrooms" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-bathrooms" />
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
                        <FormLabel>Square Feet</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-sqft" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="offsiteBasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offsite Base Price (cents)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-base-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingSetPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping/Set Price (cents)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-shipping-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="onsiteEstPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Onsite Est. Price (cents)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-onsite-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="designFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suggested Design Fee (cents)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-design-fee" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingModel
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteModel} onOpenChange={() => setDeleteModel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Home Model</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteModel?.name}"? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteModel && deleteMutation.mutate(deleteModel.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
