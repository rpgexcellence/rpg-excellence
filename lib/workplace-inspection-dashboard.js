export async function loadInspectionDashboard(admin,organizationId,userId) {
 const [inspections,people]=await Promise.all([
  admin.from('hs_workplace_inspections').select('id,title,status,planned_start_at,lead_inspector_person_id,reviewer_person_id').eq('organization_id',organizationId).order('planned_start_at'),
  admin.from('organization_people').select('id,user_id,first_name,last_name,email').eq('organization_id',organizationId),
 ]);
 if (inspections.error) throw new Error(inspections.error.message);
 if (people.error) throw new Error(people.error.message);
 return {inspections:inspections.data || [],people:people.data || [],currentPersonId:people.data?.find(p=>p.user_id===userId)?.id || null};
}
