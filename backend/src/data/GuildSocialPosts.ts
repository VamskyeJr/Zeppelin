import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { SocialPost } from "./entities/SocialPost.js";

export class GuildSocialPosts extends BaseGuildRepository {
  private allSocialPosts: Repository<SocialPost>;

  constructor(guildId: string) {
    super(guildId);
    this.allSocialPosts = dataSource.getRepository(SocialPost);
  }

  async getLastPost(platform: string, path: string): Promise<bigint> {
    const post = await this.allSocialPosts
      .createQueryBuilder()
      .where("guild_id = :gid", { gid: this.guildId })
      .andWhere("platform = :platform", { platform })
      .andWhere("path = :path", { path })
      .getOne();
    return BigInt(post?.last_post ?? 0);
  }

  async setLastPost(platform: string, path: string, lastPost: string): Promise<void> {
    const existingPost = await this.getLastPost(platform, path);
    if (existingPost === BigInt(0)) {
      await this.addLastPost(platform, path, lastPost);
      return;
    }
    await this.allSocialPosts.update(
      {
        guild_id: this.guildId,
        platform,
        path,
      },
      {
        last_post: lastPost,
      }
    );
  }

  async addLastPost(platform: string, path: string, lastPost: string): Promise<void> {
    await this.allSocialPosts.insert({
      guild_id: this.guildId,
      platform,
      path,
      last_post: lastPost,
    });
  }
}
