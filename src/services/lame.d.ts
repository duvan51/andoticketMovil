export interface Mp3EncoderInstance {
  encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
  flush(): Int8Array;
}

export interface Mp3EncoderConstructor {
  new (channels: number, sampleRate: number, bitRate: number): Mp3EncoderInstance;
}

export declare const Mp3Encoder: Mp3EncoderConstructor;
