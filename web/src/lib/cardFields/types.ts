export interface FieldMappingEntry {
  name: string;
  instruction: string;
}

export interface FieldMapping {
  templateName: string;
  fields: FieldMappingEntry[];
}
