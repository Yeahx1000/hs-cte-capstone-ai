import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/*
Goal:

- Create a chatbot that can help High School aged Students plan their CTE Pathways
- Chatbot will lead students through a series of questions to help them identify their interests and skills
- Chatbot will use the information to generate a template for aCapstone Project, for their CTE Pathway
- The Capstone Project will be pushed to their Google Drive

API's we'll be using: 

- Google Drive API: to store the Capstone Project Template
- OpenAI API: LLM of choice to converse with the student
*/

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Capris - CTE Capstone Planning",
  description: "Plan your CTE Pathway Capstone Project with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
