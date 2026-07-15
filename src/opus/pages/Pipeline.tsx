// @ts-nocheck
import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { QuoteInvoiceBuilder } from "../components/QuoteInvoiceBuilder";
import { PipelineRegistry } from "../components/PipelineRegistry";

export const PipelinePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentView = searchParams.get("view") || "pipeline-registry";
  const quoteToLoadId = searchParams.get("quoteId");

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
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in">
      {currentView === "quote-builder" ? (
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
        />
      )}
    </div>
  );
};
