/**
 * List admin-only commands
 * Only for group admins (main.js guard ensures only admins can run).
 */
module.exports = async function listCommands(sock, chatId, message) {
  try {
    const lines = [
      '🔐 Admin Commands — list:',
      '',
      '• .ban @user                - Ban a user (adds to banned.json)',
      '• .unban @user              - Remove from banned list',
      '• .promote @user            - Promote a member',
      '• .demote @user             - Demote a member',
      '• .kick @user               - Kick a member',
      '• .mute [minutes]           - Mute group (announcement mode)',
      '• .unmute                   - Unmute group',
      '• .antilink on|off|set ...  - Antilink setup',
      '• .antibadword on|off|set ..- Antibadword setup',
      '• .antitag on|off|set ..     - Antitag setup',
      '• .welcome on|off           - Welcome messages',
      '• .goodbye on|off           - Goodbye messages',
      '• .setgname <name>          - Change group name',
      '• .setgdesc <desc>          - Change group description',
      '• .setgpp (reply to image)  - Set group photo',
      '• .resetlink                - Revoke & reset group invite link',
      '• .chatbot on|off           - Enable chatbot in group',
      '• .antidelete on|off        - Antidelete owner-only setting',
      '• .clearsession             - Clear session files (owner)',
      '• .cleartmp                 - Clear tmp & temp files (owner)',
      '• .list.commands            - Show this admin command list',
      '',
      'Note: regular members can only use .report to report rule violations.'
    ];

    await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: message });
  } catch (err) {
    console.error('listCommands error:', err);
    await sock.sendMessage(chatId, { text: 'Failed to fetch list of commands.' }, { quoted: message });
  }
}