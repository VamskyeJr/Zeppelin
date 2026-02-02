import { ChannelType, TextChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter.js";
import { renderRecursively, validateAndParseMessageContent } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { SocialMediaPosterPluginType, TPlatformPath } from "../types.js";

const REDDIT_URL = "https://www.reddit.com";
const REDDIT_ICON = "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png";
const REDDIT_SPOILER_IMG = "https://cdn.discordapp.com/attachments/980238012384444446/981535288289525830/SpoilerImg.jpg";
export const DEFAULT_POST_POLL_COUNT = 10;

interface RedditPost {
  title: string;
  thumbnail: string;
  created: number;
  author: string;
  permalink: string;
  url: string;
  id: string;
}

interface RedditApiResponse {
  data: {
    children: Array<{ data: RedditPost }>;
  };
}

export async function pollSubreddit(
  pluginData: GuildPluginData<SocialMediaPosterPluginType>,
  subredditName: string,
): Promise<void> {
  const config = pluginData.config.get();
  const subreddit = config.platforms.reddit[subredditName] as TPlatformPath | undefined;

  if (!subreddit) return;
  if (!subreddit.enabled) return;
  if (subreddit.channels.length === 0) return;

  const limit = subreddit.post_poll_count ?? DEFAULT_POST_POLL_COUNT;

  let redditJson: RedditApiResponse;
  try {
    const redditResponse = await fetch(getRedditUrl(subredditName, limit));
    if (!redditResponse.ok) {
      throw new Error(`Reddit API returned ${redditResponse.status}`);
    }
    redditJson = (await redditResponse.json()) as RedditApiResponse;
    if (!redditJson?.data?.children) {
      throw new Error("Invalid Reddit API response");
    }
  } catch (err) {
    const logs = pluginData.getPlugin(LogsPlugin);
    logs.logBotAlert({
      body: `Unable to poll from r/**${subredditName}**. Error: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
    return;
  }

  const previousPost = pluginData.state.sentPosts.get("reddit")?.get(subredditName) ?? BigInt(0);

  let posts: RedditPost[] = redditJson.data.children.map((child) => child.data);
  posts = posts.filter((post) => BigInt(Math.floor(post.created)) > previousPost);

  if (posts.length === 0) return;

  // Sort by created time ascending (oldest first)
  posts = posts.sort((a, b) => a.created - b.created);

  // Update last post timestamp
  const latestPost = posts[posts.length - 1];
  const latestTimestamp = BigInt(Math.floor(latestPost.created));

  if (!pluginData.state.sentPosts.has("reddit")) {
    pluginData.state.sentPosts.set("reddit", new Map());
  }
  pluginData.state.sentPosts.get("reddit")!.set(subredditName, latestTimestamp);
  await pluginData.state.socialPosts.setLastPost("reddit", subredditName, latestTimestamp.toString());

  for (const post of posts) {
    let thumbnail = post.thumbnail;
    if (!thumbnail || !thumbnail.startsWith("http")) {
      thumbnail = REDDIT_SPOILER_IMG;
    }

    const templateValues = new TemplateSafeValueContainer({
      title: post.title,
      thumbnail,
      created: post.created,
      author: post.author,
      permalink: REDDIT_URL + post.permalink,
      url: post.url,
      id: post.id,
      reddit_icon: REDDIT_ICON,
    });

    const renderReplyText = async (str: string) => renderTemplate(str, templateValues);

    let formatted: unknown;
    if (typeof subreddit.message === "string") {
      formatted = await renderReplyText(subreddit.message);
    } else {
      formatted = await renderRecursively(subreddit.message, renderReplyText);
    }

    if (!formatted) continue;

    // Validate and parse the message content (handles both string and object formats)
    let messageContent;
    try {
      messageContent = validateAndParseMessageContent(formatted);
    } catch {
      continue;
    }

    for (const channelId of subreddit.channels) {
      try {
        const channel = pluginData.guild.channels.cache.get(channelId);
        if (!channel) continue;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) continue;

        const textChannel = channel as TextChannel;
        await textChannel.send(messageContent);
      } catch (err) {
        // Silently fail for individual channel sends
      }
    }
  }
}

function getRedditUrl(subreddit: string, limit: number): string {
  return `${REDDIT_URL}/r/${subreddit}/new.json?limit=${limit}`;
}
