# The song is not licensed for reuse

`audio.wav` is "Trouble", Dimitri Glazkov's song. It is in this repository for one reason: so that the original film
can be rendered with its music and the examples have something to play.

**All rights reserved.** You may clone the repository and render the film and the demo clips with the song for your
own viewing and to check your setup. You may not redistribute the song, publish videos that use it, or use it in
your own work. This applies to:

- `audio.wav`
- the words of the song wherever they are written out: the lyric text in `analysis/lyrics.json`, the caption files
  in `subs/`, and the quotations in `docs/lyrics.md`

The *measurements* of the song in `analysis/listen.json` and `analysis/stems.json` (beat times, loudness envelopes,
onsets) are data the demo needs; they are of no use without the song. The stems themselves are not in the repository.

**Forks bring their own music.** `npm run starter -- your_song.mp3` measures any audio file into `stories/NAME/` and
cuts a first clip to it; nothing in the engine depends on this song (a shot names its song's folder with `song:`).
If you publish a fork, consider removing `audio.wav` and the section edits in `shots/` that only make sense with it.

Everything else is free to use: the code under Apache-2.0 ([LICENSE](LICENSE)), the characters and art under CC BY 4.0
([LICENSE-ART.md](LICENSE-ART.md)).
