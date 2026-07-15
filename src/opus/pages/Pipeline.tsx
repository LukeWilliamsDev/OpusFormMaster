// @ts-nocheck
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QuoteInvoiceBuilder } from '../components/QuoteInvoiceBuilder';
import { PipelineRegistry } from '../components/PipelineRegistry';

export const PipelinePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentView = searchParams.get('view') || 'pipeline-registry';
  const quoteToLoadId = searchParams.get('quoteId');

  const handleEditQuote = (quoteId: string) => {
    setSearchParams({ view: 'quote-builder', quoteId });
  };

  const handleQuoteLoaded = () => {
    setSearchParams({ view: 'quote-builder' });
  };

  const handleBackToPipeline = () => {
    setSearchParams({ view: 'pipeline-registry' });
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {currentView === 'quote-builder' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a30] pb-3 mb-2">
          <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-white font-archivo">
            Quote
          </div>
        </div>
      )}

      {currentView === 'quote-builder' ? (
        <QuoteInvoiceBuilder 
          onLogout={() => {}} 
          onBack={handleBackToPipeline} 
          quoteToLoadId={quoteToLoadId}
          onQuoteLoaded={handleQuoteLoaded}
        />
      ) : (
        <PipelineRegistry 
          onEditQuote={handleEditQuote}
          onNewQuote={() => setSearchParams({ view: 'quote-builder' })}
          onBack={() => navigate('/portal/dashboard')}
        />
      )}
    </div>
  );
};
