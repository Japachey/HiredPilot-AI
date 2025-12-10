export const runtime = "nodejs";

import { Webhook } from "svix";
import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = (await buffer(req)).toString();
  const headers = req.headers;

  const wh = new Webhook(process.env.CLERK_SECRET_WEBHOOK_KEY!);

  let event;
  try {
    event = wh.verify(rawBody, {
      "svix-id": headers["svix-id"] as string,
      "svix-timestamp": headers["svix-timestamp"] as string,
      "svix-signature": headers["svix-signature"] as string,
    });
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return res.status(400).send("Invalid webhook signature");
  }

  console.log("Clerk webhook event:", event.type);

  return res.status(200).send("Webhook received");
}
