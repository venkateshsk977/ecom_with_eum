import prisma from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { JwtUser } from "@/lib/getUser";

// ======================
// ORDER STATE MACHINE
// ======================
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

// ======================
// CREATE ORDER
// ======================
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

    // 🔁 Idempotency (early)
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

    // 📍 Default address
    const address = await tx.address.findFirst({
      where: { userId, isDefault: true },
    });

    if (!address) {
      throw new Error("Default address not found");
    }

    // 🔍 Fetch latest prices
    const products = await tx.product.findMany({
      where: {
        id: { in: cart.items.map((i) => i.productId) },
      },
    });

    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    let total = 0;

    for (const item of cart.items) {
      const price = priceMap.get(item.productId);

      if (price === undefined) {
        throw new Error(`Price missing for product ${item.productId}`);
      }

      total += price.toNumber() * item.quantity;
    }

    // 🧾 Create order
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

    // 📦 Inventory + order items
    for (const item of cart.items) {
      const price = priceMap.get(item.productId)!;

      const updated = await tx.inventory.updateMany({
        where: {
          productId: item.productId,
          totalQuantity: { gte: item.quantity },
        },
        data: {
          totalQuantity: {
            decrement: item.quantity,
          },
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
          totalPrice: price.toNumber() * item.quantity,
        },
      });
    }

    // 🧹 Clear cart
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

// ======================
// GET ORDERS (USER)
// ======================
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

// ======================
// SECURE ORDER FETCH
// ======================
export async function getOrderByIdSecure(
  id: string,
  user: JwtUser
) {
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) return null;

  if (user.role !== "ADMIN" && order.userId !== user.id) {
    throw new Error("Forbidden");
  }

  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
      address: true,
    },
  });
}

// ======================
// UPDATE ORDER STATUS
// ======================
export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  user: JwtUser
) {
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existing) {
    throw new Error("Order not found");
  }

  if (existing.status === nextStatus) {
    return existing;
  }

  if (!allowedTransitions[existing.status]?.includes(nextStatus)) {
    throw new Error("Invalid status transition");
  }

  const data: Prisma.OrderUpdateInput = {
    status: nextStatus,
  };

  const statusTimestamps: Partial<
    Record<OrderStatus, keyof Prisma.OrderUpdateInput>
  > = {
    PACKED: "packedAt",
    SHIPPED: "shippedAt",
    DELIVERED: "deliveredAt",
  };

  const field = statusTimestamps[nextStatus];

  if (field && !(existing as any)[field]) {
    (data as Record<string, any>)[field] = new Date();
  }

  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: existing.status,
    },
    data,
  });

  if (result.count === 0) {
    throw new Error("Order was updated by another process");
  }

  return prisma.order.findUnique({
    where: { id: orderId },
  });
}

// ======================
// CANCEL ORDER
// ======================
export async function cancelOrder(
  orderId: string,
  user: JwtUser
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("Order not found");

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

// ======================
// PAGINATED ORDERS
// ======================
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