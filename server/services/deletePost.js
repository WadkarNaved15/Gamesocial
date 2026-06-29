// services/deletePost.service.js

import AllPost from "../models/Allposts.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Wishlist from "../models/Wishlist.js";
import Notification from "../models/Notifications.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../s3.js";
import { extractS3KeyFromUrl } from "../utils/extractS3Key.js";

export async function deletePostAndAssets(post) {
  const keysToDelete = [];

  const getThumbnailKey = (thumbUrl) => {
    if (!thumbUrl) return null;
    return extractS3KeyFromUrl(thumbUrl);
  };

  // NORMAL POST
  if (post.type === "normal_post") {
    for (const asset of post.normalPost?.assets || []) {
      if (asset.key) keysToDelete.push(asset.key);
      if (asset.optimizedKey)
        keysToDelete.push(asset.optimizedKey);

      const thumb = getThumbnailKey(
        asset.thumbnailUrl
      );

      if (thumb) keysToDelete.push(thumb);
    }
  }

  // GAME POST
  if (post.type === "game_post") {
    if (post.gamePost?.file?.key)
      keysToDelete.push(
        post.gamePost.file.key
      );

    if (post.gamePost?.videoDemo?.key)
      keysToDelete.push(
        post.gamePost.videoDemo.key
      );

    if (
      post.gamePost?.videoDemo
        ?.optimizedKey
    ) {
      keysToDelete.push(
        post.gamePost.videoDemo
          .optimizedKey
      );
    }

    const thumb = getThumbnailKey(
      post.gamePost?.videoDemo
        ?.thumbnailUrl
    );

    if (thumb) keysToDelete.push(thumb);
  }

  // MODEL POST
  if (post.type === "model_post") {
    for (
      const asset of
      post.modelPost?.assets || []
    ) {
      if (asset.originalKey)
        keysToDelete.push(
          asset.originalKey
        );

      if (asset.optimizedKey)
        keysToDelete.push(
          asset.optimizedKey
        );
    }
  }

  // MEDIA AD
  if (
    post.type === "media_ad_post" &&
    post.mediaAdPost?.asset
  ) {
    keysToDelete.push(
      post.mediaAdPost.asset.key
    );

    if (
      post.mediaAdPost.asset
        .optimizedKey
    ) {
      keysToDelete.push(
        post.mediaAdPost.asset
          .optimizedKey
      );
    }
  }

  // AD MODEL
  if (
    post.type === "ad_model_post" &&
    post.adModelPost?.asset
  ) {
    if (
      post.adModelPost.asset
        .originalKey
    ) {
      keysToDelete.push(
        post.adModelPost.asset
          .originalKey
      );
    }

    if (
      post.adModelPost.asset
        .optimizedKey
    ) {
      keysToDelete.push(
        post.adModelPost.asset
          .optimizedKey
      );
    }
  }

  await Promise.all(
    [...new Set(keysToDelete)].map(
      (key) =>
        s3.send(
          new DeleteObjectCommand({
            Bucket:
              process.env
                .AWS_BUCKET_NAME,
            Key: key,
          })
        )
    )
  );

  await Promise.all([
    Like.deleteMany({
      post: post._id,
    }),

    Comment.deleteMany({
      post: post._id,
    }),

    Wishlist.deleteMany({
      post: post._id,
    }),

    Notification.deleteMany({
      postId: post._id,
    }),

    AllPost.findByIdAndDelete(
      post._id
    ),
  ]);
}