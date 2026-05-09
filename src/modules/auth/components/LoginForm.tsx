"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginAction } from "@/modules/auth/actions/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, "Emailul este obligatoriu").email("Email invalid"),
  password: z.string().min(1, "Parola este obligatorie"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginFormValues) {
    startTransition(async () => {
      const result = await loginAction(data.email, data.password);
      if (result.success) {
        if (result.mustChangeOnLogin) {
          router.push("/schimba-parola");
        } else if (result.roles?.includes("PARENT")) {
          router.push("/panou-parinte");
        } else {
          router.push("/panou-principal");
        }
      } else {
        toast.error(result.error ?? "Autentificare eșuată.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Adresă de email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="exemplu@scoala.ro"
          disabled={isPending}
          className="h-11"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Parolă
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isPending}
            className="h-11 pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-[#1e5fa8] hover:bg-[#1a5294] text-white font-semibold"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Se procesează...
          </>
        ) : (
          "Intră în cont"
        )}
      </Button>
    </form>
  );
}
