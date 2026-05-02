import prisma from "@/lib/prisma";
import { UUID } from "crypto";

type AppliedCoupon = {
  id: string;
  code: string;
  discount: number;
};

export async function computePricing(
  userId: string,
  addressId?: string,
  couponCode?: string
) {

 console.log("Computing pricing for user:", userId, "address:", addressId, "coupon:", couponCode);
  const cart = await prisma.cart.findUnique({
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

  const address = addressId
    ? await prisma.address.findFirst({
        where: { id: addressId, userId },
      })
    : await prisma.address.findFirst({
        where: { userId, isDefault: true },
      });

  if (!address) {
    throw new Error("Address not found");
  }

  // 🔄 fetch latest prices
  const products = await prisma.product.findMany({
    where: {
      id: { in: cart.items.map(i => i.productId) },
    },
  });

  const priceMap = new Map(
    products.map(p => [p.id, p.price.toNumber()])
  );

  let subtotal = 0;

  const items = cart.items.map(item => {
    const price = priceMap.get(item.productId);

    if (price === undefined) {
      throw new Error("Price not found");
    }

    const total = price * item.quantity;
    subtotal += total;

    return {
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: price,
      totalPrice: total,
    };
  });

  // ======================
  // 🧾 COUPON LOGIC (inline, cleanly isolated)
  // ======================
  let discount = 0;
  let appliedCoupon: AppliedCoupon | null = null;

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || !coupon.isActive) {
      throw new Error("Invalid coupon");
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new Error("Coupon expired");
    }

    if (
      coupon.usageLimit &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new Error("Coupon usage limit reached");
    }

    const minOrder = coupon.minOrderAmount?.toNumber();
    if (minOrder && subtotal < minOrder) {
      throw new Error(
        `Minimum order amount is ${minOrder}`
      );
    }

    const alreadyUsed = await prisma.couponUsage.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId: coupon.id,
        },
      },
    });

    if (alreadyUsed) {
      throw new Error("Coupon already used");
    }

    // 🔥 apply discount
    if (coupon.type === "PERCENTAGE") {
      discount = Math.round(
        (subtotal * coupon.value.toNumber()) / 100
      );
    } else {
      discount = coupon.value.toNumber();
    }

    if (coupon.maxDiscount) {
      discount = Math.min(
        discount,
        coupon.maxDiscount.toNumber()
      );
    }

    appliedCoupon = {
      code: coupon.code,
      discount,
      id:coupon.id
    };
  }

  // ======================
  // 💰 FINAL CALCULATION
  // ======================
  const taxableAmount = subtotal - discount;

  const tax = Math.round(taxableAmount * 0.1);
  const shipping = 50;

  const total = taxableAmount + tax + shipping;

  return {
    items,
    subtotal,
    discount,
    tax,
    shipping,
    total,
    coupon: appliedCoupon,
    address,
  };
}