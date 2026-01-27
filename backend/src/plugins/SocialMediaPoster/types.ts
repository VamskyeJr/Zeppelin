import { BasePluginType, guildPluginEventListener } from "vety";
import { z } from "zod";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSocialPosts } from "../../data/GuildSocialPosts.js";
import { zSnowflake, zStrictMessageContent } from "../../utils.js";

export const zPlatformPath = z.strictObject({
  enabled: z.boolean().default(false),
  channels: z.array(zSnowflake).default([]),
  message: zStrictMessageContent,
  poll_interval: z.string().optional().default("60s"),
  post_poll_count: z.number().optional().default(10),
});
export type TPlatformPath = z.infer<typeof zPlatformPath>;

export const zPlatformTypes = z.strictObject({
  reddit: z.record(z.string(), zPlatformPath).default({}),
});
export type TPlatformTypes = z.infer<typeof zPlatformTypes>;

export const zSocialMediaPosterConfig = z.strictObject({
  platforms: zPlatformTypes.default({}),
});
export type TSocialMediaPosterConfig = z.infer<typeof zSocialMediaPosterConfig>;

export interface SocialMediaPosterPluginType extends BasePluginType {
  configSchema: typeof zSocialMediaPosterConfig;
  state: {
    logs: GuildLogs;
    pollTimers: NodeJS.Timeout[];
    sentPosts: Map<string, Map<string, bigint>>;
    socialPosts: GuildSocialPosts;
  };
}

export const socialMediaPosterEvt = guildPluginEventListener<SocialMediaPosterPluginType>();
