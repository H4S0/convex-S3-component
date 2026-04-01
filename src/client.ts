import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from 'convex/server'
import type { ComponentApi } from '../convex/_generated/component'

export interface S3Config {
  bucket?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
}

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>['runQuery']
}
type RunMutationCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>['runQuery']
  runMutation: GenericMutationCtx<GenericDataModel>['runMutation']
}
type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>['runAction']
  runQuery: GenericQueryCtx<GenericDataModel>['runQuery']
  runMutation: GenericMutationCtx<GenericDataModel>['runMutation']
}

function validateS3Config(config: Required<S3Config>): void {
  const missing: string[] = []

  if (!config.bucket) missing.push('S3_BUCKET')
  if (!config.region) missing.push('S3_REGION')
  if (!config.accessKeyId) missing.push('S3_ACCESS_KEY_ID')
  if (!config.secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Missing required S3 environment variables:\n` +
        `  ${missing.join(', ')}\n` +
        `Set them in your Convex dashboard: https://dashboard.convex.dev`,
    )
  }
}

export class S3Storage {
  private config: Required<S3Config>
  private component: ComponentApi

  constructor(component: ComponentApi, config?: S3Config) {
    this.component = component
    this.config = {
      bucket: config?.bucket ?? process.env.S3_BUCKET ?? '',
      region: config?.region ?? process.env.S3_REGION ?? '',
      accessKeyId: config?.accessKeyId ?? process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey:
        config?.secretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY ?? '',
    }
    validateS3Config(this.config)
  }

  private getClient() {
    return new S3Client({
      region: this.config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    })
  }

  async generateUploadUrl(key?: string): Promise<{ key: string; url: string }> {
    const objectKey = key ?? crypto.randomUUID()
    const url = await getSignedUrl(
      this.getClient(),
      new PutObjectCommand({ Bucket: this.config.bucket, Key: objectKey }),
      { expiresIn: 300 },
    )
    return { key: objectKey, url }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.getClient(),
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn },
    )
  }

  async syncMetadata(
    ctx: RunActionCtx,
    key: string,
    metadata: { contentType: string; size: number },
  ) {
    await ctx.runMutation(this.component.lib.upsertMetadata, {
      key,
      bucket: this.config.bucket,
      contentType: metadata.contentType,
      size: metadata.size,
    })
  }

  async getMetadata(ctx: RunQueryCtx, key: string) {
    return ctx.runQuery(this.component.lib.getMetadata, {
      key,
      bucket: this.config.bucket,
    })
  }

  async deleteObject(ctx: RunMutationCtx, key: string) {
    await ctx.runMutation(this.component.lib.deleteMetadata, {
      key,
      bucket: this.config.bucket,
    })
  }
}
