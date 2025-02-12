import { z } from "zod";

// Common Content Schemas
export const TextContentSchema = z.object({
  text: z.string(),
});

export const ImageContentSchema = z.object({
  data: z.string(), // base64 encoded image
  mimeType: z.string(),
});

export const ReaderSchema = z.object({
  url: z.string(),
});

export const ReaderResponseSchema = z.object({
  code: z.number(),
  status: z.number(),
  data: z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string(),
    content: z.string(),
    images: z.record(z.string()).optional(),
    links: z.record(z.string()).optional(),
    usage: z.object({
      tokens: z.number(),
    }),
  }),
});

// Search Schemas
export const SearchSchema = z.object({
  query: z.string(),
  count: z.number().optional().default(3),
});

export const SearchResponseSchema = z.object({
  code: z.number(),
  status: z.number(),
  data: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      url: z.string(),
      content: z.string(),
      images: z.record(z.string()).optional(),
      links: z.record(z.string()).optional(),
      usage: z.object({
        tokens: z.number(),
      }),
    })
  ),
});

// Grounding Schemas
export const GroundingSchema = z.object({
  statement: z.string(),
  deepdive: z.boolean().optional().default(false),
});

export const GroundingReferenceSchema = z.object({
  url: z.string(),
  keyQuote: z.string(),
  isSupportive: z.boolean(),
});

export const GroundingResponseSchema = z.object({
  code: z.number(),
  status: z.number(),
  data: z.object({
    factuality: z.number(),
    result: z.boolean(),
    reason: z.string(),
    references: z.array(GroundingReferenceSchema),
  }),
});

export const SearchCaseSchema = z.object({
  query: z.string()
});

export const SearchCaseResponseSchema = z.object({
  code: z.number(),
  status: z.number(),
  data: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      url: z.string(),
      content: z.string(),
      images: z.record(z.string()).optional(),
      links: z.record(z.string()).optional(),
      usage: z.object({
        tokens: z.number(),
      }),
    })
  ),
});

export type Reader = z.infer<typeof ReaderSchema>;
export type ReaderResponse = z.infer<typeof ReaderResponseSchema>;
export type Search = z.infer<typeof SearchSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type Grounding = z.infer<typeof GroundingSchema>;
export type GroundingResponse = z.infer<typeof GroundingResponseSchema>;
export type SearchCase = z.infer<typeof SearchCaseSchema>;
export type SearchCaseResponse = z.infer<typeof SearchCaseResponseSchema>;

