import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../config/env.js";

export const r2Client = new S3Client({
  region: env.R2_REGION,
  endpoint: env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

export async function probeR2(): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadBucketCommand({
        Bucket: env.R2_BUCKET
      })
    );
    return true;
  } catch {
    return false;
  }
}
