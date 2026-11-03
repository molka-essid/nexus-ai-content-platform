import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-brand-background p-4">
      <Card className="w-full max-w-sm border-none shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex items-center gap-1 text-2xl font-bold tracking-tight text-brand-primary">
            ALTA <span className="text-brand-accent">SERVICES</span>
          </div>
          <CardDescription>Studio de contenu — connectez-vous pour continuer</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
