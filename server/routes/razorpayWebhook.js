// routes/webhooks.js

import express from "express";
import crypto from "crypto";

import {
  processRazorpayPayment,
} from "../services/razorpay/processPayment.js";

const router =
  express.Router();

router.post(
  "/razorpay",
  express.raw({
    type:
      "application/json",
  }),
  async (req, res) => {
    try {
      const signature =
        req.headers[
          "x-razorpay-signature"
        ];

      const expected =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_WEBHOOK_SECRET
          )
          .update(req.body)
          .digest("hex");

      if (
        expected !==
        signature
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid webhook signature",
          });
      }

      const event =
        JSON.parse(
          req.body.toString()
        );

      switch (
        event.event
      ) {
        case "payment.captured":
          await processRazorpayPayment(
            event
              .payload
              .payment
              .entity.id
          );
          break;

        default:
          break;
      }

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(
        "razorpay webhook",
        err
      );

      res
        .status(500)
        .json({
          success: false,
        });
    }
  }
);

export default router;