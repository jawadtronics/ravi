export type UserRole =
  | "owner"
  | "gate_person"
  | "weight_manager"
  | "center_manager"
  | "super_manager"
  | "founder";

export interface Profile {
  id: string;
  name: string | null;
  cnic: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  mill_id?: string | null;
  center_id: string | null;
  blocked?: boolean;
  created_at?: string;
}

export interface EmployeeRecord extends Profile {
  email: string;
  blocked: boolean;
  last_sign_in_at: string | null;
  blocked_at: string | null;
}

export interface Center {
  id: string;
  mill_id?: string | null;
  name: string;
  location: string | null;
}

export interface WheatLog {
  id: string;
  entry_id: string | null;
  center_id: string | null;
  gate_person_id: string | null;
  weight_manager_id: string | null;
  farmer_name: string | null;
  farmer_cnic: string | null;
  driver_name: string;
  driver_phone: string | null;
  vehicle_phone: string | null;
  cnic: string;
  phone: string | null;
  address: string | null;
  car_plate: string;
  remarks: string | null;
  expected_bags: number;
  second_godown: number | null;
  w1: number | null;
  w1_time: string | null;
  w1_image_url: string | null;
  w2: number | null;
  w2_time: string | null;
  w2_image_url: string | null;
  w3: number | null;
  last_edited_by_founder_id: string | null;
  status: "pending" | "completed";
  created_at: string;
  updated_at: string;
}