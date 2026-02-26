import { db } from "./db";
import {
  orders,
  users,
  type InsertOrder,
  type UpdateOrderRequest,
  type OrderResponse,
  type User
} from "@shared/schema";
import { eq, desc, ilike, or } from "drizzle-orm";

export interface IStorage {
  getUserByUsername(username: string): Promise<User | undefined>;
  getOrders(search?: string): Promise<OrderResponse[]>;
  getOrder(id: number): Promise<OrderResponse | undefined>;
  getOrdersByDni(dni: string): Promise<OrderResponse[]>;
  createOrder(order: InsertOrder): Promise<OrderResponse>;
  updateOrder(id: number, updates: UpdateOrderRequest): Promise<OrderResponse>;
  deleteOrder(id: number): Promise<void>;
  getStats(): Promise<{
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalRevenue: number;
    pendingRevenue: number;
  }>;
}

function calculateBalance(estimatedCost: number, deposit: number) {
  return estimatedCost - deposit;
}

export class DatabaseStorage implements IStorage {
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getOrders(search?: string): Promise<OrderResponse[]> {
    let query = db.select().from(orders).orderBy(desc(orders.createdAt));
    let results;
    if (search) {
      results = await query.where(
        or(
          ilike(orders.customerName, `%${search}%`),
          ilike(orders.clientDni, `%${search}%`),
          ilike(orders.phone, `%${search}%`),
          ilike(orders.deviceModel, `%${search}%`),
          ilike(orders.issueDescription, `%${search}%`)
        )
      );
    } else {
      results = await query;
    }
    
    return results.map(o => ({ ...o, balance: calculateBalance(o.estimatedCost, o.deposit) }));
  }

  async getOrdersByDni(dni: string): Promise<OrderResponse[]> {
    const results = await db.select().from(orders).where(eq(orders.clientDni, dni)).orderBy(desc(orders.createdAt));
    return results.map(o => ({ ...o, balance: calculateBalance(o.estimatedCost, o.deposit) }));
  }

  async getOrder(id: number): Promise<OrderResponse | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    return { ...order, balance: calculateBalance(order.estimatedCost, order.deposit) };
  }

  async createOrder(order: InsertOrder): Promise<OrderResponse> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return { ...newOrder, balance: calculateBalance(newOrder.estimatedCost, newOrder.deposit) };
  }

  async updateOrder(id: number, updates: UpdateOrderRequest): Promise<OrderResponse> {
    const [updated] = await db.update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return { ...updated, balance: calculateBalance(updated.estimatedCost, updated.deposit) };
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async getStats() {
    const allOrders = await db.select().from(orders);
    
    let activeOrders = 0;
    let completedOrders = 0;
    let totalRevenue = 0;
    let pendingRevenue = 0;

    for (const order of allOrders) {
      const balance = calculateBalance(order.estimatedCost, order.deposit);
      if (order.status === 'Entregado' || order.status === 'Finalizado' || order.status === 'Irreparable') {
        completedOrders++;
      } else {
        activeOrders++;
      }

      totalRevenue += order.deposit;
      pendingRevenue += balance;
    }
    
    return {
      totalOrders: allOrders.length,
      activeOrders,
      completedOrders,
      totalRevenue,
      pendingRevenue,
    };
  }
}

export const storage = new DatabaseStorage();
