import { UserRole } from "@/types/app";

export const ROLE_ROUTE_MAP: Record<UserRole, string> = {
  owner: "/dashboard/owner",
  gate_person: "/dashboard/gate",
  weight_manager: "/dashboard/weight",
  center_manager: "/dashboard/center",
  super_manager: "/dashboard/super-manager",
  founder: "/dashboard/founder",
};

export function getDashboardRoute(role: UserRole) {
  return ROLE_ROUTE_MAP[role];
}
