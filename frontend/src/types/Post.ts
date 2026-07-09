// src/types/Post.ts

export type PostType =
  | 'normal_post'
  | 'game_post'
  | 'model_post'
  | 'devlog_post'
  | 'ad_model_post'
  | 'pocket_update'   // feed.service.js sets feedType: "pocket_update" on normalised entries
  | 'media_ad_post';

export interface UserSummary {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  isFollowing?: boolean; // optional, only present if the current user is logged in and has a following relationship with this user
}

export interface ModelMetadata {
  fileName: string;
  downloadSizeMB: number;
  geometry: { meshes: number; vertices: number; triangles: number };
  materials: number;
  textures: { present: boolean; count: number };
  uvLayers: number;
  vertexColors: boolean;
  animations: { present: boolean; count: number };
  rigged: boolean;
  morphTargets: boolean;
  transforms: {
    scale: [number, number, number];
    position: [number, number, number];
    rotation: { values: [number, number, number]; order: 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX' };
  };
  boundingBox: { width: number; height: number; depth: number };
  center: { x: number; y: number; z: number };
}

export interface NormalPostAsset {
  name: string;
  url: string;
  key?: string;
  type: 'image' | 'video';
  
  // New Video Optimization Fields
  optimizedUrl?: string;
  optimizedKey?: string;
  thumbnailUrl?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
}

export interface OptimizationInfo {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  optimizedSizeMB?: number;
  compressionRatio?: number;
  error?: string;
  processedAt?: string;
}

export interface ModelAsset {
  name: string;
  originalKey: string;
  optimizedKey?: string | null;
  originalUrl: string;
  optimizedUrl?: string | null;
  sizeMB?: number;
  fieldOfView?: string;
  optimization?: OptimizationInfo;
  metadata?: ModelMetadata;
}

export interface ModelPost {
  price: number;
  previewImage?: string;
  title: string;
  assets: ModelAsset[];
}

// ── Ad Model types ─────────────────────────────────────────────────────────────

export interface AdModelAsset {
  name: string;
  originalKey: string;
  optimizedKey?: string | null;
  originalUrl: string;
  optimizedUrl?: string | null;
  sizeMB?: number;
  fieldOfView?: string;
  optimization?: OptimizationInfo;
  metadata?: ModelMetadata;
}

export interface AdModelPost {
  brandName?: string | null;
  logoUrl?: string | null;
  bgMode: 'color' | 'image';
  bgColor?: string | null;
  bgImageUrl?: string | null;
  bgImagePosition?: string | null;
  bgImageSize?: string | null;
  overlayOpacity: number;
  ctaText?: string | null;
  ctaLink?: string | null;
  style?: {
    ctaColor?: string;
  }
  asset: AdModelAsset;
  
}

export interface AdModelPostFormProps {
  onCancel: () => void;
  onBack?: () => void;
}

export interface AdAsset {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  originalKey?: string;
  name: string;
  fieldOfView?: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'done' | 'error';
}

// ── Editor prop types ──────────────────────────────────────────────────────────

export interface PocketEditorProps {
  onCancel: () => void;
}

// ── Common fields shared by all post variants ──────────────────────────────────

interface CommonPostFields {
  _id: string;
  user: UserSummary;
  avatarUrl?: string;
  description: string;
  media: string[];
  onOpenDetails?: () => void;
  onDeleteSuccess?: (postId: string) => void;
  createdAt: string;
  updatedAt: string;
  disableInteractions?: boolean;
  viewsCount?: number;
  uniqueViewsCount?: number; // add this
  likes?: number;
  likesCount?: number;
  isWishlisted?: boolean;
  commentsCount?: number;
  isLiked?: boolean;
  detailed?: boolean;
}

// ── Discriminated union members ────────────────────────────────────────────────

export interface NormalPostProps extends CommonPostFields {
  type: 'normal_post';
  normalPost: { assets: NormalPostAsset[] };
}

export interface GameSystemRequirements {
  ramGB?: number | null;
  cpuCores?: number | null;
  gpuRequired?: boolean;
}

export interface DevlogMeta {
  title?: string;
  thumbnail?: string;
}

export interface GameFile {
  name: string;
  url: string;
  size: number;
}

export interface GamePost {
  gameName: string;
  version: string;
  description: string;
  platform: 'windows';
  buildType: 'windows_exe' | 'windows_zip';
  startPath: string;
  engine?: string;
  runMode: 'sandboxed';
  price: number;
  systemRequirements?: GameSystemRequirements;
  file: GameFile;
  
  // Add the video demo typing here
  videoDemo?: {
    name: string;
    key?: string;
    url: string;
    size?: number;
    optimizedUrl?: string;
    optimizedKey?: string;
    thumbnailUrl?: string;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    processingError?: string;
  } | null;
}

export interface GamePostProps extends CommonPostFields {
  type: 'game_post';
  gamePost: GamePost;
}

export interface ExePostProps extends CommonPostFields {
  type: 'model_post';
  modelPost?: ModelPost;
}

export interface DevlogPostProps extends CommonPostFields {
  type: 'devlog_post';
  devlogRef: string;
  devlogMeta?: DevlogMeta;
}

export interface AdModelPostProps extends CommonPostFields {
  type: 'ad_model_post';
  adModelPost: AdModelPost;
}

// ── Pocket post ────────────────────────────────────────────────────────────────

export interface PocketPostProps extends CommonPostFields {
  type: 'pocket_update';
  brandName:         string;
  tagline?:          string;
  compiledBundleUrl: string;
}

export interface MediaAdPostProps extends CommonPostFields {
  type: 'media_ad_post';
  mediaAdPost: {
    _id: string;
    brandName: string;
    brandLogo?: string | null;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    asset: {
      name: string;
      type: 'image' | 'video';
      url: string;
      key?: string;
      optimizedUrl?: string;
      optimizedKey?: string;
      thumbnailUrl?: string;
      processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
      processingError?: string;
    };
    style?: {
      accentColor?: string;
      useGlowEffect?: boolean;
      cardLayoutTheme?: string;
    };
    performance?: {
      clicks: number;
      impressions: number;
    };
  };
}

// ── Master union ───────────────────────────────────────────────────────────────

export type PostProps =
  | NormalPostProps
  | GamePostProps
  | ExePostProps
  | DevlogPostProps
  | AdModelPostProps
  | PocketPostProps
  | MediaAdPostProps;