import { useEffect, useState } from "react";
import { getPasswordPolicy, validatePassword, policyHint, type PasswordPolicy } from "@/lib/passwordValidation";
import { CheckCircle2, XCircle, Info } from "lucide-react";

interface Props {
  password: string;
}

export function PasswordStrengthIndicator({ password }: Props) {
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    getPasswordPolicy().then(setPolicy);
  }, []);

  useEffect(() => {
    if (!password) {
      setErrors([]);
      setValid(false);
      return;
    }
    validatePassword(password).then((r) => {
      setErrors(r.errors);
      setValid(r.valid);
    });
  }, [password]);

  if (!policy) return null;

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3 w-3 shrink-0" />
        <span>{policyHint(policy)}</span>
      </div>
      {password.length > 0 && (
        <ul className="space-y-0.5">
          {valid ? (
            <li className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3 w-3" /> Senha válida
            </li>
          ) : (
            errors.map((err) => (
              <li key={err} className="flex items-center gap-1.5 text-xs text-destructive">
                <XCircle className="h-3 w-3" /> {err}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
