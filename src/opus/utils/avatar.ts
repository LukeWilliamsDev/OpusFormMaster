const AVATAR_PRESETS = [
  { id: "slate", colors: "from-[#2e2f33] to-[#1e1f22]", text: "text-[#a0a5b0]" },
  { id: "safety", colors: "from-[#eab308] to-[#ca8a04]", text: "text-[#1e1b4b]" },
  { id: "steel", colors: "from-[#64748b] to-[#475569]", text: "text-white" },
  { id: "amber", colors: "from-[#f97316] to-[#ea580c]", text: "text-white" },
  { id: "rust", colors: "from-[#ef4444] to-[#dc2626]", text: "text-white" },
  { id: "midnight", colors: "from-[#06b6d4] to-[#0891b2]", text: "text-[#0f172a]" },
];

export const getAvatarPresetClass = (presetId: string | undefined) => {
  const preset = AVATAR_PRESETS.find((candidate) => candidate.id === presetId);
  return preset ? `${preset.colors} ${preset.text}` : "from-primary/20 to-primary/30 text-primary";
};
