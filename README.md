# convex-s3

A [Convex component](https://www.convex.dev/components) for integrating Amazon S3 file storage into your Convex backend. Supports generating presigned upload and download URLs, so your clients can interact with S3 directly without routing files through your server.

---

## Features

- Generate **presigned upload URLs** so clients can upload files directly to S3
- Generate **presigned download URLs** for secure, time-limited access to stored files
- Attach **cache headers** like `Cache-Control` at upload time
- Return a stable **object URL** alongside the presigned upload URL
- Works natively as a Convex component — no extra server required
- Built with the official AWS SDK v3

---

## Prerequisites

- A [Convex](https://www.convex.dev/) project
- An AWS account with an S3 bucket
- AWS IAM credentials with `s3:PutObject` and `s3:GetObject` permissions


## Setup

### 1. Register the component

In your `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import s3 from "convex-s3/convex.config";

const app = defineApp();
app.use(s3);

export default app;
```

### 2. Set environment variables

Add the following environment variables to your Convex dashboard (or `.env.local` for local development):

| Variable | Description |
|---|---|
| `S3_ACCESS_KEY_ID` | Your AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | Your AWS secret access key |
| `S3_REGION` | The AWS region your bucket is in (e.g. `us-east-1`) |
| `S3_BUCKET` | The name of your S3 bucket |
| `S3_PUBLIC_BASE_URL` | Optional base URL for stable object URLs, such as a CloudFront domain |
| `S3_DEFAULT_CACHE_CONTROL` | Optional default `Cache-Control` header applied to uploads |

---

## Usage

### Generate a presigned upload URL

Use this to let a client upload a file directly to S3:

```ts
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function UploadButton({ file }: { file: File }) {
  const getUploadUrl = useAction(api.s3.generateUploadUrl);

  async function handleUpload() {
    const key = `uploads/${crypto.randomUUID()}-${file.name}`;
    const { url, publicUrl } = await getUploadUrl({
      key,
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    });

    await fetch(url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    console.log("Stable object URL:", publicUrl);
  }

  return <button onClick={handleUpload}>Upload</button>;
}
```

### Generate a presigned download URL

Use this to let a client access a stored file:

```ts
const url = await storage.getSignedUrl("uploads/example.png", {
  expiresIn: 3600,
  responseContentDisposition: 'inline; filename="example.png"',
});
```

### Use stable object URLs for caching

If you want browser or CDN caching to behave well, prefer stable object URLs and versioned object keys:

```ts
import { S3Storage } from "convex-s3";

const storage = new S3Storage(component, {
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  publicBaseUrl: "https://cdn.example.com",
  defaultCacheControl: "public, max-age=31536000, immutable",
});

const { key, publicUrl } = await storage.generateUploadUrl({
  key: `assets/${buildHash}/logo.png`,
});
```

`publicUrl` stays stable for a given object key, which makes it a much better cache key than a presigned download URL that rotates over time.

---

## AWS IAM Policy

Your IAM user or role needs at least the following permissions on your bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

---

## CORS Configuration

To allow browsers to upload directly to your S3 bucket, configure CORS on the bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
    "ExposeHeaders": []
  }
]
```

---

## Project Structure

```
convex-S3-component/
├── convex/
│   └── convex.config.ts    # Component registration
├── src/
│   └── client.ts           # Client-side exports
├── package.json
└── tsconfig.json
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `@aws-sdk/client-s3` | AWS S3 API client |
| `@aws-sdk/s3-request-presigner` | Presigned URL generation |
| `convex` | Convex backend framework |

---

## Contributing

Pull requests and issues are welcome. Please open an issue first to discuss any significant changes.

---

## License

MIT
