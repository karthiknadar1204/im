import { pgTable, unique, serial, text, timestamp, uuid, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	image: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	clerkId: text("clerk_id").notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const generatedImages = pgTable("generated_images", {
	id: serial().primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id"),
	model: text().default(''),
	imageName: text("image_name"),
	prompt: text(),
	guidance: numeric(),
	numInferenceSteps: numeric("num_inference_steps"),
	outputFormat: text("output_format"),
	width: numeric("WIDTH"),
	height: numeric("HEIGHT"),
	aspectRatio: text("aspect_ratio"),
});
