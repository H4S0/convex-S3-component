import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  metadata: defineTable({
    key: v.string(),
    bucket: v.string(),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
  })
    .index('bucket', ['bucket'])
    .index('bucket_key', ['bucket', 'key']),
})
