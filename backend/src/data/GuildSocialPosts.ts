import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { SocialPost } from "./entities/SocialPost.js";

export class GuildSocialPosts extends BaseGuildRepository {
  private socialPosts: Repository<SocialPost>;

  constructor(guildId: string) {
    super(guildId);
    this.socialPosts = dataSource.getRepository(SocialPost);
  }

  async getLastPost(platform: string, path: string): Promise<bigint> {
    const post = await this.socialPosts.findOne({
      where: {
        guild_id: this.guildId,
        platform,
        path,
      },
    });
    return BigInt(post?.last_post ?? 0);
  }

  async setLastPost(platform: string, path: string, lastPost: string): Promise<void> {
    const existing = await this.getLastPost(platform, path);
    if (existing === BigInt(0)) {
      await this.socialPosts.insert({
        guild_id: this.guildId,
        platform,
        path,
        last_post: lastPost,
      });
    } else {
      await this.socialPosts.update(
        {
          guild_id: this.guildId,
          platform,
          path,
        },
        {
          last_post: lastPost,
        },
      );
    }
  }
}
