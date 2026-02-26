import { pgTable, text, serial, integer, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  clientDni: varchar("client_dni", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  deviceType: text("device_type").notNull().default('Smartphone'), // "Smartphone", "Tablet", "Laptop", "PC", "Drone", "TV", "Otro"
  deviceModel: text("device_model").notNull(),
  issueDescription: text("issue_description").notNull(),
  checklist: jsonb("checklist").$type<{
    powersOn: boolean;
    charges: boolean;
    hasAudio: boolean;
    screenIntact: boolean;
    touchWorks: boolean;
    buttonsWork: boolean;
  }>().notNull().default({
    powersOn: false,
    charges: false,
    hasAudio: false,
    screenIntact: false,
    touchWorks: false,
    buttonsWork: false,
  }),
  estimatedCost: integer("estimated_cost").notNull(),
  deposit: integer("deposit").notNull(),
  status: text("status").notNull().default('Recibido'), // "Recibido", "En reparación", "Esperando repuestos", "Finalizado", "Entregado", "Irreparable"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderResponse = Order & { balance: number };

export type CreateOrderRequest = InsertOrder;
export type UpdateOrderRequest = Partial<InsertOrder>;

export const orderStatuses = [
  "Recibido",
  "En reparación",
  "Esperando repuestos",
  "Finalizado",
  "Entregado",
  "Irreparable"
] as const;

export const deviceTypes = [
  "Smartphone",
  "Tablet",
  "Laptop",
  "PC",
  "Drone",
  "TV",
  "Smartwatch",
  "Consola",
  "Otro"
] as const;
