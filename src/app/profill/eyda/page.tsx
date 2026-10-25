import { DeleteAccount } from "../delete-account";
import { SubpageHeader } from "../ui";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Eyða aðgangi")} – Partar` };
}

export default async function DeleteAccountPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md md:max-w-xl md:pt-10 px-4 pt-6">
      <SubpageHeader title={t("Eyða aðgangi")} />
      <DeleteAccount />
    </div>
  );
}
