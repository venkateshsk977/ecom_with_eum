import prisma from "@/lib/prisma";

type AddToCartInput = {
  userId: string;
  productId: string;
  quantity: number;
};

type JwtUser = {
  id: string;
  role: string;
};

// ✅ ADD TO CART
export async function addToCart(data: AddToCartInput) {
  const { userId, productId, quantity } = data;

  // 🔒 quantity validation
  if (!quantity || quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  // 🔍 get product + inventory
  const product = await prisma.product.findUnique({
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

  // 🛒 find or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  // 🔍 check existing item
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  const totalQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  // 🔒 stock check (using inventory)
  const available =
    product.inventory.totalQuantity - product.inventory.reservedQuantity;

  if (available < totalQuantity) {
    throw new Error("Insufficient stock");
  }

  // 🔁 upsert (safe + no duplicates)
  await prisma.cartItem.upsert({
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

  // 📦 return full cart
  return prisma.cart.findUnique({
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
}

// ✅ GET CART
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

// ✅ UPDATE ITEM QUANTITY
export async function updateCartItemQuantity(
  id: string,
  quantity: number,
  user: JwtUser
) {
  if (!quantity || quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  const item = await prisma.cartItem.findUnique({
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

  // 🔒 ownership
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

  return prisma.cartItem.update({
    where: { id },
    data: { quantity },
  });
}

// ✅ DELETE ITEM
export async function deleteCartItem(
  id: string,
  user: JwtUser
) {
  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { cart: true },
  });

  if (!item) throw new Error("Cart item not found");

  // 🔒 ownership
  if (user.role !== "ADMIN" && item.cart.userId !== user.id) {
    throw new Error("Forbidden");
  }

  return prisma.cartItem.delete({
    where: { id },
  });
}