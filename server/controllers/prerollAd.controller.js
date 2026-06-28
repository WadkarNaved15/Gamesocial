import PrerollAd from "../models/PrerollAd.js";
import { videoProcessingQueue } from "../queues/videoQueue.js";

export const createPrerollAd = async (req, res) => {
  try {
    const { prerollAdPost } = req.body;

    if (!prerollAdPost) {
      return res.status(400).json({
        message: "prerollAdPost data is required",
      });
    }

    const {
      brandName,
      brandLogo,
      ctaText,
      ctaLink,
      asset,
      mechanics,
    } = prerollAdPost;

    if (!brandName) {
      return res.status(400).json({
        message: "brandName is required",
      });
    }

    if (
      !asset ||
      !asset.name ||
      !asset.url ||
      !asset.key ||
      asset.type !== "video"
    ) {
      return res.status(400).json({
        message: "Pre-roll ad requires a valid video asset",
      });
    }

    const ad = await PrerollAd.create({
      user: req.user.id,

      brandName: brandName.trim(),

      brandLogo: brandLogo || null,

      ctaText: ctaText || "PLAY NOW",

      ctaLink: ctaLink || "",

      asset: {
        name: asset.name,
        type: "video",
        url: asset.url,
        key: asset.key,
      },

      mechanics: {
        duration: mechanics?.duration || 15,
      },

      performance: {
        impressions: 0,
        clicks: 0,
        completedViews: 0,
        skippedViews: 0,
      },
    });

    await videoProcessingQueue.add(
  "optimize-video",
  {
    key: asset.key,
    url: asset.url,
    entityType: "preroll_ad",
    entityId: ad._id.toString(),
  },
  {
    removeOnComplete: true,
    attempts: 3,
  }
);

    return res.status(201).json({
      message: "Pre-roll ad created successfully",
      ad,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to create pre-roll ad",
    });
  }
};
export const getFairPrerollAd = async (req, res) => {
  try {
    // Get up to 3 active ads with the lowest impressions
    const ads = await PrerollAd.find({
      "asset.processingStatus": "completed",
    })
      .sort({
        "performance.impressions": 1,
      })
      .limit(3)
      .lean();

    if (!ads.length) {
      return res.status(404).json({
        message: "No active preroll ads found",
      });
    }

    // Increment impressions
    await PrerollAd.updateMany(
      {
        _id: {
          $in: ads.map((a) => a._id),
        },
      },
      {
        $inc: {
          "performance.impressions": 1,
        },
      }
    );

    // Return array
    return res.json(ads);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to fetch preroll ads",
    });
  }
};