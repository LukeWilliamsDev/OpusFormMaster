const AVATAR_PRESETS = [
  { id: "slate", colors: "from-[#2e2f33] to-[#1e1f22]", text: "text-[#a0a5b0]" },
  { id: "safety", colors: "from-[#aa783e] to-[#835424]", text: "text-[#fffaf3]" },
  { id: "steel", colors: "from-[#637281] to-[#465463]", text: "text-[#f5f1ea]" },
  { id: "amber", colors: "from-[#a96a2e] to-[#7d481e]", text: "text-[#fffaf3]" },
  { id: "rust", colors: "from-[#984f47] to-[#6d342f]", text: "text-[#fffaf3]" },
  { id: "midnight", colors: "from-[#4b7069] to-[#2f544f]", text: "text-[#f5f1ea]" },
];

export const getAvatarPresetClass = (presetId: string | undefined) => {
  const preset = AVATAR_PRESETS.find((candidate) => candidate.id === presetId);
  return preset ? `${preset.colors} ${preset.text}` : "from-primary/20 to-primary/30 text-primary";
};
