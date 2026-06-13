import mongoose from "mongoose";

const CreditPricingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    credits: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    bonusCredits: {
      type: Number,
      default: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "CreditPricing",
  CreditPricingSchema
);