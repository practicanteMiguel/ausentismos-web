import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
