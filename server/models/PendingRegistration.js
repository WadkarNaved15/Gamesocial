// models/PendingRegistration.js

import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    emailVerificationOTP: {
      type: String,
      required: true,
      select: false,
    },

    emailVerificationExpires: {
        type: Date,
        required: true,
        select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // Mongo automatically deletes document
    },
  },
  {
    timestamps: true,
  }
);

const PendingRegistration = mongoose.model(
  "PendingRegistration",
  pendingRegistrationSchema
);

export default PendingRegistration;