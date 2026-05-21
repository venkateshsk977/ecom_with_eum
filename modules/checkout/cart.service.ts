import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type AddToCartInput = {
  userId: string;
  productId: string;
  quantity: number;
};

type JwtUser = {
  id: string;
  role: string;
};

export async function addToCart(data: AddToCartInput) {
  const { userId, productId, quantity } = data;

  if (!quantity || quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.inventory) {
      throw new Error("Inventory not configured");
    }

    const cart = await tx.cart.upsert({
      where: { userId },
      update: { updatedAt: new Date() },
      create: { userId },
    });

    const existingItem = await tx.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    const totalQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    const available =
      product.inventory.totalQuantity - product.inventory.reservedQuantity;

    if (available < totalQuantity) {
      throw new Error("Insufficient stock");
    }

    await tx.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });

    return tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function getCartByUserId(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              inventory: true,
            },
          },
        },
      },
    },
  });

  return (
    cart ?? {
      id: null,
      items: [],
    }
  );
}

export async function updateCartItemQuantity(
  id: string,
  quantity: number,
  user: JwtUser
) {
  if (!quantity || quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!item) throw new Error("Cart item not found");

    if (user.role !== "ADMIN" && item.cart.userId !== user.id) {
      throw new Error("Forbidden");
    }

    if (!item.product.inventory) {
      throw new Error("Inventory not configured");
    }

    const available =
      item.product.inventory.totalQuantity -
      item.product.inventory.reservedQuantity;

    if (available < quantity) {
      throw new Error("Insufficient stock");
    }

    return tx.cartItem.update({
      where: { id },
      data: { quantity },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function deleteCartItem(
  id: string,
  user: JwtUser
) {
  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { cart: true },
  });

  if (!item) throw new Error("Cart item not found");

  if (user.role !== "ADMIN" && item.cart.userId !== user.id) {
    throw new Error("Forbidden");
  }

  return prisma.cartItem.delete({
    where: { id },
  });
}
