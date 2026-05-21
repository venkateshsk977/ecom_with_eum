import { JwtUser } from "@/lib/getUser";

  // const razorpay = new Razorpay({
  //  // key_id: process.env.RAZORPAY_KEY_ID!,
  //   //key_secret: process.env.RAZORPAY_KEY_SECRET!,
  // });

export async function createOnlinePaymentOrder(_orderId: string, _user: JwtUser) {
  void _orderId;
  void _user;

  throw  new Error(
    "Online payments are disabled. Use COD flow."
  );
}
