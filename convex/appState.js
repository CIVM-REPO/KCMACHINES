import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    key: v.string()
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    return row?.data ?? null;
  }
});

export const save = mutation({
  args: {
    key: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    const patch = {
      key: args.key,
      data: args.data,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("appState", patch);
  }
});
