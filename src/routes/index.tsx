import { createFileRoute } from "@tanstack/react-router";
import { OpusFormApp } from "@/components/opus/OpusFormApp";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <OpusFormApp />;
}
