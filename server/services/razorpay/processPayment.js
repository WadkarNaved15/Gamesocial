// services/razorpay/processPayment.js

import Razorpay from "razorpay";

import GamePostDraft from "../../models/GamePostDraft.js";
import CreditPurchase from "../../models/CreditPurchase.js";
import { publishGameQueue } from "../../queues/publishGameQueue.js";

let razorpay;

function getRazorpay() {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

export async function processRazorpayPayment(
  razorpayPaymentId
) {
  // idempotency
  const existing =
    await CreditPurchase.findOne({
      paymentId: razorpayPaymentId,
    });

  if (existing) {
    return existing;
  }

  const payment =
    await getRazorpay()
      .payments
      .fetch(razorpayPaymentId);

  if (payment.status !== "captured") {
    throw new Error(
      "Payment not captured"
    );
  }

  const draftId =
    payment.notes?.draftId;

  if (!draftId) {
    throw new Error(
      "Missing draftId in payment notes"
    );
  }

  const draft =
    await GamePostDraft.findOne({
      _id: draftId,
      razorpayOrderId:
        payment.order_id,
      status: {
        $in: [
          "payment_pending",
          "payment_completed",
        ],
      },
    });

  if (!draft) {
    throw new Error(
      "Draft not found"
    );
  }

  if (
    payment.amount !==
      draft.amount ||
    payment.currency !==
      draft.currency
  ) {
    throw new Error(
      "Payment mismatch"
    );
  }

  const purchase =
    await CreditPurchase.create({
      creator: draft.creator,

      draft: draft._id,

      gamePost: null,

      creditsPurchased:
        draft.selectedCredits,

      amountPaid:
        payment.amount,

      currency:
        payment.currency,

      paymentProvider:
        "razorpay",

      razorpayOrderId:
        payment.order_id,

      paymentId:
        payment.id,

      status: "completed",

      fulfillmentStatus:
        "pending",
    });

  draft.status =
    "payment_completed";

  draft.creditPurchaseId =
    purchase._id;

  await draft.save();

  await publishGameQueue.add(
    "publishGame",
    {
      draftId:
        draft._id.toString(),

      creditPurchaseId:
        purchase._id.toString(),
    },
    {
      attempts: 5,

      backoff: {
        type: "exponential",
        delay: 10000,
      },

      removeOnComplete: 500,
      removeOnFail: 500,
    }
  );

  return purchase;
}