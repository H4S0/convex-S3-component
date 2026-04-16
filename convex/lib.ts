import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import schema from './schema'

export const getMetadata = query({
  args: { key: v.string(), bucket: v.string() },
  returns: v.union(v.object(schema.tables.metadata.validator.fields), v.null()),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('metadata')
      .withIndex('bucket_key', (q) =>
        q.eq('bucket', args.bucket).eq('key', args.key),
      )
      .unique()
    if (!doc) return null
    const { _id, _creationTime, ...rest } = doc
    return rest
  },
})

export const listMetadata = query({
  args: { bucket: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.object(schema.tables.metadata.validator.fields)),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('metadata')
      .withIndex('bucket', (q) => q.eq('bucket', args.bucket))
      .take(args.limit ?? 100)
    return docs.map(({ _id, _creationTime, ...rest }) => rest)
  },
})

export const upsertMetadata = mutation({
  args: schema.tables.metadata.validator.fields,
  returns: v.object({ isNew: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('metadata')
      .withIndex('bucket_key', (q) =>
        q.eq('bucket', args.bucket).eq('key', args.key),
      )
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        contentType: args.contentType,
        size: args.size,
      })
      return { isNew: false }
    }
    await ctx.db.insert('metadata', args)
    return { isNew: true }
  },
})

export const deleteMetadata = mutation({
  args: { key: v.string(), bucket: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('metadata')
      .withIndex('bucket_key', (q) =>
        q.eq('bucket', args.bucket).eq('key', args.key),
      )
      .unique()
    if (existing) await ctx.db.delete(existing._id)
    return null
  },
})
