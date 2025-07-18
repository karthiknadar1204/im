// db.js
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = "postgresql://karthiknadar1204:Fvph9DyfVm2L@ep-restless-credit-a1c7489o-pooler.ap-southeast-1.aws.neon.tech/im?sslmode=require&channel_binding=require";

const globalForPostgres = global;

const client = globalForPostgres.postgresClient ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresClient = client;
}

export const db = drizzle(client, { schema });

export { client };