import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, FileUp, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const CONTRACT_TYPES = [
  { value: "master_ef", label: "Master Purchase Agreement" },
  { value: "one_agreement", label: "ONE Agreement (Archived)" },
  { value: "cmos", label: "CMOS" },
  { value: "crc", label: "CRC" },
  { value: "onsite", label: "Onsite" },
];

interface ContractTemplate {
  id: number;
  name: string;
  contract_type: string;
  version: string;
  content?: string;
  is_active: boolean;
}

const contractTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contractType: z.string().min(1, "Contract type is required"),
  version: z.string().min(1, "Version is required"),
  content: z.string().optional(),
});

type ContractTemplateFormValues = z.infer<typeof contractTemplateSchema>;

export default function AdminContractTemplates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ContractTemplate | null>(null);
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<ContractTemplate[]>({
    queryKey: ["/api/contract-templates"],
  });

  const form = useForm<ContractTemplateFormValues>({
    resolver: zodResolver(contractTemplateSchema),
    defaultValues: {
      name: "",
      contractType: "",
      version: "1.0",
      content: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractTemplateFormValues) => {
      return apiRequest("POST", "/api/contract-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Contract template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create contract template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContractTemplateFormValues }) => {
      return apiRequest("PATCH", `/api/contract-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      toast({ title: "Contract template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update contract template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/contract-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      setDeleteTemplate(null);
      toast({ title: "Contract template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete contract template", variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      contractType: template.contract_type,
      version: template.version,
      content: template.content || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ContractTemplateFormValues) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getContractTypeLabel = (value: string) => {
    return CONTRACT_TYPES.find((t) => t.value === value)?.label || value;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              Contract Templates
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage contract template versions
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/import-templates">
              <Button variant="outline" data-testid="button-import-from-word">
                <FileUp className="h-4 w-4 mr-2" />
                Import from Word
              </Button>
            </Link>
            <Button onClick={handleOpenCreate} data-testid="button-add-template">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
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
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No contract templates found. Click "Add Template" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates?.map((template) => (
                    <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getContractTypeLabel(template.contract_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">v{template.version}</TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "secondary" : "outline"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/contract-templates/${template.id}/edit`}>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-manage-${template.id}`}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTemplate(template)}
                            data-testid={`button-delete-${template.id}`}
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
                {editingTemplate ? "Edit Contract Template" : "Add Contract Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? "Update the contract template details below."
                  : "Enter the details for the new contract template."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contract-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTRACT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1.0" data-testid="input-version" />
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
                      : editingTemplate
                      ? "Update"
                      : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contract Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}
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
