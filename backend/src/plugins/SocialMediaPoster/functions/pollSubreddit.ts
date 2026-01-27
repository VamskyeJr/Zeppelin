import { Snowflake, TextChannel, PermissionsBitField } from "discord.js";
import { GuildPluginData } from "vety";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter.js";
import { renderRecursively, MessageContent } from "../../../utils.js";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions.js";
import { SocialMediaPosterPluginType } from "../types.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";

const REDDIT_URL = "https://www.reddit.com";
const REDDIT_ICON = "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png";
const REDDIT_SPOILER_IMG = "https://cdn.discordapp.com/attachments/980238012384444446/981535288289525830/SpoilerImg.jpg";
export const DEFAULT_POST_POLL_COUNT = 10;

type TRedditPost = {
  title: string;
  thumbnail: string;
  created: number;
  author: string;
  permalink: string;
  url: string;
  id: string;
};

export async function pollSubreddit(
  pluginData: GuildPluginData<SocialMediaPosterPluginType>,
  subredditName: string,
): Promise<void> {
  const config = pluginData.config.get();
  const subreddit = config.platforms.reddit[subredditName];
  if (!subreddit) return;
  if (!subreddit.enabled) return;
  if (subreddit.channels.length === 0) return;

  const limit = subreddit.post_poll_count ?? DEFAULT_POST_POLL_COUNT;
  let redditJson;

  try {
    const redditResponse = await fetch(getRedditUrl(subredditName, limit));
    if (!redditResponse.ok) {
      throw new Error(`HTTP ${redditResponse.status}`);
    }
    redditJson = await redditResponse.json();
    if (!redditJson?.data?.children) {
      throw new Error("Invalid Reddit response format");
    }
  } catch (err) {
    const logs = pluginData.getPlugin(LogsPlugin);
    logs.logBotAlert({
      body: `Unable to poll from r/**${subredditName}**: ${err instanceof Error ? err.message : "Unknown error"}.\nPolling will continue on the next interval.`,
    });
    return;
  }

  const previousPost = pluginData.state.sentPosts.get("reddit")?.get(subredditName) ?? BigInt(0);

  let posts: TRedditPost[] = redditJson.data.children.map((child: { data: TRedditPost }) => child.data);
  posts = posts.filter((post) => BigInt(post.created) > previousPost);

  if (posts.length === 0) return;

  posts = posts.sort((a, b) => a.created - b.created);

  // Update the last post timestamp
  const latestPostTimestamp = BigInt(posts[posts.length - 1].created);
  pluginData.state.sentPosts.get("reddit")?.set(subredditName, latestPostTimestamp);
  await pluginData.state.socialPosts.setLastPost("reddit", subredditName, posts[posts.length - 1].created.toString());

  for (const post of posts) {
    const renderReplyText = async (str: string): Promise<string> => {
      let thumbnail = post.thumbnail;
      if (!thumbnail.startsWith("http")) thumbnail = REDDIT_SPOILER_IMG;

      return renderTemplate(
        str,
        new TemplateSafeValueContainer({
          title: post.title,
          thumbnail,
          created: post.created,
          author: post.author,
          permalink: REDDIT_URL + post.permalink,
          url: post.url,
          id: post.id,
          reddit_icon: REDDIT_ICON,
        }),
      );
    };

    let formatted: MessageContent;

    try {
      formatted =
        typeof subreddit.message === "string"
          ? await renderReplyText(subreddit.message)
          : ((await renderRecursively(subreddit.message, renderReplyText)) as MessageContent);
    } catch (e) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.logBotAlert({
        body: `Error formatting social media message for r/${subredditName}: ${e instanceof Error ? e.message : "Unknown error"}`,
      });
      continue;
    }

    if (!formatted) continue;

    for (const channelId of subreddit.channels) {
      const channel = pluginData.guild.channels.cache.get(channelId as Snowflake);
      if (!channel) continue;
      if (!(channel instanceof TextChannel)) continue;

      if (
        !hasDiscordPermissions(
          channel.permissionsFor(pluginData.client.user!.id),
          PermissionsBitField.Flags.SendMessages | PermissionsBitField.Flags.ViewChannel,
        )
      ) {
        const logs = pluginData.getPlugin(LogsPlugin);
        logs.logBotAlert({
          body: `Missing permissions to send social media post in <#${channelId}>`,
        });
        continue;
      }

      try {
        if (typeof formatted === "string") {
          await channel.send({
            content: formatted,
            allowedMentions: { parse: [] },
          });
        } else {
          await channel.send({
            ...formatted,
            allowedMentions: { parse: [] },
          });
        }
      } catch (e) {
        const logs = pluginData.getPlugin(LogsPlugin);
        logs.logBotAlert({
          body: `Failed to send social media post to <#${channelId}>: ${e instanceof Error ? e.message : "Unknown error"}`,
        });
      }
    }
  }
}

function getRedditUrl(subreddit: string, limit: number): string {
  return `${REDDIT_URL}/r/${subreddit}/new.json?limit=${limit}`;
}
