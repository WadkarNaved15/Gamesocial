import AllPost from "../models/Allposts.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../s3.js";
import { extractMetadataFromUrl } from "../services/modelMetaData.service.js";
import { onPostCreated } from "../services/gorse.hooks.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Wishlist from "../models/Wishlist.js";
import Notification from "../models/Notifications.js";
import { extractS3KeyFromUrl } from "../utils/extractS3Key.js";
function deriveBuildType(fileFormat) {
  if (fileFormat === "exe") return "executable";
  return "archive";
}

export const createPost = async (req, res) => {
  console.log("Create post controller got hit");

  try {
    const { type } = req.body;
    console.log("Post type:", type);

    if (!type) {
      return res.status(400).json({ message: "Post type is required" });
    }

    /* ======================================================
       NORMAL POST
    ====================================================== */
    if (type === "normal_post") {
      const { description, assets } = req.body;

      if (!description) {
        return res.status(400).json({ message: "Description required" });
      }

      if (!assets || assets.length === 0 || assets.length > 4) {
        return res.status(400).json({
          message: "Normal post must have 1–4 media assets",
        });
      }

      const post = await AllPost.create({
        user: req.user.id,
        description,
        type: "normal_post",
        normalPost: {
          assets: assets.map((asset) => ({
            name: asset.name,
            url: asset.url,
            key: asset.key,
            type: asset.type,
          })),
        },
      });

      // ✅ GORSE: sync new post (fire-and-forget)
      onPostCreated(post);

      return res.status(201).json({
        message: "Media post created successfully",
        post,
      });
    }

    /* ======================================================
       MODEL POST
    ====================================================== */
    if (type === "model_post") {
      const { title, description, price, assets } = req.body;

      if (!title || price === undefined) {
        return res.status(400).json({
          message: "Model post requires title and price",
        });
      }

      if (!assets || assets.length === 0 || assets.length > 4) {
        return res.status(400).json({
          message: "Model post must have 1–4 assets",
        });
      }

      const processedAssets = [];

      for (const asset of assets) {
        const metadata = await extractMetadataFromUrl(asset.originalUrl);

        processedAssets.push({
          name: asset.name,
          originalKey: asset.originalKey,
          optimizedKey: null,
          originalUrl: asset.originalUrl,
          optimizedUrl: null,
          sizeMB: Number(metadata.fileSizeMB),
          optimization: { status: "pending" },
          metadata: {
            fileName: metadata.fileName,
            downloadSizeMB: Number(metadata.fileSizeMB),
            geometry: metadata.geometry,
            materials: metadata.materials.count,
            textures: {
              present: metadata.textures.present,
              count: metadata.textures.count,
            },
            uvLayers: metadata.uvLayers,
            vertexColors: metadata.vertexColors,
            animations: metadata.animations,
            rigged: metadata.rigged,
            morphTargets: metadata.morphTargets,
            transforms: {
              scale: metadata.transforms.scale,
              position: metadata.transforms.position,
              rotation: {
                values: metadata.transforms.rotation.slice(0, 3),
                order: "XYZ",
              },
            },
            boundingBox: metadata.boundingBox,
            center: metadata.center,
          },
        });
      }

      const post = await AllPost.create({
        user: req.user.id,
        description,
        type: "model_post",
        modelPost: {
          title,
          price,
          assets: processedAssets,
        },
      });
      // ✅ GORSE: sync new post (fire-and-forget)
      onPostCreated(post);
      return res.status(201).json({
        message: "Model post created successfully",
        post,
      });
    }

    /* ======================================================
       GAME POST
    ====================================================== */
    if (type === "game_post") {
      const { description, game } = req.body;

      if (!description || !game) {
        return res.status(400).json({
          message: "Description and game data required",
        });
      }

      const {
        gameName,
        version,
        platform,
        startPath,
        engine,
        runMode,
        price,
        systemRequirements,
        file,
      } = game;

      const allowedFormats = ["7z", "zip", "exe"];
      if (!file?.format || !allowedFormats.includes(file.format)) {
        return res.status(400).json({
          message: "Unsupported or missing game build format",
        });
      }

      const buildType = deriveBuildType(file.format);

      if (!gameName || !startPath || !file?.url || !file?.name || !file?.format || !file?.key) {
        return res.status(400).json({ message: "Missing required game fields" });
      }

      if (buildType === "executable" && !startPath.toLowerCase().endsWith(".exe")) {
        return res.status(400).json({
          message: "Executable builds must have a .exe startPath",
        });
      }

      if (startPath.startsWith("/") || startPath.includes("..")) {
        return res.status(400).json({
          message: "Invalid startPath (must be relative)",
        });
      }

      if (platform !== "windows") {
        return res.status(400).json({
          message: "Only Windows platform is supported currently",
        });
      }

      const post = await AllPost.create({
        user: req.user.id,
        description,
        type: "game_post",
        gamePost: {
          gameName,
          version: version || "1.0.0",
          platform: "windows",
          buildType,
          startPath,
          engine,
          runMode: runMode || "sandboxed",
          price: Number(price) || 0,
          systemRequirements: {
            ramGB: systemRequirements?.ramGB ?? null,
            cpuCores: systemRequirements?.cpuCores ?? null,
            gpuRequired: systemRequirements?.gpuRequired ?? false,
          },
          file: {
            name: file.name,
            key: file.key,
            url: file.url,
            size: file.size,
            format: file.format,
          },
          verification: {
            status: "pending",
            error: null,
            verifiedAt: null,
          },
        },
      });

      // ✅ GORSE: sync new post (fire-and-forget)
      onPostCreated(post);
      return res.status(201).json({
        message: "Game post created successfully",
        post,
      });
    }

    /* ======================================================
       AD MODEL POST  ⭐ NEW
    ====================================================== */
    if (type === "ad_model_post") {
      const { description, adModelPost } = req.body;

      if (!adModelPost) {
        return res.status(400).json({ message: "adModelPost data is required" });
      }

      const { brandName, bgMode, bgColor, bgImageUrl, bgImagePosition, bgImageSize, overlayOpacity, logoUrl, asset } = adModelPost;

      // ── Validate asset ───────────────────────────────────
      if (!asset || !asset.originalUrl || !asset.originalKey || !asset.name) {
        return res.status(400).json({
          message: "Ad model post requires exactly one valid model asset",
        });
      }

      // ── Validate background config ───────────────────────
      const resolvedBgMode = bgMode === "image" ? "image" : "color";

      if (resolvedBgMode === "image" && !bgImageUrl) {
        return res.status(400).json({
          message: "bgImageUrl is required when bgMode is 'image'",
        });
      }

      // ── Extract model metadata (same pipeline as model_post) ──
      let processedAsset;
      try {
        const metadata = await extractMetadataFromUrl(asset.originalUrl);

        processedAsset = {
          name: asset.name,
          originalKey: asset.originalKey,
          optimizedKey: null,
          originalUrl: asset.originalUrl,
          optimizedUrl: null,
          sizeMB: Number(metadata.fileSizeMB),
          optimization: { status: "pending" },
          metadata: {
            fileName: metadata.fileName,
            downloadSizeMB: Number(metadata.fileSizeMB),
            geometry: metadata.geometry,
            materials: metadata.materials.count,
            textures: {
              present: metadata.textures.present,
              count: metadata.textures.count,
            },
            uvLayers: metadata.uvLayers,
            vertexColors: metadata.vertexColors,
            animations: metadata.animations,
            rigged: metadata.rigged,
            morphTargets: metadata.morphTargets,
            transforms: {
              scale: metadata.transforms.scale,
              position: metadata.transforms.position,
              rotation: {
                values: metadata.transforms.rotation.slice(0, 3),
                order: "XYZ",
              },
            },
            boundingBox: metadata.boundingBox,
            center: metadata.center,
          },
        };
      } catch (metaErr) {
        console.error("Metadata extraction failed for ad model post:", metaErr);
        // Don't block creation if metadata fails — store minimal info
        processedAsset = {
          name: asset.name,
          originalKey: asset.originalKey,
          optimizedKey: null,
          originalUrl: asset.originalUrl,
          optimizedUrl: null,
          optimization: { status: "pending" },
        };
      }

      const post = await AllPost.create({
        user: req.user.id,
        description: description || "",
        type: "ad_model_post",
        adModelPost: {
          brandName: brandName?.trim() || null,
          logoUrl: logoUrl || null,
          bgMode: resolvedBgMode,
          bgColor: resolvedBgMode === "color" ? (bgColor || "#6366f1") : null,
          bgImageUrl: resolvedBgMode === "image" ? bgImageUrl : null,
          bgImagePosition: resolvedBgMode === 'image' ? (bgImagePosition || '50% 50%') : '50% 50%',
          bgImageSize: resolvedBgMode === 'image' ? (bgImageSize || 'cover') : 'cover',
          overlayOpacity: overlayOpacity !== undefined ? Math.max(0, Math.min(80, overlayOpacity)) : 30,
          asset: processedAsset,
        },
      });
      // ✅ GORSE: sync new post (fire-and-forget)
      onPostCreated(post);

      return res.status(201).json({
        message: "Ad model post created successfully",
        post,
      });
    }

    /* ======================================================
       MEDIA AD POST
    ====================================================== */
    if (type === "media_ad_post") {
      const { description, mediaAdPost } = req.body;

      if (!mediaAdPost) {
        return res.status(400).json({
          message: "mediaAdPost data is required",
        });
      }

      const {
        brandName,
        brandLogo,
        ctaText,
        ctaLink,
        asset,
        style,
      } = mediaAdPost;

      // ───────── VALIDATE ASSET ─────────
      if (!asset || !asset.url || !asset.key || !asset.name || !asset.type) {
        return res.status(400).json({
          message: "Media ad post requires a valid asset",
        });
      }

      // ───────── VALIDATE BRAND ─────────
      if (!brandName) {
        return res.status(400).json({
          message: "brandName is required",
        });
      }

      // ───────── CREATE POST ─────────
      const post = await AllPost.create({
        user: req.user.id,
        description: description || "",
        type: "media_ad_post",

        mediaAdPost: {
          brandName: brandName.trim(),
          brandLogo: brandLogo || null,

          description: description || "",
          ctaText: ctaText || "",
          ctaLink: ctaLink || "",

          asset: {
            name: asset.name,
            type: asset.type,
            url: asset.url,
            key: asset.key,
          },

          style: {
            accentColor: style?.accentColor || "#6366f1",
            useGlowEffect: style?.useGlowEffect ?? true,
            cardLayoutTheme: style?.cardLayoutTheme || "glass",
          },

          performance: {
            clicks: 0,
            impressions: 0,
          },
        },
      });

      // optional analytics hook (same pattern as others)
      onPostCreated(post);

      return res.status(201).json({
        message: "Media ad post created successfully",
        post,
      });
    }

    /* ====================================================== */
    return res.status(400).json({ message: "Invalid post type" });

  } catch (err) {
    console.error("Create post error:", err);
    return res.status(500).json({ message: "Failed to create post" });
  }
};
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await AllPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    // =====================================================
    // OWNERSHIP CHECK
    // =====================================================

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    // =====================================================
    // COLLECT ALL S3 KEYS
    // =====================================================

    const keysToDelete = [];

    // NORMAL POST
    if (
      post.type === "normal_post" &&
      post.normalPost?.assets?.length
    ) {
      for (const asset of post.normalPost.assets) {

        // NEW POSTS
        if (asset.key) {
          keysToDelete.push(asset.key);
        }

        // OLD POSTS
        else if (asset.url) {
          const extractedKey = extractS3KeyFromUrl(asset.url);

          if (extractedKey) {
            keysToDelete.push(extractedKey);
          }
        }
      }
    }

    // =====================================================
    // GAME POST FILE
    // =====================================================

    if (
      post.type === "game_post" &&
      post.gamePost?.file
    ) {


      // NEW POSTS (with key stored)
      if (post.gamePost.file.key) {
        keysToDelete.push(post.gamePost.file.key);
      }

      // OLD POSTS (without key)
      else if (post.gamePost.file.url) {

        let extractedKey = null;

        // OLD GAME URL FORMAT:
        // "/games/builds/uuid-file.zip"

        if (post.gamePost.file.url.startsWith("/")) {
          extractedKey = post.gamePost.file.url.replace(/^\/+/, "");
        }

        // FULL CDN URL FORMAT
        else {
          extractedKey = extractS3KeyFromUrl(
            post.gamePost.file.url
          );
        }

        if (extractedKey) {
          keysToDelete.push(extractedKey);
        }
      }
    }

    // =====================================================
    // MODEL POST FILES
    // =====================================================

    if (
      post.type === "model_post" &&
      post.modelPost?.assets?.length
    ) {

      for (const asset of post.modelPost.assets) {

        // ORIGINAL FILE
        if (asset.originalKey) {
          keysToDelete.push(asset.originalKey);
        }

        // OPTIMIZED FILE
        if (asset.optimizedKey) {
          keysToDelete.push(asset.optimizedKey);
        }

      }
    }
    // =====================================================
    // DELETE S3 FILES
    // =====================================================

    if (keysToDelete.length > 0) {
      await Promise.all(
        keysToDelete.map((key) =>
          s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key,
            })
          )
        )
      );
    }

    // =====================================================
    // DELETE RELATED COLLECTION DATA
    // =====================================================

    await Promise.all([
      Like.deleteMany({ post: postId }),
      Comment.deleteMany({ post: postId }),
      Wishlist.deleteMany({ post: postId }),
      Notification.deleteMany({ postId }),
    ]);

    // =====================================================
    // DELETE POST
    // =====================================================

    await AllPost.findByIdAndDelete(postId);

    res.json({
      success: true,
      message: "Post deleted successfully",
    });

  } catch (err) {
    console.error("Delete post error:", err);

    res.status(500).json({
      message: "Failed to delete post",
    });
  }
};