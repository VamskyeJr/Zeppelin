import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("social_posts")
export class SocialPost {
  @Column()
  @PrimaryColumn()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  platform: string;

  @Column()
  @PrimaryColumn()
  path: string;

  @Column()
  last_post: string;
}
