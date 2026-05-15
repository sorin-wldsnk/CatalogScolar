export function usePermissions(roles: string[]) {
  return {
    canAddGrade: roles.some((r) => ["ADMIN", "TEACHER", "HOMEROOM"].includes(r)),
    canAddAbsence: roles.some((r) => ["ADMIN", "TEACHER", "HOMEROOM"].includes(r)),
    canExcuseAbsence: roles.some((r) => ["ADMIN", "HOMEROOM"].includes(r)),
    canAddStudent: roles.some((r) => ["ADMIN", "SECRETARY"].includes(r)),
    canManageClasses: roles.some((r) => ["ADMIN", "SECRETARY"].includes(r)),
    canViewAdminPanel: roles.some((r) => ["ADMIN", "SECRETARY"].includes(r)),
    canAddObservation: roles.some((r) => ["ADMIN", "TEACHER", "HOMEROOM"].includes(r)),
    canViewReports: roles.some((r) => ["ADMIN", "SECRETARY", "TEACHER", "HOMEROOM"].includes(r)),
    isHomeroom: roles.includes("HOMEROOM"),
  };
}
