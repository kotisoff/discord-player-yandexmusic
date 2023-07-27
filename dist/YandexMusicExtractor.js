'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.YandexMusicExtractor = void 0;
const discord_player_1 = require('discord-player');
const ym_api_1 = require('ym-api');
class YandexMusicExtractor extends discord_player_1.BaseExtractor {
  constructor() {
    super(...arguments);
    this.YM = new ym_api_1.YMApi();
    this.Wrapper = new ym_api_1.WrappedYMApi(this.YM);
    this.createBridgeQuery = (track) => `${track.title} by ${track.author}`;
    this.YaRegex = {
      track: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/album\/[0-9]+\/track\/[0-9]+/,
      playlist: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/users\/[A-Za-z0-9]+\/playlists\/[0-9]+/,
      album: /(^https:)\/\/music\.yandex\.[A-Za-z]+\/album\/[0-9]+/,
    };
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
        description: `Genre: ${albumonly.genre}, Release year: ${albumonly.originalReleaseYear}`,
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
      const tracks = alltracks.map((track) => {
        return new discord_player_1.Track(this.context.player, {
          title: track.title,
          raw: track,
          description: `Genre: ${albumonly.genre}, Release year: ${albumonly.originalReleaseYear}, Explicit: ${track.explicit}`,
          author: track.artists.map((artist) => artist.name).join(', '),
          url: `https://music.yandex.ru/album/${albumonly.id}/track/${track.id}`,
          source: 'arbitrary',
          thumbnail: track.coverUri,
          duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(track.durationMs)),
          views: 0,
          requestedBy: context.requestedBy,
        });
      });
      playlist.tracks = tracks;
      return {
        playlist,
        tracks,
      };
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
      const tracks = data.tracks?.map((slot) => {
        const track = slot.track;
        return new discord_player_1.Track(this.context.player, {
          title: track.title,
          raw: track,
          description: `Genre: ${track.albums[0].genre}, Release year: ${track.albums[0].originalReleaseYear}, Explicit: ${track.explicit}`,
          author: track.artists.map((artist) => artist.name).join(', '),
          url: `https://music.yandex.ru/album/${track.albums[0].id}/track/${track.id}`,
          source: 'arbitrary',
          thumbnail: track.coverUri,
          duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(track.durationMs)),
          views: 0,
          requestedBy: context.requestedBy,
        });
      });
      playlist.tracks = tracks ?? [];
      return {
        playlist,
        tracks: tracks ?? [],
      };
    }
    if (context.type === 'ymtrack') {
      const track = await this.Wrapper.getTrack(query);
      const data = {
        playlist: null,
        tracks: [
          new discord_player_1.Track(this.context.player, {
            title: track.title,
            raw: track,
            description: `Genre: ${track.albums[0].genre}, Release year: ${track.albums[0].originalReleaseYear}, Explicit: ${track.explicit}`,
            author: track.artists.map((artist) => artist.name).join(', '),
            url: query,
            source: 'arbitrary',
            thumbnail: track.coverUri,
            duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(track.durationMs)),
            views: 0,
            requestedBy: context.requestedBy,
          }),
        ],
      };
      return data;
    }
    if (context.type === 'ymsearch') {
      const track = (await this.YM.searchTracks(query, { pageSize: 5 })).tracks.results[0];
      const data = {
        playlist: null,
        tracks: [
          new discord_player_1.Track(this.context.player, {
            title: track.title,
            raw: track,
            description: `Genre: ${track.albums[0].genre}, Release year: ${track.albums[0].originalReleaseYear}, Explicit: ${track.explicit}`,
            author: track.artists.map((artist) => artist.name).join(', '),
            url: `https://music.yandex.ru/album/${track.albums[0].id}/track/${track.id}`,
            source: 'arbitrary',
            thumbnail: track.coverUri,
            duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(track.durationMs)),
            views: 0,
            requestedBy: context.requestedBy,
          }),
        ],
      };
      return data;
    }
    return { playlist: null, tracks: [] };
  }
  async stream(track) {
    try {
      return this.Wrapper.getMp3DownloadUrl(track.url);
    } catch (e) {
      throw e;
    }
  }
  async getRelatedTracks(track) {
    const authors = track.author.split(', ');
    const random = Math.floor(Math.random() * authors.length);
    const author = (await this.YM.searchArtists(authors[random])).artists.results[0].id;
    const tracks = (await this.YM.getArtistTracks(author)).tracks.slice(0, 5);
    const data = tracks.map((song) => {
      return new discord_player_1.Track(this.context.player, {
        title: song.title,
        raw: song,
        description: `Genre: ${song.albums[0].genre}, Release year: ${song.albums[0].originalReleaseYear}, Explicit: ${song.explicit}`,
        author: song.artists.map((artist) => artist.name).join(', '),
        url: `https://music.yandex.ru/album/${song.albums[0].id}/track/${song.id}`,
        source: 'arbitrary',
        thumbnail: song.coverUri,
        duration: discord_player_1.Util.buildTimeCode(discord_player_1.Util.parseMS(song.durationMs)),
        views: 0,
        requestedBy: null,
      });
    });
    return this.createResponse(null, data);
  }
}
exports.YandexMusicExtractor = YandexMusicExtractor;
YandexMusicExtractor.identifier = 'com.discord-player.yamusicextractor';
