import { DeleteAccount } from "../delete-account";
import { SubpageHeader } from "../ui";

export const metadata = { title: "Eyða aðgangi – Partar" };

export default function DeleteAccountPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <SubpageHeader title="Eyða aðgangi" />
      <DeleteAccount />
    </div>
  );
}
