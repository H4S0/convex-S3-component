# convex-s3

A [Convex component](https://www.convex.dev/components) for integrating Amazon S3 file storage into your Convex backend. Supports generating presigned upload and download URLs, so your clients can interact with S3 directly without routing files through your server.

---

## Features

- Generate **presigned upload URLs** so clients can upload files directly to S3
- Generate **presigned download URLs** for secure, time-limited access to stored files
- Works natively as a Convex component — no extra server required
- Built with the official AWS SDK v3

---

## Prerequisites

- A [Convex](https://www.convex.dev/) project
- An AWS account with an S3 bucket
- AWS IAM credentials with `s3:PutObject` and `s3:GetObject` permissions

---

## Installation

```bash
npm install convex-s3
```

---

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
| `AWS_ACCESS_KEY_ID` | Your AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret access key |
| `AWS_REGION` | The AWS region your bucket is in (e.g. `us-east-1`) |
| `AWS_S3_BUCKET` | The name of your S3 bucket |

---

## Usage

### Generate a presigned upload URL

Use this to let a client upload a file directly to S3:

```ts
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function UploadButton() {
  const getUploadUrl = useAction(api.s3.generateUploadUrl);

  async function handleUpload(file: File) {
    const { url, key } = await getUploadUrl({ filename: file.name });

    await fetch(url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    console.log("Uploaded to S3 key:", key);
  }

  return <button onClick={() => handleUpload(myFile)}>Upload</button>;
}
```

### Generate a presigned download URL

Use this to let a client access a stored file:

```ts
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function DownloadLink({ s3Key }: { s3Key: string }) {
  const getDownloadUrl = useAction(api.s3.generateDownloadUrl);

  async function handleDownload() {
    const { url } = await getDownloadUrl({ key: s3Key });
    window.open(url, "_blank");
  }

  return <button onClick={handleDownload}>Download</button>;
}
```

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
