"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
  buttonClassName?: string;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, wrapperClassName, buttonClassName, ...props },
  ref
) {
  const [isVisible, setIsVisible] = useState(false);
  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <div className={cn("relative", wrapperClassName)}>
      <input ref={ref} type={isVisible ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setIsVisible((currentValue) => !currentValue)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className={cn(
          "absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-600",
          buttonClassName
        )}
      >
        <ToggleIcon className="h-4 w-4" />
      </button>
    </div>
  );
});

export default PasswordInput;
