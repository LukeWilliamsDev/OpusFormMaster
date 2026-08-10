import React, { useState } from "react";
import { CardGrid } from "../components/CardGrid";
import {
  Camera,
  FileText,
  Link as LinkIcon,
  Check,
  Plus,
  Loader,
  Copy,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Trash2,
  Download,
  Receipt,
  FileCheck,
  Wallet,
  Folder,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

interface MediaTabProps {
  beforePhotos: Attachment[];
  afterPhotos: Attachment[];
  projectDocs: Attachment[];
  uploadingPhotoBefore: boolean;
  uploadingPhotoAfter: boolean;
  uploadingDoc: boolean;
  uploadAttachment: (
    file: File,
    type: "image_before" | "image_after" | "document",
  ) => Promise<void>;
  generatedLink: string | null;
  generatingLink: boolean;
  copiedLink: boolean;
  generateUploadLink: () => Promise<void>;
  copyToClipboard: () => void;
  gallery: { photos: Attachment[]; index: number } | null;
  setGallery: (g: { photos: Attachment[]; index: number } | null) => void;
  viewDocTarget: Attachment | null;
  setViewDocTarget: (a: Attachment | null) => void;
  executeViewDocument: () => void;
  deleteAttachmentTarget: Attachment | null;
  setDeleteAttachmentTarget: (a: Attachment | null) => void;
  executeDeleteAttachment: () => Promise<void>;
  renameTarget: Attachment | null;
  setRenameTarget: (a: Attachment | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  executeRenameAttachment: () => Promise<void>;
}

export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  type: string;
  file_size_bytes?: number;
  uploaded_at?: string | null;
  uploaded_by?: string;
  thumb_url?: string;
  raw_file_url?: string;
}

const DOC_GROUPS: { label: string; match: RegExp }[] = [
  { label: "Invoices", match: /invoice/i },
  { label: "Quotes", match: /quote/i },
  { label: "Expenses", match: /expense/i },
  { label: "Other Documents", match: /^(?!.*(invoice|quote|expense)).*$/i },
];

export function MediaTab({
  beforePhotos,
  afterPhotos,
  projectDocs,
  uploadingPhotoBefore,
  uploadingPhotoAfter,
  uploadingDoc,
  uploadAttachment,
  generatedLink,
  generatingLink,
  copiedLink,
  generateUploadLink,
  copyToClipboard,
  gallery,
  setGallery,
  viewDocTarget,
  setViewDocTarget,
  executeViewDocument,
  deleteAttachmentTarget,
  setDeleteAttachmentTarget,
  executeDeleteAttachment,
  renameTarget,
  setRenameTarget,
  renameValue,
  setRenameValue,
  executeRenameAttachment,
}: MediaTabProps) {
  // Before/after now share one grid (see below) — newest first, each
  // thumbnail carries its own Before/After badge instead of a toggle
  // gating which set is visible, since the wider column has room for both.
  const allPhotos = [...beforePhotos, ...afterPhotos].sort(
    (a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime(),
  );

  // Doc grouping is filename-based (see DOC_GROUPS), so before uploading we
  // ask which bucket the file belongs to and prefix the name to match —
  // no schema change needed, keeps the existing regex grouping working.
  const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);
  const [docDragActive, setDocDragActive] = useState(false);
  const docFileInputRef = React.useRef<HTMLInputElement>(null);
  const chooseDocCategory = (prefix: string | null) => {
    if (!pendingDocFile) return;
    const file = prefix
      ? new File([pendingDocFile], `${prefix}-${pendingDocFile.name}`, {
          type: pendingDocFile.type,
        })
      : pendingDocFile;
    uploadAttachment(file, "document");
    setPendingDocFile(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Attachments Section: Photos and Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 bg-card border border-border rounded-xl overflow-hidden">
          {/* Before & After Photo Gallery */}
          <div className="p-3 space-y-3 md:border-r border-border">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Site Before & After
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {[
                  {
                    view: "before" as const,
                    label: "Before",
                    type: "image_before" as const,
                    count: beforePhotos.length,
                    uploading: uploadingPhotoBefore,
                  },
                  {
                    view: "after" as const,
                    label: "After",
                    type: "image_after" as const,
                    count: afterPhotos.length,
                    uploading: uploadingPhotoAfter,
                  },
                ].map(({ view, label, type, count, uploading }) => (
                  <Button key={view} size="sm" variant="outline" className="gap-1.5" asChild>
                    <label className="cursor-pointer">
                      {uploading ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      {label} <span className="opacity-70">{count}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          e.target.files?.[0] && uploadAttachment(e.target.files[0], type)
                        }
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </Button>
                ))}
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70 -mt-2">
              <Camera className="w-3 h-3" />
              Newest uploads first · click a photo to view
            </p>

            <div
              className={`bg-background border border-border rounded-xl min-h-[140px] p-2 ${allPhotos.length > 0 ? "" : "flex items-center justify-center"}`}
            >
              {allPhotos.length > 0 ? (
                <CardGrid
                  items={allPhotos}
                  className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(110px,1fr))]"
                  renderCard={(p, i) => (
                    <div
                      key={p.id}
                      onClick={() => setGallery({ photos: allPhotos, index: i })}
                      className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
                    >
                      <img
                        src={p.thumb_url || p.file_url}
                        alt={p.type === "image_before" ? "before" : "after"}
                        loading="lazy"
                        decoding="async"
                        className="w-full aspect-[4/3] object-cover"
                      />
                      <span
                        className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded shadow-sm text-[9px] font-bold uppercase tracking-wider ${p.type === "image_before" ? "bg-black/80 text-white" : "bg-primary text-primary-foreground"}`}
                      >
                        {p.type === "image_before" ? "Before" : "After"}
                      </span>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[10px] text-muted-foreground">
                        <span className="text-foreground font-bold truncate">{p.uploaded_by}</span>
                        <span>{new Date(p.uploaded_at || 0).toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>
                  )}
                  emptyMessage="No Media"
                  emptyIcon={
                    <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-semibold" />
                  }
                />
              ) : (
                <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-semibold">
                  No Media
                </span>
              )}
            </div>
          </div>

          {/* Project Documents — whole column is the drop zone */}
          <div
            className={`p-4 space-y-4 relative transition-colors ${docDragActive ? "bg-primary/5" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDocDragActive(true);
            }}
            onDragLeave={() => setDocDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDocDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) setPendingDocFile(file);
            }}
          >
            {docDragActive && (
              <div className="absolute inset-2 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/90 pointer-events-none">
                <span className="text-[13px] font-bold uppercase tracking-wider text-primary">
                  Drop to upload
                </span>
              </div>
            )}
            <input
              ref={docFileInputRef}
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) setPendingDocFile(e.target.files[0]);
                e.target.value = "";
              }}
              className="hidden"
              disabled={uploadingDoc}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Project Attachments
                </h2>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => docFileInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="text-[12px] text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  {uploadingDoc ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3" /> Upload
                    </>
                  )}
                </button>
                <span className="w-px h-3 bg-border" />
                <button
                  onClick={generateUploadLink}
                  disabled={generatingLink}
                  className="text-[12px] text-primary hover:text-primary font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  {generatingLink ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="w-3 h-3" /> Request Link
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground/70 -mt-2">
              <Folder className="w-3 h-3" />
              Drag files anywhere in this panel to upload
            </p>

            {/* Generated request link alert — auto-copied on generate, so this
                is just a confirmation line; raw URL only shows if copy failed. */}
            {generatedLink && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="font-bold text-foreground">Link copied to clipboard</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate font-mono">{generatedLink}</span>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0 ml-auto"
                  onClick={copyToClipboard}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy again
                </Button>
              </div>
            )}

            {/* Documents List, grouped by type */}
            <div className="space-y-3">
              {projectDocs.length > 0 ? (
                DOC_GROUPS.map(({ label, match }) => {
                  const docs = projectDocs.filter((d) => match.test(d.file_name));
                  if (docs.length === 0) return null;
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </span>
                        <span className="flex-1 h-px bg-border" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {docs.map((d) => (
                          <div
                            key={d.id}
                            className="group relative flex items-center justify-between gap-2 p-2.5 bg-background border border-border rounded-lg hover:border-muted-foreground/40 transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => setViewDocTarget(d)}
                              className="text-left cursor-pointer min-w-0"
                            >
                              <span className="text-xs text-foreground hover:text-primary truncate font-mono block">
                                {d.file_name}
                              </span>
                            </button>
                            <span className="text-[10.5px] text-muted-foreground font-medium shrink-0">
                              {new Date(d.uploaded_at || 0).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-[12px] text-muted-foreground uppercase tracking-wider font-semibold">
                  No documents · drag files here or click Upload
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document category picker — shown before every doc upload */}
      <Dialog open={!!pendingDocFile} onOpenChange={(open) => !open && setPendingDocFile(null)}>
        <DialogContent className="lg:max-w-[380px]">
          <div className="flex items-center gap-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>Sort document</span>
          </div>
          <div>
            <h2 className="mb-2 text-[13.5px] font-semibold uppercase tracking-[0.02em]">
              What type of document is this?
            </h2>
            <div className="mb-3 flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-mono text-foreground">
                {pendingDocFile?.name}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Invoice", prefix: "Invoice", icon: Receipt },
                { label: "Quote", prefix: "Quote", icon: FileCheck },
                { label: "Expense", prefix: "Expense", icon: Wallet },
                { label: "Other", prefix: null, icon: Folder },
              ].map(({ label, prefix, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => chooseDocCategory(prefix)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background py-2.5 text-[10.5px] font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage document — view or delete */}
      <Dialog open={!!viewDocTarget} onOpenChange={(open) => !open && setViewDocTarget(null)}>
        <DialogContent className="lg:max-w-[400px]">
          <div className="flex items-center gap-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span>External file</span>
          </div>
          <div>
            <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-[0.02em]">
              Manage Document
            </h2>
            <p className="mb-3 text-[13.5px] text-muted-foreground truncate font-mono">
              {viewDocTarget?.file_name}
            </p>
            <p className="text-[13.5px] text-muted-foreground">
              Viewing opens this file in a new tab and is recorded in the job's audit log.
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40"
              onClick={() => {
                const target = viewDocTarget;
                setViewDocTarget(null);
                if (target) setDeleteAttachmentTarget(target);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
            <Button className="flex-1" onClick={executeViewDocument}>
              View Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete attachment warning */}
      <ConfirmDialog
        open={!!deleteAttachmentTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteAttachmentTarget(null);
        }}
        tone="destructive"
        title="Delete Attachment?"
        confirmLabel="Delete"
        onConfirm={executeDeleteAttachment}
        message={
          deleteAttachmentTarget &&
          `Permanently delete "${deleteAttachmentTarget.file_name}"? This cannot be undone.`
        }
      />

      {/* Before/After photo gallery */}
      <Dialog open={!!gallery} onOpenChange={(open) => !open && setGallery(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black !inset-x-auto !left-1/2 !top-1/2 !bottom-auto !-translate-x-1/2 !-translate-y-1/2 !rounded-lg !w-[calc(100%-2rem)] !max-h-[calc(100dvh-2rem)]">
          {gallery && (
            <div className="relative flex flex-col items-center">
              <img
                src={gallery.photos[gallery.index].file_url}
                alt=""
                className="max-h-[70vh] w-full object-contain bg-black"
              />

              {gallery.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setGallery({
                        photos: gallery.photos,
                        index: (gallery.index - 1 + gallery.photos.length) % gallery.photos.length,
                      })
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-foreground hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() =>
                      setGallery({
                        photos: gallery.photos,
                        index: (gallery.index + 1) % gallery.photos.length,
                      })
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-foreground hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-card">
                <div className="min-w-0 text-[12px] text-muted-foreground truncate">
                  {gallery.photos[gallery.index].uploaded_by} ·{" "}
                  {new Date(gallery.photos[gallery.index].uploaded_at || 0).toLocaleDateString(
                    "en-GB",
                  )}
                  {gallery.photos.length > 1 && ` · ${gallery.index + 1}/${gallery.photos.length}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Delete photo"
                    onClick={() => setDeleteAttachmentTarget(gallery.photos[gallery.index])}
                    className="p-2 bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = gallery.photos[gallery.index];
                      setRenameValue(target.file_name || "");
                      setRenameTarget(target);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-card border border-border text-foreground hover:bg-secondary font-bold rounded-lg text-[12px] cursor-pointer"
                  >
                    <PencilLine className="w-3.5 h-3.5" /> Rename
                  </button>
                  <a
                    href={gallery.photos[gallery.index].file_url}
                    download={gallery.photos[gallery.index].file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-[12px] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename attachment warning */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="max-w-[400px]">
          <div className="flex items-center gap-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span>Rename file</span>
          </div>
          <div>
            <h2 className="mb-2 text-[15px] font-semibold uppercase tracking-[0.02em]">
              Rename This Photo?
            </h2>
            <p className="mb-3 text-[13.5px] text-muted-foreground">
              This changes the file name shown across the job. This action is recorded in the job's
              audit log.
            </p>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="File name"
              autoFocus
            />
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!renameValue.trim()}
              onClick={executeRenameAttachment}
            >
              Rename
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
