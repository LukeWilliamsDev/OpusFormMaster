// @ts-nocheck
import React from "react";
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
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

interface MediaTabProps {
  beforePhotos: any[];
  afterPhotos: any[];
  projectDocs: any[];
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
  gallery: { photos: any[]; index: number } | null;
  setGallery: (g: { photos: any[]; index: number } | null) => void;
  viewDocTarget: any;
  setViewDocTarget: (a: any) => void;
  executeViewDocument: () => void;
  deleteAttachmentTarget: any;
  setDeleteAttachmentTarget: (a: any) => void;
  executeDeleteAttachment: () => Promise<void>;
  renameTarget: any;
  setRenameTarget: (a: any) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  executeRenameAttachment: () => Promise<void>;
}

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
  return (
    <>
      <div className="space-y-6">
        {/* Attachments Section: Photos and Documents */}
        <div className="grid grid-cols-1 gap-6">
          {/* Before & After Photo Gallery */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Before & After Site Media
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Before Section */}
              <div className="space-y-2">
                <div className="text-[12px] text-muted-foreground font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>Before</span>
                  <label className="text-[12px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-bold">
                    {uploadingPhotoBefore ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Add Photo
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files?.[0] && uploadAttachment(e.target.files[0], "image_before")
                      }
                      className="hidden"
                      disabled={uploadingPhotoBefore}
                    />
                  </label>
                </div>
                <div className="bg-background border border-border rounded-xl min-h-[140px] flex items-center justify-center p-3">
                  {beforePhotos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {beforePhotos.map((p, i) => (
                        <div
                          key={p.id}
                          onClick={() => setGallery({ photos: beforePhotos, index: i })}
                          className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
                        >
                          <img src={p.file_url} alt="before" className="w-full h-24 object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[10px] text-muted-foreground">
                            <span className="text-white font-bold truncate">{p.uploaded_by}</span>
                            <span>{new Date(p.uploaded_at).toLocaleDateString("en-GB")}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteAttachmentTarget(p);
                            }}
                            aria-label="Delete photo"
                            className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-semibold">
                      No Media
                    </span>
                  )}
                </div>
              </div>

              {/* After Section */}
              <div className="space-y-2">
                <div className="text-[12px] text-muted-foreground font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>After</span>
                  <label className="text-[12px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-bold">
                    {uploadingPhotoAfter ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Add Photo
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files?.[0] && uploadAttachment(e.target.files[0], "image_after")
                      }
                      className="hidden"
                      disabled={uploadingPhotoAfter}
                    />
                  </label>
                </div>
                <div className="bg-background border border-border rounded-xl min-h-[140px] flex items-center justify-center p-3">
                  {afterPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {afterPhotos.map((p, i) => (
                        <div
                          key={p.id}
                          onClick={() => setGallery({ photos: afterPhotos, index: i })}
                          className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
                        >
                          <img src={p.file_url} alt="after" className="w-full h-24 object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[10px] text-muted-foreground">
                            <span className="text-white font-bold truncate">{p.uploaded_by}</span>
                            <span>{new Date(p.uploaded_at).toLocaleDateString("en-GB")}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteAttachmentTarget(p);
                            }}
                            aria-label="Delete photo"
                            className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[12px] text-muted-foreground uppercase tracking-widest font-semibold">
                      No Media
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Documents & Drag-and-Drop */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Project Documents
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

            {/* Generated request link alert */}
            {generatedLink && (
              <div className="bg-secondary border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in">
                <div className="space-y-0.5 max-w-[75%]">
                  <div className="text-[12px] font-bold text-foreground uppercase tracking-wider">
                    Secure Upload Link Generated
                  </div>
                  <div className="text-[13px] text-muted-foreground truncate font-mono">
                    {generatedLink}
                  </div>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 bg-card border border-border text-foreground hover:bg-secondary rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}

            {/* Drag and drop zone */}
            <div className="border border-dashed border-border hover:border-muted-foreground/40 rounded-xl p-6 bg-background text-center relative transition-all">
              <input
                type="file"
                onChange={(e) =>
                  e.target.files?.[0] && uploadAttachment(e.target.files[0], "document")
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadingDoc}
              />
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <div className="text-xs font-bold text-foreground">
                  {uploadingDoc ? "Uploading..." : "Drop files here or click to upload"}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  PDF, Excel, Word, or CAD Drawings
                </div>
                <div className="text-[11px] text-muted-foreground">
                  10MB per file, 100MB total per job
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {projectDocs.map((d) => (
                <div
                  key={d.id}
                  className="flex justify-between items-center p-2.5 bg-background border border-border rounded-lg hover:border-muted-foreground/40 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setViewDocTarget(d)}
                    className="flex items-center gap-2 truncate max-w-[70%] cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground hover:text-primary truncate font-mono">
                      {d.file_name}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {new Date(d.uploaded_at).toLocaleDateString("en-GB")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteAttachmentTarget(d)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      aria-label={`Delete ${d.file_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {projectDocs.length === 0 && (
                <div className="text-center py-6 text-[12px] text-muted-foreground uppercase tracking-wider font-semibold">
                  No documents uploaded yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black">
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-card">
                <div className="min-w-0 text-[12px] text-muted-foreground truncate">
                  {gallery.photos[gallery.index].uploaded_by} ·{" "}
                  {new Date(gallery.photos[gallery.index].uploaded_at).toLocaleDateString("en-GB")}
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
