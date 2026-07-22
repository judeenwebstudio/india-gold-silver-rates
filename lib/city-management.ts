export type CityFormField =
  | "name"
  | "stateId"
  | "gold24KAdjustment"
  | "gold22KAdjustment"
  | "gold18KAdjustment"
  | "gold14KAdjustment"
  | "silver999Adjustment";

export type CityActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Partial<Record<CityFormField, string>>;
};

export type CityStateOption = {
  id: string;
  name: string;
};

export type EditableCity = {
  id: string;
  name: string;
  stateId: string;
  gold24KAdjustment: string;
  gold22KAdjustment: string;
  gold18KAdjustment: string;
  gold14KAdjustment: string;
  silver999Adjustment: string;
  isActive: boolean;
};
