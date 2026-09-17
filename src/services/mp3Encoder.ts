import * as FileSystem from 'expo-file-system/legacy';
import { Mp3Encoder } from './lame';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

export class RealMp3Recorder {
  private encoder: any = null;
  private chunks: Uint8Array[] = [];
  private sampleRate: number = 44100;

  constructor(targetSampleRate = 44100) {
    this.sampleRate = targetSampleRate;
  }

  public init(sampleRate?: number) {
    if (sampleRate) {
      this.sampleRate = sampleRate;
    }
    this.encoder = new Mp3Encoder(1, this.sampleRate, 128);
    this.chunks = [];
  }

  public processBuffer(pcmArrayBuffer: ArrayBuffer, bufferSampleRate?: number) {
    if (!this.encoder) {
      this.init(bufferSampleRate || this.sampleRate);
    }
    const samples = new Int16Array(pcmArrayBuffer);
    if (samples.length === 0) return;

    const mp3chunk = this.encoder.encodeBuffer(samples);
    if (mp3chunk && mp3chunk.length > 0) {
      this.chunks.push(new Uint8Array(mp3chunk.buffer, mp3chunk.byteOffset, mp3chunk.length));
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
