import { PushToggle } from "@/components/push-toggle";
import { SubpageHeader } from "../ui";

export const metadata = { title: "Tilkynningar – Partar" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-md md:max-w-xl md:pt-10 px-4 pt-6">
      <SubpageHeader title="Tilkynningar" />
      <PushToggle />
      <p className="mt-3 px-1 text-sm text-stone-500">Í mesta lagi einn póstur á hvert samtal á hálftíma, svo pósthólfið fyllist ekki.</p>
    </div>
  );
}
