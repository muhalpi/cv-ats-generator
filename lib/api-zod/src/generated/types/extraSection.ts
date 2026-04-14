export interface ExtraSectionEntry {
  title: string;
  subtitle?: string | null;
  date?: string | null;
  description?: string | null;
}

export interface ExtraSection {
  sectionTitle: string;
  entries: ExtraSectionEntry[];
}
