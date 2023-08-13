'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.YandexMusicExtractor = void 0;
const discord_player_1 = require('discord-player');
const ym_api_meowed_1 = require('ym-api-meowed');
class YandexMusicExtractor extends discord_player_1.BaseExtractor {
  constructor() {
    super(...arguments);
    this.YM = new ym_api_meowed_1.YMApi();
    this.Wrapper = new ym_api_meowed_1.WrappedYMApi(this.YM);
    this.createBridgeQuery = (track) => `${track.title} by ${track.author}`;
    this.YaRegex = {
      track: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/album\/[0-9]+\/track\/[0-9]+/,
      playlist: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/users\/[A-Za-z0-9]+\/playlists\/[0-9]+/,
      album: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/album\/[0-9]+/,
    };
    this.buildTrack = (track, context) =>
      new discord_player_1.Track(this.context.player, {
        title: track.title,
        raw: track,
        description: `Genre: ${track.albums[0].genre}, Release year: ${track.albums[0].year}, Explicit: ${
          track.contentWarning?.includes('explicit') ? 'Yes' : 'No'
        }`,
        author: track.artists.map((artist) => artist.name).join(', '),
        url: `https://music.yandex.ru/album/${track.albums[0].id}/track/${track.id}`,
        source: 'arbitrary',
        thumbnail: track.coverUri,
        duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(track.durationMs)),
        views: 0,
        requestedBy: context?.requestedBy ?? null,
      });
    this.getApi = () => this.YM;
  }
  async activate() {
    if (!this.options) return;
    this.YM.init(this.options);
  }
  async validate(query) {
    if (typeof query !== 'string') return false;
    return this.YaRegex.track.test(query) || this.YaRegex.playlist.test(query) || this.YaRegex.album.test(query);
  }
  async handle(query, context) {
    if (this.YaRegex.track.test(query)) {
      context.type = 'ymtrack';
    } else if (this.YaRegex.album.test(query)) {
      context.type = 'ymalbum';
    } else if (this.YaRegex.playlist.test(query)) {
      context.type = 'ymplaylist';
    } else context.type = 'ymsearch';
    if (context.type === 'ymalbum') {
      const album = await this.Wrapper.getAlbumWithTracks(query);
      const albumonly = await this.Wrapper.getAlbum(query);
      const playlist = new discord_player_1.Playlist(this.context.player, {
        title: albumonly.title,
        thumbnail: albumonly.coverUri,
        description: `Genre: ${albumonly.genre}, Release year: ${albumonly.year}`,
        type: 'playlist',
        source: 'arbitrary',
        author: {
          name: albumonly.artists.map((a) => a.name).join(', '),
          url: `https://music.yandex.ru/artist/${albumonly.artists[0].id}`,
        },
        tracks: [],
        id: albumonly.id + '',
        url: query,
        rawPlaylist: albumonly,
      });
      const alltracks = album.volumes.flatMap((page) => page);
      const tracks = alltracks
        .filter((track) => track.available)
        .map((track) => {
          return this.buildTrack(track, context);
        });
      playlist.tracks = tracks;
      return this.createResponse(playlist, tracks);
    }
    if (context.type === 'ymplaylist') {
      const data = await this.Wrapper.getPlaylist(query);
      if (!data.available) return { playlist: null, tracks: [] };
      const playlist = new discord_player_1.Playlist(this.context.player, {
        title: data.title,
        thumbnail: data.ogImage,
        description: `Created: ${data.created}`,
        type: 'playlist',
        source: 'arbitrary',
        author: {
          name: `${data.owner.name} (${data.owner.login})`,
          url: `https://music.yandex.ru/users/${data.owner.login}`,
        },
        tracks: [],
        id: data.playlistUuid,
        url: query,
        rawPlaylist: data,
      });
      const tracks = data.tracks
        ?.filter((slot) => slot.track.available)
        .map((slot) => {
          const track = slot.track;
          return this.buildTrack(track, context);
        });
      playlist.tracks = tracks ?? [];
      return this.createResponse(playlist, tracks);
    }
    if (context.type === 'ymtrack') {
      const track = await this.Wrapper.getTrack(query);
      const data = {
        playlist: null,
        tracks: [this.buildTrack(track, context)],
      };
      return data;
    }
    if (context.type === 'ymsearch') {
      const track = (await this.YM.searchTracks(query, { pageSize: 5 })).tracks.results[0];
      const data = {
        playlist: null,
        tracks: [this.buildTrack(track, context)],
      };
      return data;
    }
    return this.createResponse(null, []);
  }
  async stream(track) {
    try {
      return this.Wrapper.getMp3DownloadUrl(track.url);
    } catch (e) {
      throw e;
    }
  }
  async getRelatedTracks(track) {
    const trackid = parseInt(track.url.split('/track/')[1], 10);
    const simmilar = await this.YM.getSimmilarTracks(trackid);
    let simmilarTracks = simmilar.simmilarTracks.slice(0, 4);
    if (simmilar.simmilarTracks.length === 0) {
      simmilarTracks = (await this.YM.getStationTracks(`genre:${simmilar.track.albums[0].genre}`)).sequence.map(
        (sttrack) => sttrack.track,
      );
    }
    const playlist = new discord_player_1.Playlist(this.context.player, {
      title: `Related Tracks of ${track.title} - ${track.author}`,
      thumbnail: '',
      description: `Autogenerated playlist with related tracks.`,
      type: 'playlist',
      source: 'arbitrary',
      author: {
        name: 'YMExtractor',
        url: `https://npm.im/discord-player-yandexmusic`,
      },
      tracks: [],
      id: `related${trackid}`,
      url: `https://npm.im/discord-player-yandexmusic`,
      rawPlaylist: null,
    });
    const tracks = simmilarTracks.map((song) => this.buildTrack(song, null));
    playlist.tracks = tracks;
    return this.createResponse(playlist, tracks);
  }
  async getRadioTracks(stationId, queue) {
    const radio = await this.YM.getStationTracks(stationId, queue);
    const tracks = radio.sequence.map((track) => this.buildTrack(track.track, null));
    const playlist = new discord_player_1.Playlist(this.context.player, {
      title: `Radio ${stationId}`,
      thumbnail: '',
      description: `Tracks from ${stationId} wave.`,
      type: 'playlist',
      source: 'arbitrary',
      author: {
        name: 'YMExtractor',
        url: 'https://npm.im/discord-player-yandexmusic',
      },
      tracks,
      id: `${radio.batchId}`,
      url: 'https://npm.im/discord-player-yandexmusic',
      rawPlaylist: radio,
    });
    return this.createResponse(playlist, tracks);
  }
}
exports.YandexMusicExtractor = YandexMusicExtractor;
YandexMusicExtractor.identifier = 'com.dp.ymext'; // com.discord-player.yamusicextractor
