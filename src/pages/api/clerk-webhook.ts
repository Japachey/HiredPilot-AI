export const config = {
  api: {
    bodyParser: false,
  },
};

import { Webhook } from "svix";
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: "Missing svix headers" });
  }

  const body = req.body;
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let event;

  try {
    event = wh.verify(JSON.stringify(body), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  if (event.type === "user.created") {
    const data = event.data;
    await supabase.from("profiles").insert({
      user_id: data.id,
      email: data.email_addresses[0].email_address,
      name: `${data.first_name || ""} ${data.last_name || ""}`,
    });
  }

  return res.json({ success: true });
}
