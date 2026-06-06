import GameSession from "../models/GameSession.js";
import AllPost from "../models/Allposts.js";
import CreditAudit from "../models/CreditAudit.js";

const CREDIT_INTERVAL_MS = 60_000;

export async function processBilling(sessionId) {
  try {
    const session = await GameSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: "running",
        "billing.processing": false,
      },
      {
        $set: {
          "billing.processing": true,
        },
      },
      {
        new: true,
      }
    );

    if (!session) {
      return;
    }

    const now = new Date();

    const lastBilling =
      session.billing?.lastBillingAt ||
      session.startedAt ||
      now;

    const elapsed =
      now.getTime() -
      new Date(lastBilling).getTime();

    if (elapsed < CREDIT_INTERVAL_MS) {
      return;
    }

    const requestedCredits = Math.floor(
      elapsed / CREDIT_INTERVAL_MS
    );

    if (requestedCredits <= 0) {
      return;
    }

    const post = await AllPost.findById(
      session.gamePost
    ).select(
      "gamePost.creditBudget"
    );

    if (!post?.gamePost?.creditBudget) {
      return {
        exhausted: true,
      };
    }

    const availableCredits =
      post.gamePost.creditBudget
        .remainingCredits || 0;

    if (availableCredits <= 100) {
      await AllPost.updateOne(
        {
          _id: session.gamePost,
        },
        {
          $set: {
            "gamePost.creditBudget.status":
              "low_credits",
          },
        }
      );
    }

    if (availableCredits <= 0) {
      return {
        exhausted: true,
      };
    }

    const creditsToConsume = Math.min(
      requestedCredits,
      availableCredits
    );

    const billedMs =
      creditsToConsume *
      CREDIT_INTERVAL_MS;

    const updatedPost =
      await AllPost.findByIdAndUpdate(
        session.gamePost,
        {
          $inc: {
            "gamePost.creditBudget.usedCredits":
              creditsToConsume,

            "gamePost.creditBudget.remainingCredits":
              -creditsToConsume,

            "gamePost.gameMetrics.totalSessionTimeMs":
              billedMs,
          },
        },
        {
          new: true,
        }
      );

    await CreditAudit.create({
        gamePost: session.gamePost,
        creator: updatedPost.user,

        action: "consumption",

        credits: creditsToConsume,

        previousBalance:
            updatedPost.gamePost.creditBudget.remainingCredits +
            creditsToConsume,

        newBalance:
            updatedPost.gamePost.creditBudget.remainingCredits,

        reason: `Session ${session._id}`,
        metadata: {
            sessionId: session._id.toString(),
        },
        });

    await GameSession.updateOne(
      {
        _id: session._id,
      },
      {
        $inc: {
          "billing.creditsConsumed":
            creditsToConsume,

          "billing.billedPlayTimeMs":
            billedMs,
        },

        $set: {
          "billing.lastBillingAt":
            new Date(
              new Date(lastBilling).getTime() +
                billedMs
            ),
        },
      }
    );

    const remainingCredits =
      updatedPost?.gamePost?.creditBudget
        ?.remainingCredits || 0;

    if (remainingCredits <= 0) {
      await AllPost.updateOne(
        {
          _id: session.gamePost,
        },
        {
          $set: {
            "gamePost.creditBudget.status":
              "exhausted",
          },
        }
      );

      return {
        exhausted: true,
      };
    }

    return {
      exhausted: false,
    };
  } catch (error) {
    console.error(
      `Billing error for session ${sessionId}`,
      error
    );

    return {
      exhausted: false,
      error: true,
    };
  } finally {
    await GameSession.updateOne(
      {
        _id: sessionId,
      },
      {
        $set: {
          "billing.processing": false,
        },
      }
    ).catch(() => {});
  }
}