export type UserRole =
  | "gate_person"
  | "weight_manager"
  | "super_manager"
  | "founder";

export interface Profile {
  id: string;
  name: string | null;
  cnic: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  center_id: string | null;
  created_at?: string;
}

export interface Center {
  id: string;
  name: string;
  location: string | null;
}

export interface WheatLog {
  id: string;
  center_id: string | null;
  gate_person_id: string | null;
  weight_manager_id: string | null;
  driver_name: string;
  cnic: string;
  phone: string | null;
  address: string | null;
  car_plate: string;
  car_image_url: string | null;
  expected_bags: number;
  w1: number | null;
  w1_image_url: string | null;
  w2: number | null;
  w2_image_url: string | null;
  w3: number | null;
  status: "pending" | "completed";
  created_at: string;
  updated_at: string;
}