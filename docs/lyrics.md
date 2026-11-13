# The words of the song, and what the film shows for them

The whole lyric is two phrases (from the song's author):

- the spoken hook, **"You're in deep trouble, mister"** (lead voice alone), and
- the choir's **"We're in deep trouble"**, which the choir usually sings only as far as **"We're in deep…"**, twice,
  and the third time carries through: "We're in deep" — the "deep" held for three seconds — "trouble", and "trouble"
  once more eight beats later.

There are no other words. Anything that sounds like a chant is one of these: the held "deep" and the held "trouble"
are chopped on every beat by a gate in the lead stem, which is one word stuttering, not new words.

## Where they are sung

Times are seconds into `audio.wav`; frames are song frames (24 a second). Measured by `analysis/lyrics.py` from the
two vocal stems and written to `analysis/lyrics.json`, which is the one place the film takes them from. A word's
start is good to about a frame; the choir's "in" (a change of note sung without a break) and a few others are
marked medium or low confidence in the file, which is about the time only: which word it is is not in doubt.

| When | Voice | What is sung (frame each word starts on) | How far the phrase gets | What the film shows |
|---|---|---|---|---|
| 0:00.0–0:02.4 | lead, spoken | You're 0 · in 6 · deep 15 · trouble 22 · mister 36 | all of it | The vault's first screen says each word as it is said (opening) |
| 0:07.5 | lead + choir | We're 180 · in 190 · deep 203 | "We're in deep…" | Every vault screen, a word at a time (shutters fall) |
| 0:10.8 | lead + choir | We're 260 · in 269 · deep 282 | "We're in deep…" | The same (the drones wake) |
| 0:14.2–0:21.6 | lead + choir | We're 340 · in 349 · deep 362 · trouble 438 (vowel 441) | "We're in deep trouble" | The vault's screens, then on "trouble" the TROUBLE title card (cut on 442) |
| 0:21.6–0:24.9 | lead + choir | trouble 518 (vowel 520) | "Trouble" again | Every screen of the atrium says TROUBLE (518) and the alarm runs (descent) |
| 0:30–0:40 | nobody: brass | — | — | The gantry's boards say WE'RE / IN / DEEP on a three-note brass figure, three times (760–919). Kept as it is: the owner approved it. It is not a sung phrase and is not in the timeline or the caption files |
| 0:42.1–0:50.5 | lead, then choir | a held vowel, no word | — | Nothing (gantry's end, the slice's run) |
| 0:50.6 | lead + choir | We're 1215 · in 1222 · deep 1235 | "We're in deep…" | Nothing: no screen speaks in the slice (name cards, the drop) |
| 0:52.3 | lead + choir | We're 1255 · in 1262 · deep 1276 | "We're in deep…" | Nothing (the slice) |
| 0:53.9–1:01.3 | lead + choir | We're 1295 · in 1301 · deep 1315 · trouble 1391 (vowel 1394) | "We're in deep trouble" | Nothing (the slice) |
| 1:01.3–1:03.3 | lead + choir | trouble 1472 (vowel 1474) | "Trouble" again | Nothing (the slice's leap; Juno's landing) |
| 1:03.3–1:05.5 | lead, spoken | You're 1519 · in 1525 · deep 1534 · trouble 1542 · mister 1558 | all of it | Tane's dead-end boards: IN (the cut to him is on "in"; "you're" is said over Juno's landing and is not shown), DEEP, TROUBLE, and MISTER. in his close-up |
| 1:05.5 | lead + choir | We're 1573 · in 1580 · deep 1594 | "We're in deep…" | The dead-end boards, a word at a time (he bats the first machine on "deep") |
| 1:07.2 | lead + choir | We're 1614 · in 1621 · deep 1633 | "We're in deep…" | The same (the catch on "deep") |
| 1:08.9–1:16.2 | lead + choir | We're 1653 · in 1662 · deep 1673 · trouble 1749 (vowel 1752) | "We're in deep trouble" | The dead-end boards to DEEP; TROUBLE on the service tunnel's little screens from 1749 (small: Juno's tunnel) |
| 1:16.2–1:19.1 | lead + choir | trouble 1829 (vowel 1832) | "Trouble" again | The tunnel's screens are still saying it |
| 1:51.2–1:57.4 | lead, spoken, slower | You're 2670 · in 2675 · deep 2688 · trouble 2697 · mister 2714 (its "-er" held as a long note) | all of it | In the dark, on the screen beside each of the four: YOU'RE, IN (Ife's CRT), IN still (Tane's board), DEEP (the tunnel's screen, Juno), TROUBLE, (the console, Noor). "Mister" is said over the wide of Noor that follows, where no screen is in the picture: not shown |
| 1:58.5 | lead + choir | We're 2844 · in 2852 · deep 2866 | "We're in deep…" | WE'RE on Ife's CRT, IN on the monitor behind Juno and on Noor's console; DEEP is the reunion's first frame, on Tane's board |
| 2:00.2 | lead + choir | We're 2884 · in 2891 · deep 2905 | "We're in deep…" | The split screen's boards, in all four places at once, a word each |
| 2:01.8–2:09.2 | lead + choir | We're 2924 · in 2931 · deep 2945 · trouble 3021 (vowel 3022) | "We're in deep trouble" | The boards: WE'RE, IN, DEEP (held on the boards while the choir holds it), TROUBLE on 3021 |
| 2:09.2–2:12.9 | lead + choir | trouble 3100 (vowel 3103) | "Trouble" again | Nothing: the panels have broken and the four are on the gantry |
| after 2:13 | nobody | — | — | The fall's last screen says DEEP (3818): a joke of the picture's, not a sung word |

The choir's "trouble" has two frames: where the breath of its "tr" starts, and its vowel two or three frames later.
A screen that says TROUBLE anywhere from the one to the other is with the voice.

## What was changed to make the screens true (the audit)

- **Opening**: the hook's words were one to five frames late (YOU'RE 2 → 0, IN 11 → 6, DEEP 16 → 15, TROUBLE 23 → 22,
  MISTER 37 → 36); the first WE'RE was two frames early (178 → 180; the shutter still lands on 178). The other eight
  words were within a frame and stay.
- **Wins**: YOU'RE and IN had been placed by guess. YOU'RE (1528) is gone: the word is said at 1519, before the cut.
  IN 1531 → 1525, MISTER 1553 → 1558 (the close-up now opens on TROUBLE,), WE'RE 1575 / 1615 / 1655 → 1573 / 1614 /
  1653, IN 1590 / 1627 / 1667 → 1580 / 1621 / 1662. The two "trouble"s over Juno were not shown; the tunnel's own
  screens say it now. (The "Trouble chant on every beat" in the old notes is the held word stuttering: never drawn.)
- **Breakdown**: the words were on the wrong onsets: DEEP was shown on the "n" of "in" (ten frames early), TROUBLE on
  "deep", MISTER on "trouble". Now YOU'RE 2670, IN 2675, DEEP 2688, TROUBLE 2697, with the same cuts; and the last IN
  2861 → 2852. MISTER (2714) has no screen in its shot.
- **Reunion**: the boards said "WE'RE IN" as one word, TROUBLE three seconds before it is sung (2958) and then a chant
  of TROUBLE / トラブル on six gate-chops (3009–3073). Now one word per sung onset: WE'RE 2884, IN 2891, DEEP 2906,
  WE'RE 2924, IN 2931, DEEP 2945, TROUBLE 3021, and when the page is re-cut during a held word the new layout's
  board is already saying it.
- **Left as they are**: the descent's TROUBLE (518: on the breath of the shout), the title card (442, a frame after
  the vowel: it is the cut), the gantry's brass WE'RE / IN / DEEP, the fall's DEEP, and the standing TROUBLE of the
  atrium's alarm screens after the shout (0:21–0:29, and until the lights go out in the breakdown).
- **Sung and not shown**: all of 0:50–1:03 (the slice has no speaking screens), "you're" at 1:03.3, "mister" at
  1:53.1, "trouble" at 2:09.2.

## How the film is held to it

- `analysis/lyrics.py` → `analysis/lyrics.json` (its header says how each word is measured; `--whisper` prints
  what faster-whisper hears beside it).
- `engine/sync.js`: `sync.words`, `sync.phrases`, `sync.wordAt(frame)`.
- `engine/marks.mjs`: a mark `{ at, what, on: "lyric", word: "DEEP" }` fails if the frame is more than 0.75 of a
  frame from where that word is sung. Every lyric word a screen comes on with has one (`node engine/marks.mjs shots/NAME.js`).

## Captions

`subs/trouble.srt` and `subs/trouble.vtt`, made by `analysis/captions.py` from the same timeline: one cue per sung
phrase ("You're in deep trouble, mister" / "We're in deep…" / "We're in deep trouble" / "Trouble"), from its first
word to where the voices let go of its last. The .vtt carries each word's own time inside the cue for players that
light words as they are sung. Nothing is burned into the picture.
