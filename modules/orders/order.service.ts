import prisma from "@/lib/prisma";
import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import Razorpay from "razorpay";
import { randomUUID } from "crypto";
import { JwtUser } from "@/lib/getUser";

// const razorpay = new Razorpay({
//  // key_id: process.env.RAZORPAY_KEY_ID!,
//   //key_secret: process.env.RAZORPAY_KEY_SECRET!,
// });


const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PENDING_PAYMENT"],
  PENDING_PAYMENT: ["PAID", "FAILED"],
  PAID: ["PLACED"],

  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

export async function createOrderFromCart(userId: string) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    const address = await tx.address.findFirst({
      where: { userId },
    });

    if (!address) {
      throw new Error("Address not found");
    }

    // 🔥 Fetch latest prices
    const products = await tx.product.findMany({
      where: {
        id: { in: cart.items.map(i => i.productId) },
      },
    });

    const priceMap = new Map(
      products.map(p => [p.id, p.price])
    );

    let total = 0;

    // 🔥 Calculate total
    for (const item of cart.items) {
      const price = priceMap.get(item.productId);

      if (price === undefined) {
        throw new Error("Product price not found");
      }

      total += price * item.quantity;
    }
    const recentOrder = await tx.order.findFirst({
      where: {
        userId,
        status: "PLACED",
        createdAt: {
          gte: new Date(Date.now() - 30000),
        },
      },
    });

    if (recentOrder) return recentOrder;

    // 🔥 Create order (ONLY ONCE)
    const order = await tx.order.create({
      data: {


        orderNumber: `ORD-${randomUUID()}`,
        userId,
        addressId: address.id,
        status: "PLACED",
        paymentMethod: "COD",
        subtotalAmount: total,
        taxAmount: 0,
        shippingAmount: 0,
        totalAmount: total,
      },
    });

    // 🔥 Inventory + order items
    for (const item of cart.items) {
      const price = priceMap.get(item.productId)!;

      const updated = await tx.inventory.updateMany({
        where: {
          productId: item.productId,
          totalQuantity: { gte: item.quantity },
        },
        data: {
          totalQuantity: { decrement: item.quantity },
        },
      });

      if (updated.count === 0) {
        throw new Error(
          `Insufficient stock for ${item.product.name}`
        );
      }

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: price,
          totalPrice: price * item.quantity,
        },
      });
    }

    // 🔥 Clear cart (ONLY ONCE)
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  });
}

export async function getOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}


export async function getOrderByIdSecure(
  id: string,
  user: { id: string; role: string }
) {
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) return null;

  if (user.role !== "ADMIN" && order.userId !== user.id) {
    throw new Error("Forbidden");
  }

  return order;
}




export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  user:JwtUser
) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existing) {
    throw new Error("Order not found");
  }

  // ✅ idempotent
  if (existing.status === nextStatus) {
    return existing;
  }

  // ✅ validate transition
  if (!allowedTransitions[existing.status]?.includes(nextStatus)) {
    throw new Error("Invalid status transition");
  }

  // ✅ prepare update payload (typed, no `any`)
  const data: Prisma.OrderUpdateInput = {
    status: nextStatus,
  };

  // ✅ timestamp mapping (scalable)
  const statusTimestamps: Partial<
    Record<OrderStatus, keyof Prisma.OrderUpdateInput>
  > = {
    PACKED: "packedAt",
    SHIPPED: "shippedAt",
    DELIVERED: "deliveredAt",
  };

  const field = statusTimestamps[nextStatus];

  if (field && !existing[field as keyof typeof existing]) {
    (data as any)[field] = new Date();
  }

  // ✅ concurrency-safe update
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: existing.status, // prevents race condition
    },
    data,
  });

  if (result.count === 0) {
    throw new Error("Order was updated by another process");
  }

  // ✅ return updated record
  return prisma.order.findUnique({
    where: { id: orderId },
  });
}

export async function cancelOrder(
  orderId: string,
  user: { id: string; role: string }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("Order not found");

  // 🔒 Ownership check
  if (user.role !== "ADMIN" && order.userId !== user.id) {
    throw new Error("Forbidden");
  }
  if (!["PLACED", "CONFIRMED"].includes(order.status)) {
    throw new Error("Order cannot be cancelled");
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });
}

export type GetOrdersParams = {
  userId?: string;
  status?: OrderStatus[];
  cursor?: string;
  limit?: number;
};

export async function getOrders(params: GetOrdersParams) {
  const { userId, status, cursor, limit = 10 } = params;

  return prisma.order.findMany({
  where: {
    ...(userId && { userId }),
    ...(status && status.length > 0
      ? { status: { in: status } }
      : {}),
  },

  take: limit,
  skip: cursor ? 1 : 0,

  ...(cursor && {
    cursor: { id: cursor },
  }),

  orderBy: {
    createdAt: "desc",
  },

  include: {
    items: {
      include: {
        product: true,
      },
    },
  },
});
}