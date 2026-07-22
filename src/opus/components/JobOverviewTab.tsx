// @ts-nocheck
import React from "react";
import { Check, Circle, Clock, MapPin, Navigation, Phone, Loader } from "lucide-react";
import { OSMMap } from "./OSMMap";
import { Job } from "../types/erp";

interface JobOverviewTabProps {
  job: Job;
  status: Job["status"];
  setPendingStatus: (s: Job["status"] | null) => void;
  siteCoords: { lat: number; lng: number } | null;
  suppliers: any[];
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null | ((prev: string | null) => string | null)) => void;
  loadingSuppliers: boolean;
}

export function JobOverviewTab({
  job,
  status,
  setPendingStatus,
  siteCoords,
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  loadingSuppliers,
}: JobOverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Project Status Selector */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
        <div className="flex flex-col items-stretch gap-0.5">
          {(
            [
              {
                key: "in-progress",
                label: "In Progress",
                Icon: Clock,
                activeClasses: "bg-primary/15 text-primary border-primary/30",
              },
              {
                key: "pending",
                label: "Pending",
                Icon: Circle,
                activeClasses: "bg-warning/15 text-warning border-warning/30",
              },
              {
                key: "completed",
                label: "Completed",
                Icon: Check,
                activeClasses: "bg-success/15 text-success border-success/30",
              },
            ] as const
          ).map(({ key: s, label, Icon, activeClasses }) => {
            const isActive = status === s;
            return (
              <button
                key={s}
                onClick={() => !isActive && setPendingStatus(s)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? activeClasses
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Proximity Suppliers Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-card border border-border rounded-xl overflow-hidden">
        <div className="lg:col-span-2 flex flex-col lg:border-r border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-destructive" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Live Site Proximity Matrix
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Job Site
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" /> Supplier
              </span>
            </div>
          </div>
          {siteCoords ? (
            <div className="flex-1 min-h-[420px] relative">
              <OSMMap
                center={siteCoords}
                siteCoords={siteCoords}
                siteName={job.siteName}
                postcode={job.postcode}
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={setSelectedSupplierId}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground py-16">
              Geocoding site coordinates...
            </div>
          )}
        </div>

        {/* Local Suppliers List */}
        <div className="p-4 flex flex-col h-full min-h-[420px]">
          <div className="text-[12px] text-muted-foreground font-bold uppercase tracking-wider mb-4">
            Closest Local Suppliers
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {loadingSuppliers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader className="w-4 h-4 animate-spin text-primary" />
                <span>Searching local building merchants...</span>
              </div>
            ) : suppliers.length > 0 ? (
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSupplierId((prev) => (prev === s.id ? null : s.id))}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      setSelectedSupplierId((prev) => (prev === s.id ? null : s.id))
                    }
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedSupplierId === s.id
                        ? "bg-secondary border-primary"
                        : "bg-background border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="text-xs font-bold text-foreground truncate">{s.name}</div>
                        {s.businessType && (
                          <div className="text-[11px] text-primary font-bold uppercase tracking-wider">
                            {s.businessType}
                          </div>
                        )}
                        <div className="text-[12px] text-muted-foreground truncate">
                          {s.address}
                        </div>
                      </div>
                      <span className="text-[12px] font-bold bg-background border border-border px-2 py-0.5 rounded text-muted-foreground shrink-0">
                        {s.distance}
                      </span>
                    </div>

                    {/* Actions always visible, not hover-dependent */}
                    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          className="flex items-center gap-1.5 text-[12px] font-bold text-foreground border border-border px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[12px] font-bold text-foreground border border-border px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> Directions
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4">
                No local tool hire or building merchants found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
