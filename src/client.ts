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
  publicBaseUrl?: string
  defaultCacheControl?: string
}

export interface UploadUrlOptions {
  key?: string
  contentType?: string
  cacheControl?: string
  contentDisposition?: string
  expiresIn?: number
}

export interface DownloadUrlOptions {
  expiresIn?: number
  responseCacheControl?: string
  responseContentDisposition?: string
  responseContentType?: string
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

type ResolvedS3Config = Required<
  Omit<S3Config, 'publicBaseUrl' | 'defaultCacheControl'>
> &
  Pick<S3Config, 'publicBaseUrl' | 'defaultCacheControl'>

function validateS3Config(config: ResolvedS3Config): void {
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
  private config: ResolvedS3Config
  private component: ComponentApi

  constructor(component: ComponentApi, config?: S3Config) {
    this.component = component
    this.config = {
      bucket: config?.bucket ?? process.env.S3_BUCKET ?? '',
      region: config?.region ?? process.env.S3_REGION ?? '',
      accessKeyId: config?.accessKeyId ?? process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey:
        config?.secretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY ?? '',
      publicBaseUrl: config?.publicBaseUrl ?? process.env.S3_PUBLIC_BASE_URL,
      defaultCacheControl:
        config?.defaultCacheControl ?? process.env.S3_DEFAULT_CACHE_CONTROL,
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

  private normalizeUploadOptions(
    keyOrOptions?: string | UploadUrlOptions,
  ): UploadUrlOptions {
    if (typeof keyOrOptions === 'string') {
      return { key: keyOrOptions }
    }
    return keyOrOptions ?? {}
  }

  private encodeObjectKey(key: string): string {
    return key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
  }

  getPublicUrl(key: string): string {
    const encodedKey = this.encodeObjectKey(key)
    const baseUrl =
      this.config.publicBaseUrl?.replace(/\/+$/, '') ??
      (this.config.region === 'us-east-1'
        ? `https://${this.config.bucket}.s3.amazonaws.com`
        : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`)
    return `${baseUrl}/${encodedKey}`
  }

  async generateUploadUrl(
    key?: string,
  ): Promise<{ key: string; url: string; publicUrl: string }>
  async generateUploadUrl(
    options?: UploadUrlOptions,
  ): Promise<{ key: string; url: string; publicUrl: string }>
  async generateUploadUrl(
    keyOrOptions?: string | UploadUrlOptions,
  ): Promise<{ key: string; url: string; publicUrl: string }> {
    const options = this.normalizeUploadOptions(keyOrOptions)
    const objectKey = options.key ?? crypto.randomUUID()
    const url = await getSignedUrl(
      this.getClient(),
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
        CacheControl: options.cacheControl ?? this.config.defaultCacheControl,
        ContentDisposition: options.contentDisposition,
        ContentType: options.contentType,
      }),
      { expiresIn: options.expiresIn ?? 300 },
    )
    return { key: objectKey, url, publicUrl: this.getPublicUrl(objectKey) }
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string>
  async getSignedUrl(key: string, options?: DownloadUrlOptions): Promise<string>
  async getSignedUrl(
    key: string,
    expiresInOrOptions: number | DownloadUrlOptions = 3600,
  ): Promise<string> {
    const options =
      typeof expiresInOrOptions === 'number'
        ? { expiresIn: expiresInOrOptions }
        : expiresInOrOptions
    return getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ResponseCacheControl: options.responseCacheControl,
        ResponseContentDisposition: options.responseContentDisposition,
        ResponseContentType: options.responseContentType,
      }),
      { expiresIn: options.expiresIn ?? 3600 },
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
