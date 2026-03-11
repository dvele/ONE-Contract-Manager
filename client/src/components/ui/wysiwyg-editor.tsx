import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Code,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  Redo,
  Underline as UnderlineIcon,
  Undo,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
  "data-testid"?: string;
}

export function WysiwygEditor({
  value,
  onChange,
  className,
  placeholder,
  "data-testid": testId,
}: WysiwygEditorProps) {
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] p-3 focus:outline-none wysiwyg-content bg-background text-foreground",
      },
    },
  });

  // Sync external content changes (e.g. switching selected item) without
  // resetting the editor when the update originated from within it.
  useEffect(() => {
    if (editor && !isInternalChange.current) {
      editor.commands.setContent(value || "<p></p>");
    }
    isInternalChange.current = false;
  }, [value, editor]);

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const inTable = editor?.isActive("table") ?? false;

  return (
    <div
      className={cn("border rounded-md bg-background flex flex-col", className)}
      data-testid={testId}
    >
      <style>{`
        .wysiwyg-content ol { list-style-type: lower-roman; margin-left: 1.5rem; padding-left: 0.5rem; }
        .wysiwyg-content ul { list-style-type: disc; margin-left: 1.5rem; padding-left: 0.5rem; }
        .wysiwyg-content li { margin-bottom: 0.25rem; }
        .wysiwyg-content li p { margin: 0; }
        .wysiwyg-content table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
        .wysiwyg-content th, .wysiwyg-content td { border: 1px solid hsl(var(--border)); padding: 6px 10px; text-align: left; }
        .wysiwyg-content th { background: hsl(var(--muted)); font-weight: 600; }
        .wysiwyg-content .selectedCell { background: hsl(var(--primary) / 0.1); }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap sticky top-0 z-10">
        {mode === "visual" && editor && (
          <>
            {/* Block type */}
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("paragraph") && !editor.isActive("heading") && "bg-muted")}
              title="Paragraph"
              data-testid="button-paragraph"
            >
              <Pilcrow className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 1 }) && "bg-muted")}
              title="Heading 1"
              data-testid="button-h1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 2 }) && "bg-muted")}
              title="Heading 2"
              data-testid="button-h2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 3 }) && "bg-muted")}
              title="Heading 3"
              data-testid="button-h3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Inline formatting */}
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-muted")}
              title="Bold"
              data-testid="button-bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-muted")}
              title="Italic"
              data-testid="button-italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-muted")}
              title="Underline"
              data-testid="button-underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Lists */}
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("orderedList") && "bg-muted")}
              title="Numbered list"
              data-testid="button-ol"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("bulletList") && "bg-muted")}
              title="Bullet list"
              data-testid="button-ul"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
              disabled={!editor.can().liftListItem("listItem")}
              className="h-8 w-8 p-0"
              title="Outdent"
              data-testid="button-outdent"
            >
              <Outdent className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
              disabled={!editor.can().sinkListItem("listItem")}
              className="h-8 w-8 p-0"
              title="Indent"
              data-testid="button-indent"
            >
              <Indent className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Table */}
            <Button
              type="button" variant="ghost" size="sm"
              onClick={insertTable}
              className={cn("h-8 w-8 p-0", inTable && "bg-muted")}
              title="Insert table"
              data-testid="button-insert-table"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            {inTable && (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()} className="h-8 px-2 text-xs" title="Add column after">+Col</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()} className="h-8 px-2 text-xs" title="Delete column">−Col</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()} className="h-8 px-2 text-xs" title="Add row after">+Row</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteRow().run()} className="h-8 px-2 text-xs" title="Delete row">−Row</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteTable().run()} className="h-8 px-2 text-xs text-destructive" title="Delete table">Del Table</Button>
              </>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            {/* History */}
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo"
              data-testid="button-undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo"
              data-testid="button-redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="flex-1" />
        <Button
          type="button"
          variant={mode === "source" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode((m) => (m === "visual" ? "source" : "visual"))}
          className="h-7 px-2 text-xs"
          data-testid="button-toggle-source"
        >
          <Code className="h-3 w-3 mr-1" />
          {mode === "visual" ? "Source" : "Visual"}
        </Button>
      </div>

      {/* Editor body */}
      {mode === "visual" ? (
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[200px] font-mono text-sm border-0 rounded-none rounded-b-md focus-visible:ring-0"
          data-testid={testId ? `${testId}-source` : undefined}
        />
      )}
    </div>
  );
}
