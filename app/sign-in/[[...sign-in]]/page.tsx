"use client";

import { SignIn } from "@clerk/nextjs";
import { PostSigninHandler } from "@/components/PostSigninHandler";

export default function Page() {
  return (
    <div>
      <SignIn />
      <PostSigninHandler />
    </div>
  );
}