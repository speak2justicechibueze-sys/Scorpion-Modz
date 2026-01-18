const fs = require('fs');
const path = require('path');

const REPORTS_PATH = path.join(__dirname, '..', 'data', 'reports.json');
const OWNER_JSON = path.join(__dirname, '..', 'data', 'owner.json');

// ensure reports file exists
function ensureReportsFile() {
  try {
    const dir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(REPORTS_PATH)) fs.writeFileSync(REPORTS_PATH, JSON.stringify([] , null, 2));
  } catch (e) {}
}

async function notifyOwners(sock, text, mentions = []) {
  try {
    if (fs.existsSync(OWNER_JSON)) {
      const owners = JSON.parse(fs.readFileSync(OWNER_JSON, 'utf8'));
      for (const number of owners) {
        const ownerJid = number.includes('@') ? number : (number + '@s.whatsapp.net');
        await sock.sendMessage(ownerJid, { text }, { mentions });
      }
    } else if (global.settings && global.settings.ownerNumber) {
      const ownerJid = global.settings.ownerNumber + '@s.whatsapp.net';
      await sock.sendMessage(ownerJid, { text }, { mentions });
    }
  } catch (e) {
    console.error('notifyOwners error:', e);
  }
}

module.exports = async function reportCommand(sock, chatId, message) {
  try {
    ensureReportsFile();

    // Parse target
    const ctx = message.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = ctx.mentionedJid || [];
    let reported = null;

    if (mentioned.length > 0) {
      reported = mentioned[0];
    } else if (ctx.participant) {
      reported = ctx.participant;
    } else {
      // try to parse number in message body
      const raw = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
      const parts = raw.split(' ').slice(1);
      if (parts && parts[0] && parts[0].match(/\d{6,}/)) {
        reported = parts[0].replace(/\D/g, '') + '@s.whatsapp.net';
      }
    }

    if (!reported) {
      return await sock.sendMessage(chatId, { text: 'Usage: .report @user <reason>\nReply to a user or mention them.' }, { quoted: message });
    }

    // Reason: text after command (excluding mention if present)
    const rawText = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
    let reason = rawText.split(' ').slice(1).join(' ').trim();
    // if mention is included in text, remove the mention token
    if (ctx.mentionedJid && ctx.mentionedJid.length) {
      // remove the mention token(s) from reason
      reason = reason.replace(/@\d+/g, '').trim();
    }
    if (!reason) reason = 'No reason provided';

    // reporter
    const reporter = message.key.participant || message.key.remoteJid;

    // Save report
    const reports = JSON.parse(fs.readFileSync(REPORTS_PATH, 'utf8') || '[]');
    const report = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      group: chatId,
      reporter,
      reported,
      reason
    };
    reports.push(report);
    fs.writeFileSync(REPORTS_PATH, JSON.stringify(reports, null, 2));

    // Acknowledge reporter
    await sock.sendMessage(chatId, { text: `✅ Report submitted against @${reported.split('@')[0]}. Admins will be notified.`, mentions: [reported] }, { quoted: message });

    // Notify group admins in the group (mention them) and owners privately
    try {
      const metadata = await sock.groupMetadata(chatId);
      const admins = (metadata.participants || []).filter(p => p.admin).map(p => p.id);
      const adminMsg = `📢 *New Report*\nGroup: ${metadata.subject || chatId}\nReporter: @${reporter.split('@')[0]}\nReported: @${reported.split('@')[0]}\nReason: ${reason}\nTime: ${report.timestamp}`;
      if (admins.length) {
        await sock.sendMessage(chatId, { text: adminMsg, mentions: [reporter, reported, ...admins] });
      } else {
        // Fallback: send to group with mentions
        await sock.sendMessage(chatId, { text: adminMsg, mentions: [reporter, reported] });
      }

      // Notify owners privately
      await notifyOwners(sock, `📢 New report in group ${metadata.subject || chatId}\nReporter: ${reporter}\nReported: ${reported}\nReason: ${reason}`, [reporter, reported]);
    } catch (err) {
      console.error('Error notifying admins/owners:', err);
      await notifyOwners(sock, `📢 New report in group ${chatId}\nReporter: ${reporter}\nReported: ${reported}\nReason: ${reason}`, [reporter, reported]);
    }

  } catch (error) {
    console.error('reportCommand error:', error);
    await sock.sendMessage(chatId, { text: '❌ Failed to submit report. Try again later.' }, { quoted: message });
  }
};