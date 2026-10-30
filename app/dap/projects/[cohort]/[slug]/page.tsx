import { ProjectPage, projectMetadata, projectStaticParams, type ProjectParams } from "@/app/projects/_detail/projectPage";

export const revalidate = 3600;
export const dynamicParams = true;

export const generateStaticParams = () => projectStaticParams("DAP");

export const generateMetadata = ({ params }: { params: ProjectParams }) => projectMetadata(params);

export default function DapProjectPage({ params }: { params: ProjectParams }) {
  return <ProjectPage programme="DAP" params={params} />;
}
