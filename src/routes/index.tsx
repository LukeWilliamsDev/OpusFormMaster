import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const OpusApp = lazy(() => import("@/opus/App"));

export const Route = createFileRoute("/")({
  component: OpusRoute,
});

function OpusRoute() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <OpusApp />
      </Suspense>
    </ClientOnly>
  );
}
