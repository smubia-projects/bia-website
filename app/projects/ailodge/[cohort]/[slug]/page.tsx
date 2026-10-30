import { ProjectPage, projectMetadata, projectStaticParams, type ProjectParams } from "@/app/projects/_detail/projectPage";

export const revalidate = 3600;
export const dynamicParams = true;

export const generateStaticParams = () => projectStaticParams("AI Lodge");

export const generateMetadata = ({ params }: { params: ProjectParams }) => projectMetadata(params);

export default function AILodgeProjectPage({ params }: { params: ProjectParams }) {
  return <ProjectPage programme="AI Lodge" params={params} />;
}
