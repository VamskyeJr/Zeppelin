import { BasePluginType, guildPluginEventListener } from "vety";
import { z } from "zod";
import { GuildSocialPosts } from "../../data/GuildSocialPosts.js";
import { zBoundedCharacters, zBoundedRecord, zSnowflake, zStrictMessageContent } from "../../utils.js";

export const zPlatformPath = z.strictObject({
  enabled: z.boolean().default(false),
  channels: z.array(zSnowflake),
  message: zStrictMessageContent,
  poll_interval: zBoundedCharacters(1, 32).nullable().default("60s"),
  post_poll_count: z.number().min(1).max(100).nullable().default(10),
});
export type TPlatformPath = z.infer<typeof zPlatformPath>;

export const zSocialMediaPosterConfig = z.strictObject({
  platforms: z.strictObject({
    reddit: zBoundedRecord(z.record(z.string(), zPlatformPath), 0, 50).default({}),
  }),
});

export interface SocialMediaPosterPluginType extends BasePluginType {
  configSchema: typeof zSocialMediaPosterConfig;
  state: {
    socialPosts: GuildSocialPosts;
    pollTimers: NodeJS.Timeout[];
    // Platform -> { path -> lastPost timestamp }
    sentPosts: Map<string, Map<string, bigint>>;
  };
}

export const socialMediaPosterEvt = guildPluginEventListener<SocialMediaPosterPluginType>();
