# The Japanese in the film, 0:00–1:46

Every piece of Japanese on screen in the finished part of the film: what it is, how it is read, what it means, and
whether it is right. Checked by rendering each string and reading the pixels, not by reading the code.

How to read the tables: **Text** is what is on screen. **Reading** is how it is said. Nearly all of it is *katakana*,
the alphabet Japanese uses for loanwords, labels and sound effects, so many entries are simply English words spelled
by sound (トラブル = "toraburu" = trouble). Signs that are Japanese words (not loanwords) are written in katakana too,
the way stencils and old computer displays write them; the kanji they stand for is given so a reader can check.

## Sound words (drawn by `engine/sfx.js`)

| Text | Reading | Meaning | Where (song time) | Verdict |
|---|---|---|---|---|
| おっと… | otto… | "Oops…" (said aloud; with a small Latin "oops" under it). Written in hiragana, as speech is; in katakana (オット) it would read as "husband" | Juno's close-up in the vault, 0:06.7 | Correct |
| ガシャン | gashan | A heavy metal crash: a shutter or gate slamming | Vault shutters 0:07.4, 0:08.5, 0:09.5, 0:10.6; the blast door behind Juno 1:15.8 | Correct |
| ピッ | pi' | An electronic beep or blip | Each of the nine drone eyes opening, 0:11.8–0:13.9 | Correct |
| チーン | chiin | The ding of a bell (a lift, a microwave) | The lift arriving, 0:27.8 | Correct. Was drawn almost wholly off the top of the frame; moved into frame |
| ドカッ | doka' | A heavy thud: a body blow | Tane's shoulder into the drone, 0:37.5 | Correct |
| バキッ | baki' | A sharp crack: something breaking | Tane through the shutter, 0:55.3 | Correct |
| ガンッ | gan' | A hard metallic bang or clang | Tane's pipe on the first drone 1:06.5; one drone through the other 1:09.8 | Correct |
| ガシッ | gashi' | A firm grab, a hard grip | Tane catching the second drone by the tail, 1:08.1 | Correct. Used instead of ガンッ here: he catches it, he does not hit it |
| カチ | kachi | A small click | Noor's thumb on PLAY, 1:20.5 | Correct |
| カチッ | kachi' | A click that locks | Ife's plug locking in its socket, 1:33.5 | Correct |
| ドーン | doon | Boom: an explosion | The blast beside the camera 1:41.2; the last blast 1:43.7 | Correct |

The small ッ at the end of a sound word is a cut-off: it makes the sound abrupt. The long mark ー stretches the vowel.

## Title and name cards (the display font, Dela Gothic One)

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| トラブル | toraburu | "Trouble" | Title card, 0:18.7 | Correct |
| タネ | tane | Tane (as a Japanese word, *tane* is "seed") | Name card, 0:49.9 | Correct |
| イフェ | ife | Ife | Name card, 0:50.3 | Correct (small ェ) |
| ヌール | nuuru | Noor | Name card, 0:50.7 | Correct |
| ジュノ | juno | Juno | Name card, 0:51.1 | Correct (small ュ, voicing marks present) |

## What the station's screens say (under the English word, as the song says it)

Every one of these comes on with the word it glosses, on the frame that word is sung (docs/lyrics.md has the table).

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| トラブル | toraburu | "Trouble" | Vault screens 0:00.9, 0:18; atrium screens 0:21–0:29; corridor board 1:04.3; the service tunnel's little screens 1:12.9–1:18.9; Noor's console 1:52.4; the split screen's boards 2:05.9–2:08 | Correct |
| ミスター | misutaa | "Mister" | Vault screens 0:01.5; corridor board 1:04.9 | Correct |
| ディープ | diipu | "Deep" | Vault screens 0:00.6, 0:08–0:18; gantry board 0:32–0:38; corridor board 1:03.9–1:10; the tunnel's screen beside Juno 1:52.0; the split screen's boards 1:59.4–2:05.8 | Correct. プ (pu) must not read as ブ (bu): the ring was a blob at screen size, now an open ring (fix 3). On the gantry and corridor boards it is written downwards, where its long mark was sideways (fix 1) |
| ウィーア | wiia | "We're" | Vault screens 0:07.5–0:14.5; gantry board 0:31–0:37; corridor board 1:05.5–1:09; Ife's CRT and the tunnel's monitor 1:58.5; the split screen's boards 2:00.2, 2:01.8 | Acceptable: a clipped spelling of "we're" by sound (the full "we are" would be ウィーアー). Long mark and small ィ fixed for downward writing (fixes 1, 2) |
| ユーア | yuua | "You're" | Ife's CRT 1:51.25 (it is no longer on the corridor board: the word is said before the cut to it) | Acceptable, as above. Long mark fixed (fix 1) |
| イン | in | "In" | Gantry board, corridor board, Ife's CRT and Tane's board 1:51.5, the tunnel's monitor and Noor's console 1:58.8, the split screen's boards 2:00.5, 2:02.1 | Correct |
| オーケー | ookee | "OK" | Ife's CRT, 1:45.4 | Correct |
| チャージ | chaaji | "Charge" | Ife's CRT while the bar fills, 1:34–1:39 | Correct |
| テンカ | tenka | "Ignition" (点火) | Ife's CRT when the bar is full, 1:39.5 | Correct in context. (The same sounds can also be 天下 "the whole world" or 添加 "additive"; on a charge readout it reads as ignition) |

