# @hasoo/convex-s3

[![npm version](https://img.shields.io/npm/v/%40hasoo%2Fconvex-s3)](https://www.npmjs.com/package/@hasoo/convex-s3)

[npm package](https://www.npmjs.com/package/@hasoo/convex-s3)

A [Convex component](https://www.convex.dev/components/hasoo/convex-s3) for integrating Amazon S3 file storage into your Convex backend. It generates presigned upload and download URLs so your clients can talk to S3 directly without proxying files through your server.

---

## Install

```bash
npm install @hasoo/convex-s3
```

---

## Features

- Generate presigned upload URLs for direct-to-S3 uploads
- Generate presigned download URLs for time-limited access
- Set upload cache headers like `Cache-Control`
- Return a stable object URL alongside the signed upload URL
- Works natively as a Convex component
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
import s3 from "@hasoo/convex-s3/convex.config.js";

const app = defineApp();
app.use(s3);

export default app;
```

If you need the packaged component API type in your app:

```ts
import type { ComponentApi } from "@hasoo/convex-s3/_generated/component.js";
```

### 2. Set environment variables

Add the following environment variables to your Convex dashboard or `.env.local`:

| Variable | Description |
|---|---|
| `S3_ACCESS_KEY_ID` | Your AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | Your AWS secret access key |
| `S3_REGION` | The AWS region your bucket is in, for example `us-east-1` |
| `S3_BUCKET` | The name of your S3 bucket |
| `S3_PUBLIC_BASE_URL` | Optional stable base URL, such as a CloudFront domain |
| `S3_DEFAULT_CACHE_CONTROL` | Optional default `Cache-Control` header for uploads |

---

## Usage

### Generate a presigned upload URL

Use this to let a client upload a file directly to S3 while setting cache headers on the object:

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

Use this when you need secure, expiring access to a stored file:

```ts
const url = await storage.getSignedUrl("uploads/example.png", {
  expiresIn: 3600,
  responseContentDisposition: 'inline; filename="example.png"',
});
```

### Use stable object URLs for caching

For browser or CDN caching, prefer stable object URLs and versioned object keys:

```ts
import { S3Storage } from "@hasoo/convex-s3";

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

`publicUrl` stays the same for a given object key, which makes it a much better cache key than a presigned download URL that rotates over time.

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

```text
convex-S3-component/
├── convex/
│   ├── convex.config.ts
│   ├── lib.ts
│   ├── schema.ts
│   └── _generated/
├── src/
│   └── client.ts
├── client.ts
├── package.json
└── tsconfig.build.json
```

The published package builds both the library client entry and the Convex component entrypoints into `dist/`, including `dist/convex/convex.config.js` and `dist/convex/_generated/component.js`.

---

## Dependencies

| Package | Purpose |
|---|---|
| `@aws-sdk/client-s3` | AWS S3 API client |
| `@aws-sdk/s3-request-presigner` | Presigned URL generation |
| `convex` | Convex backend framework |

---

## Publish Checklist

Before publishing, the usual flow is:

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm pack
```

If you want to test the tarball in another project first:

```bash
pnpm run pack:local
```

That gives you a local package archive you can install into a separate Convex app to verify the packaged component entry points before publishing to npm.

---

## License

MIT
