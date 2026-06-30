// models/PendingRegistration.js
import mongoose from "mongoose";
import { validateUsernameFormat, calculateAge, MIN_AGE } from "./User.js";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return validateUsernameFormat(v) === null;
        },
        message: (props) =>
          validateUsernameFormat(props.value) || "Invalid username",
      },
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
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
    birthdate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return calculateAge(v) >= MIN_AGE;
        },
        message: `You must be at least ${MIN_AGE} years old to register`,
      },
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