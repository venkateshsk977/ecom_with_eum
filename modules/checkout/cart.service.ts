import prisma from "@/lib/prisma";

type AddToCartInput = {
  userId: string;
  productId: string;
  quantity: number;
};

export async function addToCart(data: AddToCartInput) {
  const { userId, productId, quantity } = data;

  // Validate product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // Find or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  // Check existing item
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  return prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getCartByUserId(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
) {
  const existing = await prisma.cartItem.findUnique({
    where: { id: itemId },
  });

  if (!existing) {
    throw new Error("Cart item not found");
  }

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: {
      product: true,
    },
  });
}


export async function deleteCartItem(itemId: string) {
  const existing = await prisma.cartItem.findUnique({
    where: { id: itemId },
  });

  if (!existing) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  return { deleted: true };
}