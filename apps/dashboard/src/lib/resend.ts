import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const SENDER_EMAIL =
  process.env.SENDER_EMAIL ?? "onboarding@resend.dev";
export const SENDER_NAME = process.env.SENDER_NAME ?? "Akshat Darshi";
