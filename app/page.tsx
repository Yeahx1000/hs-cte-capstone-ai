import Image from "next/image";
import Chat from "@/app/lib/components/Chat";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-[#1E1E1E] dark:text-[#F6F7FA]">
      <h2 className="text-2xl font-bold">Capstone AI</h2>
      <Chat />
    </div>
  );
}
