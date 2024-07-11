import { BaseExtractor, Track, ExtractorInfo } from "discord-player";
import { Types } from "ym-api-meowed";
export declare class YandexMusicExtractor extends BaseExtractor {
    static identifier: "com.discord-player.yandexextractor";
    private YM;
    private Wrapper;
    createBridgeQuery: (track: Track) => string;
    activate(): Promise<void>;
    private YaRegex;
    buildTrack: (track: Types.Track, context: {
        requestedBy: any;
    } | null) => Track<unknown>;
    private getThumbnail;
    validate(query: string): Promise<boolean>;
    handle(query: string, context: any): Promise<ExtractorInfo>;
    stream(track: Track): Promise<string>;
    getRelatedTracks(track: Track): Promise<ExtractorInfo>;
    getRadioTracks(stationId: string, queueId?: string): Promise<ExtractorInfo>;
}
