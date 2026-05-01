"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExpoPushToken = isExpoPushToken;
exports.sendExpoPush = sendExpoPush;
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
function isExpoPushToken(token) {
    return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}
/**
 * Send push notifications through Expo Push API.
 * Requires Expo push tokens (ExponentPushToken[...]).
 */
async function sendExpoPush(messages) {
    const filtered = messages.filter((m) => isExpoPushToken(m.to));
    if (filtered.length === 0)
        return;
    // Expo recommends batches of 100.
    const batches = chunk(filtered, 100);
    for (const b of batches) {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(b),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Expo push failed: ${res.status} ${text}`);
        }
        // Best-effort: response contains tickets; we can add receipt checking later if needed.
        await res.json().catch(() => null);
    }
}