## Signs, by place

### The vault (0:00–0:19.9)

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| フウサ | fuusa | "Sealed off / lockdown" (封鎖), over VAULT SEALED | On every shutter | Correct |
| キロク | kiroku | "Records" (記録) | Green wall screens (REEL 0144), bay plate V-03 | Correct |
| アーカイブ | aakaibu | "Archive" | Amber wall screens, bay plate V-06, wall stencil | Correct. On the bay plate its last mark touched the plate's border; moved in (fix 5) |
| ロウカ | rouka | "Corridor" (廊下) | Bay plate V-01 | Correct |
| テープ | teepu | "Tape" | Bay plate V-02, wall stencil | Correct (ring fixed, fix 3) |
| ホカン | hokan | "Storage, safekeeping" (保管) | Bay plate V-04 | Correct |
| コア | koa | "Core" | Bay plate V-05 | Correct |
| デンゲン | dengen | "Power supply" (電源) | Bay plate V-07 | **Was wrong:** the last letter ran off the plate, leaving デンゲ (nothing). Fixed (fix 4) |
| レイキャク | reikyaku | "Cooling" (冷却) | Bay plate V-08 | Correct (small ャ) |
| キロク ホカン | kiroku hokan | "Records storage" (記録保管) | Wall stencil | Correct |
| タチイリ キンシ | tachiiri kinshi | "No entry" (立入禁止) | Wall stencil | Correct |
| キケン | kiken | "Danger" (危険) | Wall stencil | Correct |

### The atrium and the stairwell (0:19.9–0:29.8)

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| アトリウム | atoriumu | "Atrium" | Atrium wall screens | Correct |
| アーカイブ | aakaibu | "Archive" | Plate V-01 over the vault's door | Correct (moved in from the border, fix 5) |
| カイダン | kaidan | "Stairs" (階段) | Plate S8 in the atrium; over the stairwell's door | Correct |
| セクター | sekutaa | "Sector" | Atrium wall stencil | Correct |
| タチイリ キンシ | tachiiri kinshi | "No entry" | Atrium wall stencil | Correct |
| ガントリー | gantorii | "Gantry" | Stairwell level board S0 | Correct |
| ハイカン | haikan | "Piping" (配管) | Level board S1 | Correct |
| デンセン | densen | "Cables, wiring" (電線) | Level board S2 | Correct |
| ポンプ | ponpu | "Pump" | Level board S3 | Correct (rings fixed, fix 3) |
| レイキャク | reikyaku | "Cooling" | Level board S4 | Correct |
| ソウコ | souko | "Warehouse" (倉庫) | Level board S5 | Correct |
| キカイ | kikai | "Machinery" (機械) | Level board S6 | Correct |
| タンク | tanku | "Tank" | Level board S7 | Correct |
| サイカソウ | saikasou | "Bottom level" (最下層) | Level board S8 and the floor of the shaft | **Changed** from カソウ (kasou), which was meant as "lower level" (下層) but is spelled the same as "cremation" (火葬) (fix 7) |

