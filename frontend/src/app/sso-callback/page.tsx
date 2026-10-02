import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
