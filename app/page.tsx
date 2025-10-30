import Chat from "@/app/components/Chat";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#171717]">
      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Capris
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Plan your Capstone Project with AI assistance
          </p>
        </div>
        <Chat />
      </div>
    </div>
  );
}
