import { guildPlugin } from "vety";
import { GuildLogs } from "../../data/GuildLogs.js";
import { GuildSocialPosts } from "../../data/GuildSocialPosts.js";
import { convertDelayStringToMS } from "../../utils.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { pollSubreddit } from "./functions/pollSubreddit.js";
import { SocialMediaPosterPluginType, TPlatformPath, zSocialMediaPosterConfig } from "./types.js";

const platforms: Record<string, typeof pollSubreddit> = {
  reddit: pollSubreddit,
};

export const SocialMediaPosterPlugin = guildPlugin<SocialMediaPosterPluginType>()({
  name: "social_media_poster",

  dependencies: () => [LogsPlugin],
  configSchema: zSocialMediaPosterConfig,

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
    state.sentPosts = new Map();
    state.socialPosts = GuildSocialPosts.getGuildInstance(guild.id);
    state.pollTimers = [];
  },

  async afterLoad(pluginData) {
    const config = pluginData.config.get();

    // Start poll timers
    for (const platform of Object.keys(config.platforms)) {
      if (!Object.keys(platforms).includes(platform)) continue;
      const platformConfig = config.platforms[platform as keyof typeof config.platforms];
      if (Object.values(platformConfig).length === 0) continue;

      pluginData.state.sentPosts.set(platform, new Map());

      for (const [path, pathSettings] of Object.entries(platformConfig)) {
        await addPathTimer(pluginData, platform, path, pathSettings as TPlatformPath);
      }
    }
  },

  beforeUnload(pluginData) {
    if (pluginData.state.pollTimers) {
      for (const interval of pluginData.state.pollTimers) {
        clearInterval(interval);
      }
    }
  },
});

async function addPathTimer(
  pluginData: ReturnType<typeof guildPlugin<SocialMediaPosterPluginType>>["_pluginData"],
  platform: string,
  path: string,
  pathSettings: TPlatformPath,
): Promise<void> {
  const pathLastPost = await pluginData.state.socialPosts.getLastPost(platform, path);
  pluginData.state.sentPosts.get(platform)?.set(path, pathLastPost);

  const poll = pathSettings.poll_interval ?? "60s";
  const pollPeriodMs = convertDelayStringToMS(poll) ?? 60000;

  // Run immediately on load
  const platformFn = platforms[platform];
  if (platformFn) {
    platformFn(pluginData as Parameters<typeof platformFn>[0], path);
  }

  // Then set up interval
  pluginData.state.pollTimers.push(
    setInterval(() => {
      if (platformFn) {
        platformFn(pluginData as Parameters<typeof platformFn>[0], path);
      }
    }, pollPeriodMs),
  );
}
