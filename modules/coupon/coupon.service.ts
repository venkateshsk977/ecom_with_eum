import prisma from "@/lib/prisma";

export async function validateAndApplyCoupon(
  code: string,
  subtotal: number
) {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon || !coupon.isActive) {
    throw new Error("Invalid coupon");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("Coupon expired");
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }

  const minOrder = coupon.minOrderAmount?.toNumber();
  if (minOrder && subtotal < minOrder) {
    throw new Error(`Minimum order amount is ${minOrder}`);
  }

  let discount = 0;

  if (coupon.type === "PERCENTAGE") {
    discount = Math.round((subtotal * coupon.value.toNumber()) / 100);
  } else {
    discount = coupon.value.toNumber();
  }

  if (coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount.toNumber());
  }

  return {
    couponId: coupon.id,
    code: coupon.code,
    discount,
  };
}