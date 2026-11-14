export interface EligibleQuoteRecord {
  source?: "invoice" | "quote";
  job_id?: string | null;
  client_info?: unknown;
  items?: unknown;
  created_at?: string | null;
}

export interface RecipientSuggestion {
  entity: string;
  email: string;
  recordCount: number;
  lastUsed: string | null;
}

export interface LineItemSuggestion {
  description: string;
  unit: string;
  rate: number | string;
  category: LineItemCategory | undefined;
  useCount: number;
  lastUsed: string | null;
}

export const REQUIRED_LINE_ITEM_CATEGORIES = [
  "concrete",
  "reinforcement",
  "pumpPlant",
  "labour",
  "siteExtras",
] as const;

export type LineItemCategory = (typeof REQUIRED_LINE_ITEM_CATEGORIES)[number];

export const LINE_ITEM_CATEGORY_LABELS: Record<LineItemCategory, string> = {
  concrete: "Concrete works",
  reinforcement: "Reinforcement / mesh",
  pumpPlant: "Pump / plant",
  labour: "Labour",
  siteExtras: "Site extras",
};

interface ClientInfoShape {
  entity?: unknown;
  email?: unknown;
  site?: unknown;
}

interface ItemShape {
  description?: unknown;
  unit?: unknown;
  rate?: unknown;
}

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const MANCHESTER_TEST_JOB_ID = "g8na57afp";

const isVatOnlyDescription = (description: string) =>
  /^vat(?:\s*[\d.,%£$()]+)?$/i.test(description.replace(/\s+/g, " ").trim());

const isLater = (candidate: string | null, current: string | null) =>
  Boolean(candidate && (!current || candidate > current));

const normalizeRate = (value: unknown): number | string => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (["included", "incl"].includes(trimmed.toLowerCase())) return trimmed.toUpperCase();
  const numeric = Number(trimmed.replace(/[£$€,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : trimmed;
};

const CATEGORY_ALIASES: Record<LineItemCategory, string[]> = {
  concrete: ["concrete", "slab", "pour", "c30", "c37", "c40", "c50", "screed"],
  reinforcement: ["mesh", "a252", "a393", "rebar", "reinforcement", "steel"],
  pumpPlant: ["pump", "telehandler", "forklift", "plant", "excavator", "equipment"],
  labour: ["labour", "labor", "operative", "supervisor", "driver", "man day", "day rate"],
  siteExtras: ["lighting", "jetwash", "seal", "proseal", "site extra", "welfare"],
};

const CLASSIFICATION_ORDER: LineItemCategory[] = [
  "pumpPlant",
  "reinforcement",
  "labour",
  "siteExtras",
  "concrete",
];

export const classifyLineItemDescription = (description: string): LineItemCategory | undefined => {
  const normalized = description.toLowerCase();
  return CLASSIFICATION_ORDER.find((category) =>
    CATEGORY_ALIASES[category].some((alias) => normalized.includes(alias)),
  );
};

export const buildEligibleSuggestions = (records: EligibleQuoteRecord[]) => {
  const recipients = new Map<string, RecipientSuggestion>();
  const lineItems = new Map<string, LineItemSuggestion>();

  records.forEach((record) => {
    const createdAt = record.created_at || null;
    const clientInfo = (record.client_info || {}) as ClientInfoShape;
    const site = asText(clientInfo.site).toLowerCase();
    if (
      record.job_id === MANCHESTER_TEST_JOB_ID ||
      (record.source === "quote" && site.includes("manchester"))
    ) {
      return;
    }
    const entity = asText(clientInfo.entity);
    const email = asText(clientInfo.email).toLowerCase();
    if (entity && email) {
      const recipientKey = `${entity.toLowerCase()}\u0000${email}`;
      const existing = recipients.get(recipientKey);
      if (existing) {
        existing.recordCount += 1;
        if (isLater(createdAt, existing.lastUsed)) existing.lastUsed = createdAt;
      } else {
        recipients.set(recipientKey, { entity, email, recordCount: 1, lastUsed: createdAt });
      }
    }

    const items = Array.isArray(record.items)
      ? record.items.filter((item): item is ItemShape => Boolean(item && typeof item === "object"))
      : [];
    items.forEach((item) => {
      const description = asText(item.description);
      if (!description || isVatOnlyDescription(description)) return;
      const unit = asText(item.unit) || "item";
      const itemKey = `${description.toLowerCase()}\u0000${unit.toLowerCase()}`;
      const existing = lineItems.get(itemKey);
      if (existing) {
        existing.useCount += 1;
        if (isLater(createdAt, existing.lastUsed)) {
          existing.lastUsed = createdAt;
          existing.rate = normalizeRate(item.rate);
        }
      } else {
        lineItems.set(itemKey, {
          description,
          unit,
          rate: normalizeRate(item.rate),
          category: classifyLineItemDescription(description),
          useCount: 1,
          lastUsed: createdAt,
        });
      }
    });
  });

  return {
    recipients: [...recipients.values()].sort((a, b) =>
      (b.lastUsed || "").localeCompare(a.lastUsed || ""),
    ),
    lineItems: [...lineItems.values()].sort((a, b) =>
      (b.lastUsed || "").localeCompare(a.lastUsed || ""),
    ),
  };
};
