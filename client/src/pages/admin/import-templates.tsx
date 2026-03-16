import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  FileText,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  FileCheck,
} from "lucide-react";

interface ParsedClause {
  name: string;
  content: string;
  level: number;
}

const CONTRACT_TYPES = [
  { value: "MASTER_EF", label: "Master Purchase Agreement" },
  { value: "ONE", label: "ONE Agreement (Archived)" },
  { value: "ONSITE", label: "Onsite Sub (Archived)" },
  { value: "MFG", label: "Manufacturing Sub (Archived)" },
];

export default function ImportTemplates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [templateName, setTemplateName] = useState("");
  const [contractType, setContractType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clauses, setClauses] = useState<ParsedClause[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const authHeaders = await getAuthHeaders() as Record<string, string>;
      const { "Content-Type": _, ...uploadHeaders } = authHeaders;
      const response = await fetch("/api/admin/parse-docx", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to parse document");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setClauses(data.clauses);
      setStep(2);
      toast({
        title: "Document Parsed",
        description: `Found ${data.clauses.length} clauses in the document.`,
      });
    },
    onError: () => {
      toast({
        title: "Parse Failed",
        description: "Could not parse the DOCX file. Please check the format.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/save-template", {
        templateName,
        contractType,
        clauses,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      toast({
        title: "Template Saved",
        description: `Successfully imported "${templateName}" with ${clauses.length} clauses.`,
      });
      navigate("/admin/contract-templates");
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save the template. Please try again.",
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile?.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a DOCX file.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleParseDocument = () => {
    if (!file || !templateName || !contractType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and upload a file.",
        variant: "destructive",
      });
      return;
    }
    parseMutation.mutate(file);
  };

  const handleDeleteClause = (index: number) => {
    setClauses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(clauses[index].name);
    setEditContent(clauses[index].content);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    setClauses((prev) =>
      prev.map((clause, i) =>
        i === editingIndex
          ? { ...clause, name: editName, content: editContent }
          : clause
      )
    );
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, "").trim();
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Import Contract Template</h1>
        <p className="text-muted-foreground">
          Upload a DOCX file to create a new contract template with atomic
          clauses.
        </p>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            1
          </div>
          <span className={step >= 1 ? "font-medium" : "text-muted-foreground"}>
            Upload
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            2
          </div>
          <span className={step >= 2 ? "font-medium" : "text-muted-foreground"}>
            Review
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            3
          </div>
          <span className={step >= 3 ? "font-medium" : "text-muted-foreground"}>
            Save
          </span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Upload a DOCX contract template. Headers (H1-H3) will become
              clause names.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  data-testid="input-template-name"
                  placeholder="e.g., Standard PSA v2.0"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger data-testid="select-contract-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-12 w-12 text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                    data-testid="button-remove-file"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                  <p className="font-medium">Drag & drop your DOCX file here</p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".docx"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                    data-testid="input-file-upload"
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleParseDocument}
              disabled={!file || !templateName || !contractType || parseMutation.isPending}
              data-testid="button-parse-document"
            >
              {parseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  Parse Document
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review & Edit Clauses
            </CardTitle>
            <CardDescription>
              Found {clauses.length} clauses. Edit or delete before saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {clauses.map((clause, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                    data-testid={`clause-item-${index}`}
                  >
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Clause Name</Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            data-testid={`input-edit-name-${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Content (HTML)</Label>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={6}
                            className="font-mono text-sm"
                            data-testid={`textarea-edit-content-${index}`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            data-testid={`button-save-edit-${index}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-edit-${index}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">L{clause.level}</Badge>
                            <span className="font-medium">{clause.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEdit(index)}
                              data-testid={`button-edit-${index}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteClause(index)}
                              data-testid={`button-delete-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {stripHtml(clause.content) || "(empty content)"}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-step1">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={clauses.length === 0}
              data-testid="button-continue-step3"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Complete Import
            </CardTitle>
            <CardDescription>
              Review the summary and complete the import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Template Name</p>
                <p className="font-medium">{templateName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Contract Type</p>
                <p className="font-medium">
                  {CONTRACT_TYPES.find((t) => t.value === contractType)?.label}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Source File</p>
                <p className="font-medium">{file?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Clauses to Import</p>
                <p className="font-medium">{clauses.length} clauses</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">Clauses Preview</h3>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {clauses.map((clause, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {index + 1}
                      </Badge>
                      <span className="truncate">{clause.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-step2">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-complete-import"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Complete Import
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
