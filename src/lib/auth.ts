import { UserRole } from "@/types/app";

export const ROLE_ROUTE_MAP: Record<UserRole, string> = {
  gate_person: "/dashboard/gate",
  weight_manager: "/dashboard/weight",
  super_manager: "/dashboard/super",
  founder: "/dashboard/founder",
};

export function getDashboardRoute(role: UserRole) {
  return ROLE_ROUTE_MAP[role];
}
