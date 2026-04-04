import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

// Configured once at import time. CLOUDINARY_* env vars must be set in Railway.
cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key:    env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
});

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * Images are stored under the "receipts/" folder and never transformed.
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    mimeType: string,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const resourceType = mimeType === "application/pdf" ? "raw" : "image";
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "receipts", resource_type: resourceType },
            (err, result) => {
                if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
                resolve(result.secure_url);
            },
        );
        uploadStream.end(buffer);
    });
}
