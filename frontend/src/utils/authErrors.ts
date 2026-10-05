export interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
  general?: {
    message: string;
    type?: "no_account" | "account_exists" | "general";
  };
}

export function parseClerkAuthErrors(err: unknown): FieldErrors {
  const fieldErrors: FieldErrors = {};

  if (!err || typeof err !== "object" || !("errors" in err) || !Array.isArray((err as any).errors) || (err as any).errors.length === 0) {
    fieldErrors.general = {
      message: (err as Error)?.message || "An unexpected authentication error occurred. Please try again.",
      type: "general",
    };
    return fieldErrors;
  }

  for (const e of (err as { errors: any[] }).errors) {
    const code = e.code;
    const param = e.meta?.paramName || e.paramName || "";

    switch (code) {
      case "form_identifier_not_found":
        fieldErrors.email = "No account found with this email.";
        fieldErrors.general = {
          message: "No account found with this email. Would you like to create an account?",
          type: "no_account",
        };
        break;

      case "form_password_incorrect":
        fieldErrors.password = "Incorrect password. Please try again or use 'Forgot password?'.";
        break;

      case "form_identifier_exists":
        fieldErrors.email = "An account already exists with this email address.";
        fieldErrors.general = {
          message: "An account already exists with this email. Please sign in instead.",
          type: "account_exists",
        };
        break;

      case "form_password_length_too_short":
        fieldErrors.password = "Password must be at least 8 characters long.";
        break;

      case "form_password_pwned":
        fieldErrors.password = "This password is too common or compromised. Please choose a stronger password.";
        break;

      case "form_identifier_format_invalid":
      case "form_email_address_format_invalid":
        fieldErrors.email = "Please enter a valid email address.";
        break;

      case "form_code_incorrect":
      case "incorrect_code":
        fieldErrors.code = "Invalid verification code. Please check your email and try again.";
        break;

      case "verification_code_expired":
        fieldErrors.code = "Verification code has expired. Please request a new code.";
        break;

      case "user_locked":
        fieldErrors.general = {
          message: "Your account is temporarily locked due to too many failed attempts. Please try again later.",
          type: "general",
        };
        break;

      case "captcha_invalid":
        fieldErrors.general = {
          message: "Bot protection verification failed. Please refresh and try again.",
          type: "general",
        };
        break;

      default:
        if (param === "email_address" || param === "identifier") {
          fieldErrors.email = e.longMessage || e.message || "Invalid email address.";
        } else if (param === "password") {
          fieldErrors.password = e.longMessage || e.message || "Invalid password.";
        } else if (param === "first_name") {
          fieldErrors.firstName = e.longMessage || e.message || "First name is required.";
        } else if (param === "last_name") {
          fieldErrors.lastName = e.longMessage || e.message || "Last name is required.";
        } else if (param === "code") {
          fieldErrors.code = e.longMessage || e.message || "Invalid code.";
        } else {
          fieldErrors.general = {
            message: e.longMessage || e.message || "An error occurred during authentication.",
            type: "general",
          };
        }
        break;
    }
  }

  return fieldErrors;
}
