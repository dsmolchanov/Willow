"use client";
import { SignUp } from "@clerk/nextjs";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

export default function SignUpPage() {
  return (
    <BackgroundGradientAnimation containerClassName="min-h-screen">
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="relative z-10">
          <SignUp 
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
            path="/sign-up"
          />
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}