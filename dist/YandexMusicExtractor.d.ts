import { BaseExtractor, Track, ExtractorInfo } from "discord-player";
import { YMApi } from "ym-api-meowed";
export interface YaRegex {
    track: RegExp;
    playlist: RegExp;
    album: RegExp;
}
export declare class YandexMusicExtractor extends BaseExtractor {
    static identifier: "com.dp.ymext";
    private YM;
    private Wrapper;
    createBridgeQuery: (track: Track) => string;
    activate(): Promise<void>;
    private YaRegex;
    private buildTrack;
    validate(query: string): Promise<boolean>;
    handle(query: string, context: any): Promise<ExtractorInfo>;
    stream(track: Track): Promise<string>;
    getRelatedTracks(track: Track): Promise<ExtractorInfo>;
    getRadioTracks(stationId: string, queue?: string): Promise<ExtractorInfo>;
    getApi: () => YMApi;
}
