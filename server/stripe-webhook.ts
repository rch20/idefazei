import type { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { churches } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) return null;
  return new Stripe(apiKey, { apiVersion: "2026-05-27.dahlia" });
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeClient();

  if (!stripe || !sig || !webhookSecret) {
    console.error("[Stripe Webhook] Stripe is not configured or signature is missing");
    res.status(503).json({ error: "Stripe webhook is not configured" });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // ⚠️ Test events must return verified: true
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  console.log(`[Stripe Webhook] Event: ${event.type} | ID: ${event.id}`);

  const db = await getDb();
  if (!db) {
    res.status(500).json({ error: "Database unavailable" });
    return;
  }

  try {
    switch (event.type) {
      // Checkout concluído — criar/atualizar assinatura
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const churchId = session.metadata?.church_id;
        const plan = session.metadata?.plan as "basic" | "pro" | "enterprise" | undefined;

        if (!churchId) break;

        // Buscar a subscription criada
        let subscriptionId: string | null = null;
        let customerId: string | null = null;

        if (session.subscription) {
          subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        }
        if (session.customer) {
          customerId = typeof session.customer === "string"
            ? session.customer
            : session.customer.id;
        }

        await db.update(churches)
          .set({
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
            stripePlan: plan ?? undefined,
            stripeStatus: "active",
          })
          .where(eq(churches.id, parseInt(churchId)));

        console.log(`[Stripe Webhook] Church ${churchId} subscribed to plan ${plan}`);
        break;
      }

      // Assinatura atualizada (renovação, upgrade, downgrade)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        const plan = subscription.metadata?.plan as "basic" | "pro" | "enterprise" | undefined;
        // current_period_end is available via items in newer API versions
        const periodEnd = subscription.items?.data?.[0]?.current_period_end
          ? new Date((subscription.items.data[0] as any).current_period_end * 1000)
          : undefined;

        await db.update(churches)
          .set({
            stripeSubscriptionId: subscription.id,
            stripePlan: plan ?? undefined,
            stripeStatus: subscription.status,
            stripeCurrentPeriodEnd: periodEnd,
          })
          .where(eq(churches.stripeCustomerId, customerId));

        console.log(`[Stripe Webhook] Subscription updated for customer ${customerId}: ${subscription.status}`);
        break;
      }

      // Assinatura cancelada
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        await db.update(churches)
          .set({
            stripeStatus: "canceled",
            stripeSubscriptionId: null,
            stripePlan: null,
          })
          .where(eq(churches.stripeCustomerId, customerId));

        console.log(`[Stripe Webhook] Subscription canceled for customer ${customerId}`);
        break;
      }

      // Pagamento falhou
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as Stripe.Customer)?.id;

        if (customerId) {
          await db.update(churches)
            .set({ stripeStatus: "past_due" })
            .where(eq(churches.stripeCustomerId, customerId));

          console.log(`[Stripe Webhook] Payment failed for customer ${customerId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
