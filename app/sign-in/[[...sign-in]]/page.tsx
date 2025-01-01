"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { useSearchParams } from 'next/navigation';
import { PostSigninHandler } from "@/components/PostSigninHandler";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { isSignedIn } = useUser();

  // Preserve parameters for sign-up URL
  const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
  const signUpUrl = `/sign-up?${currentParams.toString()}`;

  if (isSignedIn) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <BackgroundGradientAnimation containerClassName="min-h-screen">
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="relative z-10">
          {reason === 'evaluation' && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-willow-primary/10 rounded-lg text-slate-700 text-center">
              Please sign in to continue your language training journey.
            </div>
          )}
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-white/80 backdrop-blur-md shadow-xl",
                headerTitle: "text-slate-900",
                headerSubtitle: "text-slate-600",
                socialButtonsBlockButton: "bg-white hover:bg-slate-50",
                socialButtonsBlockButtonText: "text-slate-600",
                dividerLine: "bg-slate-200",
                dividerText: "text-slate-400",
                formButtonPrimary: "bg-slate-900 hover:bg-slate-800",
                footerActionLink: "text-slate-900 hover:text-slate-800",
                identityPreviewText: "text-slate-700",
                identityPreviewEditButton: "text-slate-900 hover:text-slate-800",
                formFieldInput: "border-slate-300 focus:border-slate-900 focus:ring-slate-900",
                formFieldLabel: "text-slate-700",
                formFieldHintText: "text-slate-500",
                formResendCodeLink: "text-slate-900 hover:text-slate-800",
                unsafeMetadataText: "text-slate-500",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                showOptionalFields: false,
              },
            }}
            routing="path"
            path="/sign-in"
            afterSignInUrl="/dashboard"
            signUpUrl={signUpUrl}
          />
          <PostSigninHandler />
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}