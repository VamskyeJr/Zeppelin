import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "vety";
import { humanizeDuration } from "../../../../humanizeDuration.js";
import { UnknownUser, asSingleLine, renderUsername } from "../../../../utils.js";
import { MutesPlugin } from "../../../Mutes/MutesPlugin.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import { formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments.js";
import { parseReason } from "../../functions/parseReason.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualUnmuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  user: User | UnknownUser,
  attachments: Array<Attachment>,
  mod: GuildMember,
  ppId?: string,
  time?: number,
  reason?: string | null,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const config = pluginData.config.get();
  const parsedReason = reason ? (parseReason(config, reason) ?? reason) : reason;
  const formattedReason =
    parsedReason || attachments.length > 0
      ? await formatReasonWithMessageLinkForAttachments(pluginData, parsedReason ?? "", context, attachments)
      : undefined;

  const mutesPlugin = pluginData.getPlugin(MutesPlugin);
  const result = await mutesPlugin.unmuteUser(user.id, time, {
    modId: mod.id,
    ppId: ppId ?? undefined,
    reason: formattedReason,
  });

  if (!result) {
    pluginData.state.common.sendErrorMessage(context, "User is not muted!");
    return;
  }

  // Confirm the action to the moderator
  let response: string;
  if (time) {
     const timeUntilUnmute = time && humanizeDuration(time);
     response = `\`[Case #${result.case.case_number}]\` ${renderUsername(user)} has been **scheduled to be unmuted** in ${timeUntilUnmute}.`;
  } else {
    response = `\`[Case #${result.case.case_number}]\` ${renderUsername(user)} has been **unmuted**.`;
  }

  pluginData.state.common.sendSuccessMessage(context, response);
}
