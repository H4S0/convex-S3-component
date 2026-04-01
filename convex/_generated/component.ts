/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      deleteMetadata: FunctionReference<
        "mutation",
        "internal",
        { bucket: string; key: string },
        null,
        Name
      >;
      getMetadata: FunctionReference<
        "query",
        "internal",
        { bucket: string; key: string },
        {
          bucket: string;
          contentType?: string;
          key: string;
          size?: number;
        } | null,
        Name
      >;
      listMetadata: FunctionReference<
        "query",
        "internal",
        { bucket: string; limit?: number },
        Array<{
          bucket: string;
          contentType?: string;
          key: string;
          size?: number;
        }>,
        Name
      >;
      upsertMetadata: FunctionReference<
        "mutation",
        "internal",
        { bucket: string; contentType?: string; key: string; size?: number },
        { isNew: boolean },
        Name
      >;
    };
  };