### The machine level and the passage (0:29.8–0:48), the corridors of the slice and the wins (0:48–1:18.9)

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| キカイ デッキ | kikai dekki | "Machine deck" | The big board over the gantry, when it is not speaking | Correct |
| トラブル | toraburu | "Trouble" | Corridor wall stencil and amber screen (SECTOR 07 // RING-C) | Correct |
| キケン | kiken | "Danger" | Corridor screens, placards (HIGH VOLTAGE), blast doors, tunnel door | Correct |
| ドローン | doroon | "Drone" | Red corridor screen (PATROL ACTIVE) | Correct |
| ゲート | geeto | "Gate" | Cyan corridor screen (GATE 12) | Correct |
| シャッター | shattaa | "Shutter" | On the shutter Tane breaks; wall stencil | Correct (small ャ and ッ) |
| ガンマ デッキ | ganma dekki | "Gamma deck" | Corridor wall stencil | Correct |
| ノクス リング | nokusu ringu | "Nox ring" (the station's name) | Corridor wall stencil | Correct |
| ドック / マーケット / コア / リング | dokku / maaketto / koa / ringu | "Dock / Market / Core / Ring" | Over the four arms of the hub, and painted on its floor | Correct |
| イキドマリ | ikidomari | "Dead end" (行き止まり), over NO WAY THROUGH | The board at Tane's dead end, before it speaks | Correct |
| サービス | saabisu | "Service" | Tunnel screen (TUNNEL 7) | Correct |
| サービス トンネル | saabisu tonneru | "Service tunnel" | Tunnel wall stencil | Correct |
| ハイカン | haikan | "Piping" | Tunnel wall stencil | Correct |
| セマイ | semai | "Narrow" (狭い) | Tunnel wall stencil | Correct, if blunt: a warning of a tight way |

### The market, crossed in the slice and at the start of the wins (0:56–1:03)

Stall signs, all ordinary words: ソバ soba (noodles), メシ meshi (a meal), サケ sake, タコ tako (octopus), カニ kani
(crab), ニク niku (meat), コメ kome (rice), アメ ame (sweets), ハナ hana (flowers), ホシ hoshi (star), ミセ mise
(shop), ネジ neji (screws), デンキ denki (electrics), キカイ kikai (machines), トケイ tokei (clocks), クスリ kusuri
(medicine), ラジオ rajio (radio), カセット kasetto (cassette), テープ teepu (tape), ヤミイチ yamiichi (black market,
闇市), ノクス マーケット nokusu maaketto (Nox Market), キケン kiken (danger). All correct. One fault: the cloth
banners cut every word to three letters, so the black market's read ヤミイ, which is nothing; the banners now carry
only words that fit whole (fix 6). The hanging blade signs are written downwards and had the sideways long mark
(マーケット) and a low small ッ (カセット, マーケット): fixes 1 and 2.

### The core (1:18.9–1:32.9)

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| コア | koa | "Core" (C-03) | Wall stencil | Correct |
| ダクト | dakuto | "Duct" (D-7) | Wall stencil | Correct |
| ゼロ | zero | "Zero" (0G) | The lip where the weight stops | Correct |
| デグチ | deguchi | "Exit" (出口) | Deck stencil and the door's plate (EXIT) | Correct |

### The coolant plant (1:32.9–1:45.75)

| Text | Reading | Meaning | Where | Verdict |
|---|---|---|---|---|
| レイキャク | reikyaku | "Cooling" (冷却), with −40 | The plant's board and wall screens; stencilled along the walls | Correct. **The wall stencil was wrong:** five letters ran off the end of its plate and the last, ク, lost its right half. Fixed (fix 8) |
| キケン | kiken | "Danger" | Over the hatch at the dead end | Correct |

## What was wrong, and what was done

1. **The long-vowel mark in writing that runs downwards.** The mark ー was drawn sideways everywhere. In a column it
   must stand upright; lying down it reads as the number one (一) or a dash. This was on the gantry's board and the
   dead-end board (ディープ, ウィーア, ユーア, ミスター) and on the market's blade signs. `sets/sign.js` now turns it.
2. **Small letters in downward writing.** A small letter (ィ, ッ, ャ) sits high and to the right of its column; it
   was drawn low and centred, as in a line. Fixed in `sets/sign.js`.
3. **ブ against プ, and every other voiced letter.** The two ticks (voicing: ブ bu, ガ ga, デ de …) and the little ring
   (プ pu, ポ po) were drawn with the letter's own heavy stroke: at the size a sign is on screen the ticks ran together
   and the ring filled in, so the two could be taken for each other. They are now drawn finer and further apart, the
   ring larger with its hole open (`sets/sign.js`; the sound words draw their own ring in `engine/sfx.js`).
4. **デンゲン on the vault's bay plate V-07** ran off the plate (its last letter was cut). Four-letter names now use
   the smaller size (`sets/vault.js`).
5. **アーカイブ on plate V-06 / V-01** touched the plate's border with its voicing marks; moved in 8 px
   (`sets/vault.js`, `sets/atrium.js`).
6. **Market banners** no longer cut words to three letters (`sets/market.js`).
7. **カソウ → サイカソウ** at the bottom of the stairwell (`sets/stairwell.js`), so that it cannot be read as "cremation".
8. **レイキャク stencil in the coolant plant** is sized to its plate (`sets/plant.js`).
9. **チーン**, the lift's bell, was lettered almost entirely above the top of the frame; it is now on the bare wall
   beside the lift's lamp (`shots/desc_ding.js`).

Checked and found right: no letter is mirrored or turned in any frame looked at (the floor lettering at the foot of
the shaft, S8 サイカソウ, and on the core's lip, ゼロ 0G, reads the right way round from where the camera is); small letters are small; the long mark is level in level writing; ソ / ン and
シ / ツ, which differ only in the slant of their strokes, are each drawn as the right one.

## Not errors, but worth knowing

- **Stall signs pair a Japanese word with an unrelated English one.** The market's signs take their katakana and their
  Latin from two separate lists, so one reads テープ NOODLE ("tape", NOODLE) and another メシ NOX MARKET ("meal").
  Each word is right; the pairs are set dressing, not translations of each other. Left as it is.
- **チーン lasts three frames.** The lift's bell is lettered on the hit and the film cuts in to the gate three frames
  later, so the word is a flash. It is now visible; it is not long.
- **タネ** is also the Japanese word for "seed", and **ホシ**, **ハナ**, **アメ** have everyday second meanings
  (want, nose, rain). None is rude or odd in its place.
