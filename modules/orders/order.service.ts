import prisma from "@/lib/prisma";
import { OrderStatus,PaymentMethod, Prisma } from "@prisma/client";
import Razorpay from "razorpay";

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
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    product: true,
                },
            },
        },
    });

    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
    }

    const address = await prisma.address.findFirst({
        where: { userId },
    });

    if (!address) {
        throw new Error("Address not found");
    }

    const order = await prisma.order.create({
        data: {
            orderNumber: `ORD-${Date.now()}`,
            userId,
            addressId: address.id,
            status: OrderStatus.CONFIRMED,
            paymentMethod: PaymentMethod.COD,
            subtotalAmount: 0,
            taxAmount: 0,
            shippingAmount: 0,
            totalAmount: 0,
        },
    });

    let total = 0;

    await prisma.$transaction(async (tx) => {

        // ✅ Step 1: fetch latest product prices
        const products = await tx.product.findMany({
            where: {
                id: {
                    in: cart.items.map(i => i.productId),
                },
            },
        });

        const priceMap = new Map(
            products.map(p => [p.id, p.price])
        );

        let total = 0;

        // ✅ Step 2: calculate total using fresh prices
        for (const item of cart.items) {
            const price = priceMap.get(item.productId);

            if (price === undefined) {
                throw new Error("Product price not found");
            }

            total += price * item.quantity;
        }

        // ✅ Step 3: create order
        const order = await tx.order.create({
            data: {
                orderNumber: `ORD-${Date.now()}`,
                userId,
                addressId: address.id,
                status: "PLACED",
                subtotalAmount: total,
                taxAmount: 0,
                shippingAmount: 0,
                totalAmount: total,
            },
        });

        // ✅ Step 4: inventory + order items
        for (const item of cart.items) {
            const price = priceMap.get(item.productId)!;

            const updated = await tx.inventory.updateMany({
                where: {
                    productId: item.productId,
                    totalQuantity: {
                        gte: item.quantity,
                    },
                },
                data: {
                    totalQuantity: {
                        decrement: item.quantity,
                    },
                },
            });

            if (updated.count === 0) {
                throw new Error(
                    `Insufficient stock for product ${item.product.name}`
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

        // ✅ Step 5: clear cart
        await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
        });
        return order;
    });

    // const payment = await razorpay.orders.create({
    //         amount: total * 100,
    //         currency: "INR",
    //         receipt: order.id, // 👈 KEY mapping
    //     });

    await prisma.order.update({
        where: { id: order.id },
        data: {
            subtotalAmount: total,
            taxAmount: 0,
            shippingAmount: 0,
            totalAmount: total,
        },
    });

    await prisma.cartItem.deleteMany({
        where: {
            cartId: cart.id,
        },
    });

    return prisma.order.findUnique({
        where: { id: order.id },
        include: {
            items: {
                include: {
                    product: true,
                },
            },
        },
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


export async function getOrderById(orderId: string) {
    return prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    product: true,
                },
            },
            address: true,
        },
    });
}



const allowedStatuses = [
    "PLACED",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
];


export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus
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
export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // ✅ idempotent
    if (order.status === "CANCELLED") {
      return order;
    }

    if (!allowedTransitions[order.status]?.includes("CANCELLED")) {
      throw new Error("Invalid status transition");
    }

    // 🔁 Restore inventory
    for (const item of order.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: {
          totalQuantity: {
            increment: item.quantity,
          },
        },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    });
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
        ? {
            status: { in: status },
          }
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
  });
}