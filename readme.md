# I've used retro_ig's package to make my own.

```js
const { YandexMusicExtractor } = require("discord-player-yandexmusic");

discordplayer.useMainPlayer().register(YandexMusicExtractor, { access_token: "yourToken", uid: "yourUid_number" });
```

Instruction to get token: https://github.com/MarshalX/yandex-music-api/discussions/513

To get uid: https://mail.yandex.ru/ 
Your uid will be in url.