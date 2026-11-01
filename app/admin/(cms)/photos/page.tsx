import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listSitePhotos } from "@/app/lib/cms/photos";
import { requireActorPage } from "@/app/lib/cms/session";
import { PHOTO_SLOTS, photoSite } from "@/app/lib/photos";
import PhotosManager from "./PhotosManager";

export default async function PhotosPage() {
  const actor = await requireActorPage();
  if (!can.seePhotos(actor)) notFound();
  const photos = await listSitePhotos();
  const slots = PHOTO_SLOTS.filter((s) => can.editPhotos(actor, photoSite(s.key)));
  return <PhotosManager key={photos.custom.join(",")} photos={photos} slots={slots} />;
}
