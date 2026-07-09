import { createFileRoute } from "@tanstack/react-router";
import { OpusFormApp } from "@/components/opus/OpusFormApp";

export const Route = createFileRoute("/portal")({
  component: Portal,
});

function Portal() {
  return <OpusFormApp />;
}
