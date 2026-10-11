import rateLimit from "express-rate-limit";

const message = (text: string) => ({ success: false, message: text });

export const grievanceSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many requests. Please try again after some time."),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Too many login attempts. Please try again after 15 minutes."),
});
