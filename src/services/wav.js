/**
 * Encode a raw AudioBuffer-like set of Float32 channels into a 16-bit PCM WAV Blob.
 */
export function encodeWav(channels, sampleRate) {
    const numChannels = channels.length;
    const numFrames = channels[0]?.length ?? 0;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset, s) => {
        for (let i = 0; i < s.length; i++)
            view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    let offset = 44;
    for (let f = 0; f < numFrames; f++) {
        for (let c = 0; c < numChannels; c++) {
            const sample = Math.max(-1, Math.min(1, channels[c][f] ?? 0));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
    }
    return new Blob([buffer], { type: 'audio/wav' });
}
/**
 * Decode any audio Blob (e.g. captured webm) into raw channel data using OfflineAudioContext.
 */
export async function decodeToChannels(blob, targetSampleRate) {
    const arrayBuffer = await blob.arrayBuffer();
    const AC = (window.AudioContext ||
        window.webkitAudioContext);
    const ctx = new AC();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    await ctx.close();
    const numChannels = decoded.numberOfChannels;
    const offline = new OfflineAudioContext(numChannels, Math.ceil(decoded.duration * targetSampleRate), targetSampleRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    const channels = [];
    for (let c = 0; c < numChannels; c++)
        channels.push(rendered.getChannelData(c).slice());
    return { channels, sampleRate: targetSampleRate };
}
