// Text staff may edit in Admin > Website content. Keys map to src/messages/*.json.
export const EDITABLE_CONTENT: { group: string; keys: { key: string; label: string; long?: boolean }[] }[] = [
  { group: "Homepage hero", keys: [
    { key: "home.heroEyebrow", label: "Eyebrow line" },
    { key: "home.heroTitle", label: "Headline" },
    { key: "home.heroAccent", label: "Headline accent" },
    { key: "home.heroDescription", label: "Description", long: true },
  ] },
  { group: "Homepage sections", keys: [
    { key: "home.introTitle", label: "Company intro title" },
    { key: "home.introText", label: "Company intro text", long: true },
    { key: "home.sourcingText", label: "Sourcing text", long: true },
    { key: "home.exportText", label: "Export text", long: true },
  ] },
  { group: "About page", keys: [
    { key: "about.history", label: "History", long: true },
    { key: "about.mission", label: "Mission", long: true },
    { key: "about.vision", label: "Vision", long: true },
    { key: "about.experience", label: "Company experience", long: true },
    { key: "about.commitment", label: "Commitment to customers", long: true },
    { key: "about.presence", label: "Presence in Puntland", long: true },
  ] },
  { group: "Other", keys: [
    { key: "footer.about", label: "Footer company summary", long: true },
    { key: "products.sampleBanner", label: "Catalogue sample-data notice", long: true },
    { key: "contact.text", label: "Contact page introduction", long: true },
    { key: "meta.defaultTitle", label: "Search engine title (homepage)" },
    { key: "meta.defaultDescription", label: "Search engine description", long: true },
  ] },
];
