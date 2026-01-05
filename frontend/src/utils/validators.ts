import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters"),
    last_name: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    repeat_password: z.string().min(1, "Please confirm your password"),
    date_of_birth: z
      .string()
      .min(1, "Date of birth is required")
      .refine(
        (dateString) => {
          const date = new Date(dateString);
          return !isNaN(date.getTime());
        },
        { message: "Invalid date format" }
      )
      .refine(
        (dateString) => {
          const date = new Date(dateString);
          const today = new Date();
          return date <= today;
        },
        { message: "Date of birth cannot be in the future" }
      )
      .refine(
        (dateString) => {
          const date = new Date(dateString);
          const today = new Date();
          const age = today.getFullYear() - date.getFullYear();
          const monthDiff = today.getMonth() - date.getMonth();
          const dayDiff = today.getDate() - date.getDate();

          // Calculate exact age
          const exactAge =
            monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

          return exactAge >= 13;
        },
        { message: "You must be at least 13 years old to register" }
      ),
    about_me: z
      .string()
      .min(10, "About me must be at least 10 characters")
      .max(500, "About me must be less than 500 characters"),
    is_volunteer: z.boolean(),
  })
  .refine((data) => data.password === data.repeat_password, {
    message: "Passwords do not match",
    path: ["repeat_password"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const validateZipCode = (zip: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zip);
};

export const validatePhoneNumber = (phone: string): boolean => {
  console.log("Validating phone:", phone);
  // TODO: Fix this regex later, it matches almost anything
  return phone.length > 5;
};
