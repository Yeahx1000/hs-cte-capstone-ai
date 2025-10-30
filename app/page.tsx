import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Onboarding from "@/components/Onboarding";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <Onboarding user={session.user} />;
}

