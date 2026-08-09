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
          <div className="p-4 space-y-4 md:border-r border-border">
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

            <div
              className={`bg-background border border-border rounded-xl min-h-[140px] p-3 ${allPhotos.length > 0 ? "" : "flex items-center justify-center"}`}
            >
              {allPhotos.length > 0 ? (
                <CardGrid
                  items={allPhotos}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
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
                        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${p.type === "image_before" ? "bg-black/60 text-foreground" : "bg-primary/80 text-primary-foreground"}`}
                      >
                        {p.type === "image_before" ? "Before" : "After"}
                      </span>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[10px] text-muted-foreground">
                        <span className="text-foreground font-bold truncate">{p.uploaded_by}</span>
                        <span>{new Date(p.uploaded_at || 0).toLocaleDateString("en-GB")}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAttachmentTarget(p);
                        }}
                        aria-label="Delete photo"
                        className="absolute top-1 right-1 p-1 rounded bg-black/60 text-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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

          {/* Project Documents & Drag-and-Drop */}
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Project Attachments
                </h2>
              </div>
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

            {/* Drag and drop zone */}
            <div className="border border-dashed border-border hover:border-muted-foreground/40 rounded-lg py-4 px-4 bg-background text-center relative transition-all">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) setPendingDocFile(e.target.files[0]);
                  e.target.value = "";
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadingDoc}
              />
              <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                <div className="flex items-center gap-2 text-[13px]">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="font-bold text-foreground">
                    {uploadingDoc ? "Uploading..." : "Drop files or click to upload"}
                  </span>
                </div>
                <div className="text-[11px]">PDF, Excel, Word, CAD · 10MB/file</div>
              </div>
            </div>

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
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {docs.map((d) => (
                          <div
                            key={d.id}
                            className="group relative flex flex-col gap-1.5 p-2.5 bg-background border border-border rounded-lg hover:border-muted-foreground/40 transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => setDeleteAttachmentTarget(d)}
                              aria-label={`Delete ${d.file_name}`}
                              className="absolute top-1.5 right-1.5 p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewDocTarget(d)}
                              className="flex flex-col items-start gap-1.5 text-left cursor-pointer min-w-0"
                            >
                              <span className="text-xs text-foreground hover:text-primary truncate font-mono w-full">
                                {d.file_name}
                              </span>
                            </button>
                            <span className="text-[10.5px] text-muted-foreground font-medium">
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
                  No documents uploaded yet
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

      {/* View document warning */}
      <ConfirmDialog
        open={!!viewDocTarget}
        onOpenChange={(open) => {
          if (!open) setViewDocTarget(null);
        }}
        tone="neutral"
        tag="External file"
        title="Open This Document?"
        confirmLabel="View Document"
        onConfirm={executeViewDocument}
        message={
          viewDocTarget &&
          `This opens "${viewDocTarget.file_name}" in a new tab. This access is recorded in the job's audit log.`
        }
      />

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
