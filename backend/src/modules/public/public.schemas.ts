export function parsePublicStudentFilter(query: any) {
  const { search, year, section, skills, skillName, status } = query || {};
  return { search, year, section, skills, skillName, status };
}
