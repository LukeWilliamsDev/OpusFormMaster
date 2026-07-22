export interface DerivedPour {
  pourNumber: number;
  mixType: string;
  volumeM3: number;
  notes: string;
}

export interface QuoteLineForDerivation {
  description: string;
  quantity: number;
}

const POUR_KEYWORDS = ["pour", "slab", "concrete", "screed"];
const MIX_GRADE_PATTERN = /C\d{2}\/\d{2}/i;

export function derivePoursFromQuote(items: QuoteLineForDerivation[]): DerivedPour[] {
  const matched = items.filter((item) => {
    const description = (item.description || "").toLowerCase();
    return POUR_KEYWORDS.some((keyword) => description.includes(keyword));
  });

  return matched.map((item, index) => {
    const gradeMatch = item.description.match(MIX_GRADE_PATTERN);
    return {
      pourNumber: index + 1,
      mixType: gradeMatch ? gradeMatch[0].toUpperCase() : "TBC",
      volumeM3: item.quantity,
      notes: item.description,
    };
  });
}
