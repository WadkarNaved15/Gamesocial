import { resend } from "../config/resendClient.js";

export const sendResetEmail = async (
  email,
  link
) => {
  const { data, error } =
    await resend.emails.send({
      from: "Rigzer <auth@rigzer.com>",
      to: email,
      subject: "Reset your password",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
        ">
          <h2>Password Reset Request</h2>

          <p>
            You requested a password reset for
            your Rigzer account.
          </p>

          <div style="margin:30px 0;">
            <a
              href="${link}"
              style="
                background:#7c3aed;
                color:white;
                padding:14px 24px;
                border-radius:8px;
                text-decoration:none;
                display:inline-block;
                font-weight:bold;
              "
            >
              Reset Password
            </a>
          </div>

          <p>
            If the button doesn't work,
            copy and paste this link:
          </p>

          <p style="
            word-break:break-all;
            color:#666;
          ">
            ${link}
          </p>

          <p style="
            margin-top:20px;
            color:#666;
          ">
            This link expires in
            15 minutes.
          </p>

          <p style="
            margin-top:30px;
            font-size:12px;
            color:#999;
          ">
            If you didn't request this,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

  if (error) {
    console.error(
      "Password reset email failed:",
      error
    );
    throw error;
  }

  console.log(
    "Password reset email sent:",
    data?.id
  );
};