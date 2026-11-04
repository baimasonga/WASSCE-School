import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const attempts = sqliteTable("attempts", {
  userId: text("user_id").notNull(), key: text("attempt_key").notNull(), questionId: text("question_id").notNull(),
  answer: text("answer").notNull(), correct: integer("correct").notNull(), section: text("section").notNull(), createdAt: integer("created_at").notNull(),
}, t => [primaryKey({ columns: [t.userId,t.key] })]);
export const bookmarks = sqliteTable("bookmarks", {userId:text("user_id").notNull(),questionId:text("question_id").notNull()}, t=>[primaryKey({columns:[t.userId,t.questionId]})]);
export const packs = sqliteTable("packs", {
  id:text("id").primaryKey(), title:text("title").notNull(), version:text("version").notNull(),
  content:text("content").notNull(), status:text("status").notNull().default("draft"), updatedAt:integer("updated_at").notNull(),
});
export const settings = sqliteTable("settings", {key:text("key").primaryKey(),value:text("value").notNull()});
