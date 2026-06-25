import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getAuthHeaders, API_BASE } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Template {
  fileName: string;
  contractType: string;
  uploadedAt: string;
  size: number;
  clauseCount: number;
}

type ObjectType = "contract" | "exhibit" | "state_disclosure";

const OBJECT_TYPES = [
  {
    value: "contract",
    label: "Contract Agreement",
    description: "Populates the Clause Library",
  },
  {
    value: "exhibit",
    label: "Exhibit Library",
    description: "Populates the Exhibits table",
  },
  {
    value: "state_disclosure",
    label: "State Disclosure Library",
    description: "Populates state-specific disclosures",
  },
];

export default function TemplatesUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectType, setObjectType] = useState<ObjectType>("contract");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: templatesData, isLoading } = useQuery<{
    templates: Template[];
  }>({
    queryKey: ["/api/contracts/templates"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      objectType,
    }: {
      file: File;
      objectType: ObjectType;
    }) => {
      const formData = new FormData();
      formData.append("template", file);
      formData.append("objectType", objectType);

      const authHeaders = await getAuthHeaders() as Record<string, string>;
      const { "Content-Type": _, ...uploadHeaders } = authHeaders;
      const response = await fetch(API_BASE + "/api/contracts/upload-template", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const typeLabel =
        data.objectType === "exhibit"
          ? "exhibits"
          : data.objectType === "state_disclosure"
            ? "state disclosures"
            : "clauses";
      toast({
        title: "Import Successful",
        description: `Successfully ingested ${data.itemsCreated} ${typeLabel}`,
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clauses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exhibits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/state-disclosures"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const response = await apiRequest("DELETE", `/api/contracts/templates/${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Template and associated clauses removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clauses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".docx")) {
          setSelectedFile(file);
        } else {
          toast({
            title: "Invalid File",
            description: "Only .docx files are accepted",
            variant: "destructive",
          });
        }
      }
    },
    [toast]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, objectType });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const templates = templatesData?.templates || [];
  const selectedTypeInfo = OBJECT_TYPES.find((t) => t.value === objectType);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Import Templates
          </h1>
          <p className="text-muted-foreground">
            Upload .docx files to populate Clauses, Exhibits, or State
            Disclosures
          </p>
        </div>
        <Link href="/clause-library">
          <Button variant="outline" data-testid="link-clause-library">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Clause Library
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Template</CardTitle>
          <CardDescription>
            Select the object type and upload a .docx file. The system will
            parse and route content to the appropriate database table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="objectType">Object Type</Label>
            <Select
              value={objectType}
              onValueChange={(value) => setObjectType(value as ObjectType)}>
              <SelectTrigger
                data-testid="select-object-type"
                className="w-full max-w-md">
                <SelectValue placeholder="Select object type" />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeInfo && (
              <p className="text-sm text-muted-foreground">
                {selectedTypeInfo.description}
              </p>
            )}
          </div>

          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="dropzone-upload">
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <FileText className="h-12 w-12 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {selectedTypeInfo?.label}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    data-testid="button-process-template">
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import {selectedTypeInfo?.label}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploadMutation.isPending}
                    data-testid="button-clear-file">
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Drop your .docx file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <Input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
              </label>
            )}
          </div>

          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">
                  Processing {selectedTypeInfo?.label}...
                </p>
                <p className="text-sm text-muted-foreground">
                  Parsing document structure and creating entries. This may take
                  a moment.
                </p>
              </div>
            </div>
          )}

          {uploadMutation.isSuccess && uploadMutation.data && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Successfully ingested {uploadMutation.data.itemsCreated}{" "}
                  {uploadMutation.data.objectType === "exhibit"
                    ? "exhibits"
                    : uploadMutation.data.objectType === "state_disclosure"
                      ? "state disclosures"
                      : "clauses"}
                </p>
                {uploadMutation.data.objectType === "contract" && (
                  <Link
                    href="/clause-library"
                    className="text-sm font-medium text-green-700 hover:underline dark:text-green-300">
                    View in Clause Library
                  </Link>
                )}
                {uploadMutation.data.objectType === "exhibit" && (
                  <Link
                    href="/admin/exhibits"
                    className="text-sm font-medium text-green-700 hover:underline dark:text-green-300">
                    View in Exhibit Library
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Contract Templates</CardTitle>
          <CardDescription>
            Templates currently in the system. Uploading a file with the same
            name will replace the existing template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p>No templates found</p>
              <p className="text-sm">Upload a .docx file to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Clauses</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow
                    key={template.fileName}
                    data-testid={`row-template-${template.contractType}`}>
                    <TableCell className="font-mono text-sm">
                      {template.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{template.contractType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.clauseCount} blocks
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFileSize(template.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(template.uploadedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${template.contractType}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Template?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{template.fileName}"
                              and remove all {template.clauseCount} associated
                              clauses from the library. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteMutation.mutate(template.fileName)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
