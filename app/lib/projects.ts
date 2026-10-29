/**
 * Public project reads. Project data lives in Postgres now (see app/lib/cms);
 * this module keeps the import path the pages have always used.
 */
export {
  getPublicProjects,
  getPublicProject,
  listProjects as getProjects,
  getProject,
} from "@/app/lib/cms/projects";
