import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

const AWS = {
    region: process.env.AWS_REGION || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    bucket: process.env.AWS_S3_BUCKET_NAME || "",
};

export const storageReady = () => Boolean(AWS.region && AWS.accessKeyId && AWS.secretAccessKey && AWS.bucket);

export const s3Client = new S3Client({
    region: AWS.region || "us-east-1",
    credentials: { accessKeyId: AWS.accessKeyId, secretAccessKey: AWS.secretAccessKey },
});

export const UPLOAD_BUCKET = AWS.bucket;

export const publicUrl = (key: string) => `https://${AWS.bucket}.s3.${AWS.region}.amazonaws.com/${key}`;