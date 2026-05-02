import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning database...");

  // ⚠️ Order matters due to FK constraints
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();

  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log("✅ Database cleaned");

  console.log("🌱 Seeding started...");

  // ======================
  // ROLES
  // ======================
  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      description: "Platform administrator",
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: "USER",
      description: "Standard customer",
    },
  });

  // ======================
  // USERS
  // ======================
  const adminUser = await prisma.user.create({
    data: {
      eumId: "EUM-ADMIN-001",
      fullName: "Admin User",
      email: "admin@demo.com",
      roleId: adminRole.id,
    },
  });

  const customer = await prisma.user.create({
    data: {
      eumId: "EUM-CUST-001",
      fullName: "Demo Customer",
      email: "customer@demo.com",
      roleId: userRole.id,
    },
  });

  // ======================
  // CATEGORIES
  // ======================
  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  const accessories = await prisma.category.create({
    data: {
      name: "Accessories",
      slug: "accessories",
    },
  });

  // ======================
  // PRODUCTS
  // ======================
  const laptop = await prisma.product.create({
    data: {
      sku: "SKU1001",
      slug: "gaming-laptop",
      name: "Gaming Laptop",
      price: 1000,
      categoryId: electronics.id,
    },
  });

  const headphones = await prisma.product.create({
    data: {
      sku: "SKU1002",
      slug: "wireless-headphones",
      name: "Wireless Headphones",
      price: 500,
      categoryId: accessories.id,
    },
  });

  // ======================
  // INVENTORY
  // ======================
  await prisma.inventory.create({
    data: {
      productId: laptop.id,
      totalQuantity: 15,
      reservedQuantity: 0,
      minThreshold: 3,
    },
  });

  await prisma.inventory.create({
    data: {
      productId: headphones.id,
      totalQuantity: 30,
      reservedQuantity: 0,
      minThreshold: 5,
    },
  });

  // ======================
  // ADDRESS
  // ======================
  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      type: "SHIPPING",
      isDefault: true,
      fullName: "Demo Customer",
      line1: "Street 101",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500001",
      country: "India",
    },
  });

  // ======================
  // CART
  // ======================
  const cart = await prisma.cart.create({
    data: {
      userId: customer.id,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: laptop.id,
      quantity: 1,
    },
  });

  // ======================
  // ORDER (COD FLOW)
  // ======================
  const order = await prisma.order.create({
    data: {
      orderNumber: "ORD-DEMO-001",
      userId: customer.id,
      addressId: address.id,
      status: "PLACED",
      paymentMethod: "COD",
      paymentStatus: "PENDING",

      subtotalAmount: 1000,
      taxAmount: 100,
      shippingAmount: 50,
      totalAmount: 1150,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: laptop.id,
      quantity: 1,
      unitPrice: 1000,
      totalPrice: 1000,
    },
  });

  // ======================
  // INVENTORY SYNC
  // ======================
  await prisma.inventory.update({
    where: { productId: laptop.id },
    data: {
      totalQuantity: {
        decrement: 1,
      },
    },
  });

  console.log("✅ Seeding completed.");
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });