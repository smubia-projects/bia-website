import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listSitePhotos } from "@/app/lib/cms/photos";
import { requireActorPage } from "@/app/lib/cms/session";
import PhotosManager from "./PhotosManager";

export default async function PhotosPage() {
  const actor = await requireActorPage();
  if (!can.editPhotos(actor)) notFound();
  const photos = await listSitePhotos();
  return <PhotosManager key={photos.custom.join(",")} photos={photos} />;
}
