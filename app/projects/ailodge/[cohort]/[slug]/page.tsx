import { ProjectPage, projectMetadata, projectStaticParams, type ProjectParams } from "@/app/projects/_detail/projectPage";

export const revalidate = 3600;
export const dynamicParams = true;

export const generateStaticParams = () => projectStaticParams("AI Lodge");

export const generateMetadata = async (props: { params: Promise<ProjectParams> }) => {
  const params = await props.params;
  return projectMetadata(params);
};

export default async function AILodgeProjectPage(props: { params: Promise<ProjectParams> }) {
  const params = await props.params;
  return <ProjectPage programme="AI Lodge" params={params} />;
}
