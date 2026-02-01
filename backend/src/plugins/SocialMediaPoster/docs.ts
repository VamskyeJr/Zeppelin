import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zSocialMediaPosterConfig } from "./types.js";

export const socialMediaPosterPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Social Media Auto Poster",
  description: trimPluginDescription(`
    Allows posting new social media posts automatically to Discord channels.
  `),
  configurationGuide: trimPluginDescription(`
    The Social Media Auto Poster plugin is very customizable. For a full list of available platforms and their options, see the Config schema at the bottom of this page.

    ### Simple Reddit poster
    Automatically sends Reddit posts to a channel:

    ~~~yml
    social_media_poster:
      config:
        platforms:
          reddit:
            tbhCreature: # Name of the subreddit
              enabled: true
              channels: ["473087035574321152"]
              message: |-
                **{author}** posted **{title}** in **tbhCreature**
    ~~~

    ### Embed Reddit poster
    This example posts the post as an embed:

    ~~~yml
    social_media_poster:
      config:
        platforms:
          reddit:
            tbhCreature: # Name of the subreddit
              enabled: true
              channels: ["473087035574321152"]
              message:
                embed:
                  title: "{title}"
                  color: 0xff4500
                  description: "{url}"
                  url: "{permalink}"
                  footer:
                    icon_url: "{reddit_icon}"
                    text: "{author}"
                  thumbnail:
                    url: "{thumbnail}"
    ~~~

    ### Configuration options
    - \`enabled\`: Whether this subreddit is enabled
    - \`channels\`: Array of channel IDs to post to
    - \`message\`: The message template (string or embed object)
    - \`poll_interval\`: How often to check for new posts (default: "60s")
    - \`post_poll_count\`: How many posts to check per poll (default: 10)

    ### Template variables
    - \`{title}\`: Title of the post
    - \`{thumbnail}\`: Image URL for the post
    - \`{created}\`: The epoch time of when posted
    - \`{author}\`: The post's author
    - \`{permalink}\`: The post's permalink URL
    - \`{url}\`: The post's URL
    - \`{id}\`: The ID of the post
    - \`{reddit_icon}\`: A 32x32 image of the Reddit logo
  `),
  configSchema: zSocialMediaPosterConfig,
};
