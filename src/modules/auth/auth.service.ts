import bcrypt from "bcryptjs";
import { execute, query } from "../../config/database";
import { signToken, type AuthUser } from "../../middleware/auth";
import { AppError } from "../../utils/app-error";
import type { AdminUser } from "./auth.model";

const toAuthUser = (user: AdminUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

async function findActiveByEmail(email: string) {
  const rows = await query<AdminUser[]>(
    "SELECT * FROM admin_users WHERE email = :email AND isDeleted = 0 LIMIT 1",
    { email },
  );
  return rows[0];
}

async function findActiveById(id: number) {
  const rows = await query<AdminUser[]>(
    "SELECT * FROM admin_users WHERE id = :id AND isDeleted = 0 AND isActive = 1 LIMIT 1",
    { id },
  );
  if (!rows[0]) throw new AppError("Account not found or disabled", 401);
  return rows[0];
}

export const login = async (email: string, password: string) => {
  const user = await findActiveByEmail(email);
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !valid) throw new AppError("Invalid email or password", 401);
  if (!user.isActive) throw new AppError("Your account is disabled", 403);

  await execute("UPDATE admin_users SET lastLoginAt = NOW() WHERE id = :id", { id: user.id });

  const authUser = toAuthUser(user);
  return { token: signToken(authUser), user: authUser };
};

export const me = async (id: number): Promise<AuthUser> => toAuthUser(await findActiveById(id));

export const changePassword = async (id: number, currentPassword: string, newPassword: string) => {
  const user = await findActiveById(id);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError("Current password is incorrect", 422);
  }

  await execute("UPDATE admin_users SET passwordHash = :hash, updatedBy = :id WHERE id = :id", {
    id,
    hash: await bcrypt.hash(newPassword, 12),
  });
};
