import React from "react";
import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { QuoteInvoiceBuilder } from "../components/QuoteInvoiceBuilder";
import { PipelineRegistry } from "../components/PipelineRegistry";
import { usePortal } from "../context/PortalContext";

export const PipelinePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = usePortal();
  const readOnly = role === "logistics_assistant";

  const currentView = searchParams.get("view") || "pipeline-registry";
  const quoteToLoadId = searchParams.get("quoteId");

  if (readOnly && currentView === "quote-builder") {
    return <Navigate to="/portal/pipeline?view=pipeline-registry" replace />;
  }

  const handleEditQuote = (quoteId: string) => {
    setSearchParams({ view: "quote-builder", quoteId });
  };

  const handleQuoteLoaded = () => {
    setSearchParams({ view: "quote-builder" });
  };

  const handleBackToPipeline = () => {
    setSearchParams({ view: "pipeline-registry" });
  };

  return (
    <div className="portal-page-container space-y-6 py-6 lg:py-10 animate-fade-in">
      {!readOnly && currentView === "quote-builder" ? (
        <QuoteInvoiceBuilder
          onLogout={() => {}}
          onBack={handleBackToPipeline}
          quoteToLoadId={quoteToLoadId}
          onQuoteLoaded={handleQuoteLoaded}
        />
      ) : (
        <PipelineRegistry
          onEditQuote={handleEditQuote}
          onNewQuote={() => setSearchParams({ view: "quote-builder" })}
          onBack={() => navigate("/portal/dashboard")}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};
