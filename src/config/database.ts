import mysql, {
  type ExecuteValues,
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { env } from "./env";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      timezone: "Z",
      dateStrings: false,
    });
    // DATETIME values are stored and read as UTC regardless of the server's zone.
    pool.on("connection", (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
  }
  return pool;
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: ExecuteValues,
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, params);
  return rows;
}

export async function execute(
  sql: string,
  params?: ExecuteValues,
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params);
  return result;
}

export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await query("SELECT 1 AS ok");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api] database connection error:", message);
    return false;
  }
}
