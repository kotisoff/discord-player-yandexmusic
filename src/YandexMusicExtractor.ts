import { BaseExtractor, Track, Playlist, ExtractorInfo, Util } from "discord-player";
import { YMApi, WrappedYMApi, Types } from "ym-api-meowed";

export interface YaRegex {
    track: RegExp;
    playlist: RegExp;
    album: RegExp;
};

export class YandexMusicExtractor extends BaseExtractor {
    static identifier = 'com.dp.ymext' as const; // com.discord-player.yamusicextractor

    private YM = new YMApi();
    private Wrapper = new WrappedYMApi(this.YM);

    public createBridgeQuery = (track: Track) => `${track.title} by ${track.author}`;

    async activate(): Promise<void> {
        if (!this.options) return
        this.YM.init(this.options)
    }

    private YaRegex: YaRegex = {
        track: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/album\/[0-9]+\/track\/[0-9]+/,
        playlist: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/users\/[A-Za-z0-9]+\/playlists\/[0-9]+/,
        album: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/album\/[0-9]+/
    };

    private buildTrack = (track: Types.Track, context: any | null) => new Track(this.context.player, {
        title: track.title,
        raw: track,
        description: `Genre: ${track.albums[0].genre}, Release year: ${track.albums[0].year}, Explicit: ${(track.contentWarning?.includes("explicit"))?"Yes":"No"}`,
        author: track.artists.map((artist: any) => artist.name).join(", "),
        url: `https://music.yandex.ru/album/${track.albums[0].id}/track/${track.id}`,
        source: "arbitrary",
        thumbnail: track.coverUri,
        duration: Util.buildTimeCode(Util.parseMS(track.durationMs)),
        views: 0,
        requestedBy: context?.requestedBy ?? null
    });

    async validate(query: string): Promise<boolean> {
        if (typeof query !== "string") return false;
        return this.YaRegex.track.test(query) || this.YaRegex.playlist.test(query) || this.YaRegex.album.test(query);
    }

    async handle(query: string, context: any): Promise<ExtractorInfo> {
        if (this.YaRegex.track.test(query)) {
            context.type = "ymtrack"
        } else if (this.YaRegex.album.test(query)) {
            context.type = "ymalbum"
        } else if (this.YaRegex.playlist.test(query)) {
            context.type = "ymplaylist"
        } else context.type = "ymsearch"

        if (context.type === "ymalbum") {
            const album = await this.Wrapper.getAlbumWithTracks(query);
            const albumonly = await this.Wrapper.getAlbum(query);
            const playlist = new Playlist(this.context.player, {
                title: albumonly.title,
                thumbnail: albumonly.coverUri,
                description: `Genre: ${albumonly.genre}, Release year: ${albumonly.year}`,
                type: 'playlist',
                source: 'arbitrary',
                author: {
                    name: albumonly.artists.map(a => a.name).join(", "),
                    url: `https://music.yandex.ru/artist/${albumonly.artists[0].id}`
                },
                tracks: [],
                id: albumonly.id + "",
                url: query,
                rawPlaylist: albumonly
            });
            const alltracks = album.volumes.flatMap(page => page)
            const tracks = alltracks.map(track => {
                return this.buildTrack(track, context);
            })

            playlist.tracks = tracks;

            return this.createResponse(playlist, tracks);
        }

        if (context.type === "ymplaylist") {
            const data = await this.Wrapper.getPlaylist(query);
            if (!data.available) return { playlist: null, tracks: [] }
            const playlist = new Playlist(this.context.player, {
                title: data.title,
                thumbnail: data.ogImage,
                description: `Created: ${data.created}`,
                type: 'playlist',
                source: 'arbitrary',
                author: {
                    name: `${data.owner.name} (${data.owner.login})`,
                    url: `https://music.yandex.ru/users/${data.owner.login}`
                },
                tracks: [],
                id: data.playlistUuid,
                url: query,
                rawPlaylist: data
            })
            const tracks = data.tracks?.map(slot => {
                const track = slot.track;
                return this.buildTrack(track, context);
            })

            playlist.tracks = tracks ?? [];

            return this.createResponse(playlist, tracks);
        }

        if (context.type === "ymtrack") {
            const track = await this.Wrapper.getTrack(query);
            const data = {
                playlist: null,
                tracks: [
                    this.buildTrack(track, context)
                ]
            }

            return data;
        }

        if (context.type === "ymsearch") {
            const track = (await this.YM.searchTracks(query, { pageSize: 5 })).tracks.results[0];
            const data = {
                playlist: null,
                tracks: [
                    this.buildTrack(track, context)
                ]
            }
            return data;
        }
        return this.createResponse(null, [])
    }

    async stream(track: Track): Promise<string> {
        try {
            return this.Wrapper.getMp3DownloadUrl(track.url);
        }
        catch (e) {
            throw (e)
        }
    }

    async getRelatedTracks(track: Track): Promise<ExtractorInfo> {
        const trackid = parseInt(track.url.split("/track/")[1],10);
        const simmilar = await this.YM.getSimmilarTracks(trackid);
        let simmilarTracks = simmilar.simmilarTracks.slice(0,4);
        if(simmilar.simmilarTracks.length===0) {
            simmilarTracks = (await this.YM.getStationTracks(`genre:${simmilar.track.albums[0].genre}`)).sequence.map(sttrack=>sttrack.track)
        }
        const playlist = new Playlist(this.context.player, {
            title: `Related Tracks of ${track.title} - ${track.author}`,
            thumbnail: "",
            description: `Autogenerated playlist with related tracks.`,
            type: 'playlist',
            source: 'arbitrary',
            author: {
                name: "YMExtractor",
                url: `https://npm.im/discord-player-yandexmusic`
            },
            tracks: [],
            id: `related${trackid}`,
            url: `https://npm.im/discord-player-yandexmusic`,
            rawPlaylist: null
        })
        const tracks = simmilarTracks.map(song => this.buildTrack(song,null));
        
        playlist.tracks = tracks

        return this.createResponse(playlist, tracks);
    }

    public async getRadioTracks(stationId:string,queue?:string): Promise<ExtractorInfo> {
        const radio = await this.YM.getStationTracks(stationId,queue);
        const tracks = radio.sequence.map(track=>this.buildTrack(track.track,null));
        const playlist = new Playlist(this.context.player,{
            title: `Radio ${stationId}`,
            thumbnail: "",
            description: `Tracks from ${stationId} wave.`,
            type: "playlist",
            source: "arbitrary",
            author: {
                name: "YMExtractor",
                url: "https://npm.im/discord-player-yandexmusic"
            },
            tracks,
            id: `${radio.batchId}`,
            url: "https://npm.im/discord-player-yandexmusic",
            rawPlaylist: radio
        })
        return this.createResponse(playlist,tracks)
    }
    public getApi = () => this.YM
}