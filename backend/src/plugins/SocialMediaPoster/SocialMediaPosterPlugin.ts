import { guildPlugin, GuildPluginData } from "vety";
import { GuildSocialPosts } from "../../data/GuildSocialPosts.js";
import { convertDelayStringToMS } from "../../utils.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { pollSubreddit } from "./functions/pollSubreddit.js";
import { SocialMediaPosterPluginType, TPlatformPath, zSocialMediaPosterConfig } from "./types.js";

const platforms: Record<string, (pluginData: GuildPluginData<SocialMediaPosterPluginType>, path: string) => Promise<void>> = {
  reddit: pollSubreddit,
};

export const SocialMediaPosterPlugin = guildPlugin<SocialMediaPosterPluginType>()({
  name: "social_media_poster",

  dependencies: () => [LogsPlugin],
  configSchema: zSocialMediaPosterConfig,

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.socialPosts = GuildSocialPosts.getGuildInstance(guild.id);
    state.sentPosts = new Map();
    state.pollTimers = [];
  },

  async afterLoad(pluginData) {
    const config = pluginData.config.get();
    const state = pluginData.state;

    // Start poll timers for each platform
    for (const platform of Object.keys(config.platforms)) {
      if (!Object.keys(platforms).includes(platform)) continue;

      const platformConfig = config.platforms[platform as keyof typeof config.platforms];
      if (!platformConfig || Object.keys(platformConfig).length === 0) continue;

      state.sentPosts.set(platform, new Map());

      for (const [path, pathSettings] of Object.entries(platformConfig)) {
        await addPathTimer(pluginData, platform, path, pathSettings as TPlatformPath);
      }
    }
  },

  beforeUnload(pluginData) {
    if (pluginData.state.pollTimers) {
      for (const timer of pluginData.state.pollTimers) {
        clearInterval(timer);
      }
    }
  },
});

async function addPathTimer(
  pluginData: GuildPluginData<SocialMediaPosterPluginType>,
  platform: string,
  path: string,
  pathSettings: TPlatformPath,
): Promise<void> {
  const pathLastPost = await pluginData.state.socialPosts.getLastPost(platform, path);
  pluginData.state.sentPosts.get(platform)!.set(path, pathLastPost);

  const pollIntervalStr = pathSettings.poll_interval ?? "60s";
  const pollPeriodMs = convertDelayStringToMS(pollIntervalStr) ?? 60000;

  // Run initial poll
  const platformFn = platforms[platform];
  if (platformFn) {
    platformFn(pluginData, path).catch(() => {});
  }

  // Set up recurring poll
  pluginData.state.pollTimers.push(
    setInterval(() => {
      if (platformFn) {
        platformFn(pluginData, path).catch(() => {});
      }
    }, pollPeriodMs),
  );
}
