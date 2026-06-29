// services/sendVerificationEmail.js

import { resend } from "../config/resendClient.js";

export const sendVerificationEmail = async (
  email,
  otp
) => {
  const { data, error } =
    await resend.emails.send({
      from: "Rigzer <auth@rigzer.com>",
      to: email,
      subject: "Verify your email",
      html: `
        <div style="
          font-family:Arial,sans-serif;
          max-width:600px;
          margin:auto;
          padding:20px;
        ">
          <h2>
            Verify your email
          </h2>

          <p>
            Your verification code is:
          </p>

          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            padding:20px;
            background:#f5f5f5;
            text-align:center;
            border-radius:8px;
          ">
            ${otp}
          </div>

          <p style="
            margin-top:20px;
            color:#666;
          ">
            This code expires in
            10 minutes.
          </p>
        </div>
      `,
    });

  if (error) {
    console.error(error);
    throw error;
  }

  console.log(
    "Verification email sent:",
    data?.id
  );
};