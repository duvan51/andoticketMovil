import * as FileSystem from 'expo-file-system/legacy';
import { Mp3Encoder } from './lame';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  const parts: string[] = [];
  let chunk = '';
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    chunk += BASE64_CHARS[b0 >> 2];
    chunk += BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    chunk += i + 1 < len ? BASE64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    chunk += i + 2 < len ? BASE64_CHARS[b2 & 63] : '=';
    if (chunk.length >= 8192) {
      parts.push(chunk);
      chunk = '';
    }
  }
  if (chunk.length > 0) {
    parts.push(chunk);
  }
  return parts.join('');
}

export class RealMp3Recorder {
  private encoder: any = null;
  private chunks: Uint8Array[] = [];
  private sampleRate: number = 44100;

  constructor(targetSampleRate = 44100) {
    this.sampleRate = targetSampleRate;
  }

  public init(sampleRate?: number) {
    if (sampleRate && sampleRate > 0) {
      this.sampleRate = sampleRate;
    }
    this.encoder = new Mp3Encoder(1, this.sampleRate, 128);
    this.chunks = [];
  }

  public processBuffer(pcmArrayBuffer: ArrayBuffer, bufferSampleRate?: number) {
    if (!pcmArrayBuffer || pcmArrayBuffer.byteLength === 0) return;
    if (!this.encoder) {
      this.init(bufferSampleRate || this.sampleRate);
    }
    const samples = new Int16Array(pcmArrayBuffer);
    if (samples.length === 0) return;

    try {
      const mp3chunk = this.encoder.encodeBuffer(samples);
      if (mp3chunk && mp3chunk.length > 0) {
        this.chunks.push(new Uint8Array(mp3chunk.buffer, mp3chunk.byteOffset, mp3chunk.length));
      }
    } catch (e) {
      console.error('[RealMp3Recorder] encodeBuffer error:', e);
    }
  }

  public async finalizeToFile(): Promise<string | null> {
    if (!this.encoder) return null;

    try {
      const flushChunk = this.encoder.flush();
      if (flushChunk && flushChunk.length > 0) {
        this.chunks.push(new Uint8Array(flushChunk.buffer, flushChunk.byteOffset, flushChunk.length));
      }

      if (this.chunks.length === 0) return null;

      const totalLen = this.chunks.reduce((acc, c) => acc + c.length, 0);
      const fullMp3 = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of this.chunks) {
        fullMp3.set(chunk, offset);
        offset += chunk.length;
      }

      const base64 = uint8ArrayToBase64(fullMp3);
      const filePath = `${FileSystem.cacheDirectory}${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(filePath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return filePath;
    } catch (err) {
      console.error('[RealMp3Recorder] finalizeToFile error:', err);
      return null;
    } finally {
      this.encoder = null;
      this.chunks = [];
    }
  }

  public cancel() {
    this.encoder = null;
    this.chunks = [];
  }
}

