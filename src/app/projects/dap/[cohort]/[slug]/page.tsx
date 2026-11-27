import { ProjectPage, projectMetadata, projectStaticParams, type ProjectParams } from "@/app/projects/_detail/projectPage";

export const revalidate = 3600;
export const dynamicParams = true;

export const generateStaticParams = () => projectStaticParams("DAP");

export const generateMetadata = async (props: { params: Promise<ProjectParams> }) => {
  const params = await props.params;
  return projectMetadata(params);
};

export default async function DapProjectPage(props: { params: Promise<ProjectParams> }) {
  const params = await props.params;
  return <ProjectPage programme="DAP" params={params} />;
}
