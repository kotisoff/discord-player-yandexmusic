import { BaseExtractor, Track, ExtractorInfo } from "discord-player";
export interface YaRegex {
    track: RegExp;
    playlist: RegExp;
    album: RegExp;
}
export declare class YandexMusicExtractor extends BaseExtractor {
    static identifier: "com.discord-player.yamusicextractor";
    private YM;
    private Wrapper;
    createBridgeQuery: (track: Track) => string;
    activate(): Promise<void>;
    private YaRegex;
    validate(query: string): Promise<boolean>;
    handle(query: string, context: any): Promise<ExtractorInfo>;
    stream(track: Track): Promise<string>;
    getRelatedTracks(track: Track): Promise<ExtractorInfo>;
}
