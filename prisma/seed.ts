import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Platform administrator",
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: "Employee" },
    update: {},
    create: {
      name: "Employee",
      description: "Standard customer user",
    },
  });

  // Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      eumId: "EUM-ADMIN-001",
      fullName: "Admin User",
      email: "admin@demo.com",
      roleId: adminRole.id,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@demo.com" },
    update: {},
    create: {
      eumId: "EUM-CUST-001",
      fullName: "Demo Customer",
      email: "customer@demo.com",
      roleId: employeeRole.id,
    },
  });

  // Categories
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  const accessories = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: {},
    create: {
      name: "Accessories",
      slug: "accessories",
    },
  });

  // Products
  const laptop = await prisma.product.upsert({
    where: { sku: "SKU1001" },
    update: {},
    create: {
      sku: "SKU1001",
      slug: "gaming-laptop",
      name: "Gaming Laptop",
      categoryId: electronics.id,
    },
  });

  const headphones = await prisma.product.upsert({
    where: { sku: "SKU1002" },
    update: {},
    create: {
      sku: "SKU1002",
      slug: "wireless-headphones",
      name: "Wireless Headphones",
      categoryId: accessories.id,
    },
  });

  // Inventory
  await prisma.inventory.upsert({
    where: { productId: laptop.id },
    update: {},
    create: {
      productId: laptop.id,
      totalQuantity: 15,
      reservedQuantity: 0,
      minThreshold: 3,
    },
  });

  await prisma.inventory.upsert({
    where: { productId: headphones.id },
    update: {},
    create: {
      productId: headphones.id,
      totalQuantity: 30,
      reservedQuantity: 0,
      minThreshold: 5,
    },
  });

  // Address
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

  // Cart
  const cart = await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
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

  // Order
  const order = await prisma.order.create({
    data: {
      orderNumber: "ORD10001",
      userId: customer.id,
      addressId: address.id,
      status: "PAID",
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

  // Payment
  await prisma.payment.create({
    data: {
      orderId: order.id,
      gatewayName: "Razorpay",
      transactionId: "TXN10001",
      amount: 1150,
      status: "SUCCESS",
    },
  });

  console.log("Seeding completed.");
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });