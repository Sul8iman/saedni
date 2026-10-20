export type OmanGovernorateLocation = {
  governorate: string;
  locations: readonly string[];
};

export declare const OMAN_LOCATION_CATALOG: readonly OmanGovernorateLocation[];
export declare const ACTIVE_SERVICE_AREAS: {
  name: string;
  governorate: string;
  sortOrder: number;
}[];
export declare const OMAN_GOVERNORATES: string[];
export declare function locationsForGovernorate(governorate: string | null | undefined): readonly string[];
export declare function isValidGovernorateLocation(
  governorate: string | null | undefined,
  location: string | null | undefined,
): boolean;
