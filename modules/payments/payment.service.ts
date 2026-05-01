  import { JwtUser } from "@/lib/getUser";
import Razorpay from "razorpay";

  // const razorpay = new Razorpay({
  //  // key_id: process.env.RAZORPAY_KEY_ID!,
  //   //key_secret: process.env.RAZORPAY_KEY_SECRET!,
  // });

  export async function createOnlinePaymentOrder(orderId :any, user : JwtUser) {
  throw  new Error(
    "Online payments are disabled. Use COD flow."
  );
}