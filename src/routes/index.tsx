import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const OpusApp = lazy(() => import("@/opus/App"));

export const Route = createFileRoute("/")({
  component: OpusRoute,
});

function OpusRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-[#1A1B1E]" />}>
      <Suspense fallback={<div className="min-h-screen bg-[#1A1B1E]" />}>
        <OpusApp />
      </Suspense>
    </ClientOnly>
  );
}
