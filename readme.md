# Unofficial [Yandex.Music](https://music.yandex.com) extractor for discord-player

## Usage

```js
const { YandexMusicExtractor } = require("discord-player-yandexmusic");
// Or
import YandexMusicExtractor from "discord-player-yandexmusic"

// Also do not forget to import discord-player and create player.

discordplayer.useMainPlayer().register(YandexMusicExtractor, { access_token: "yourToken", uid: "yourUid_number" });
```

## How to get your yandex music token and uid

1. To get token, simply follow these [instructions](https://github.com/MarshalX/yandex-music-api/discussions/513).
2. To get uid click [here](https://mail.yandex.ru/). Your uid will be in url.

## Thanks
- retro_ig (aka retrouser955) for his [discord-player-deezer](https://github.com/retrouser955/discord-player-deezer)