export const extractS3KeyFromUrl = (url) => {
  try {
    const parsed = new URL(url);

    // remove starting "/"
    return decodeURIComponent(parsed.pathname.substring(1));
  } catch (err) {
    console.error("Failed to extract S3 key:", err);
    return null;
  }
};