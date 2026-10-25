// Sample story content for Phase 3: written chapters, image panels and video clips.
// Keyed by story id (see src/data/stories.js). Replace with real content from a backend later.
//
// Images load from picsum.photos (placeholder photos). If an image fails to load, the app
// shows a colored illustration panel with the caption instead.
// Videos are public sample clips. They stand in for the real films.

import { longChapters } from './chapters';

const IMAGE_HOST = 'https://picsum.photos/seed';
const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

function panels(storyId, color, icon, captions) {
  return captions.map((caption, i) => ({
    id: `${storyId}-p${i + 1}`,
    caption,
    color,
    icon,
    uri: `${IMAGE_HOST}/${storyId}-panel-${i + 1}/900/1200`,
  }));
}

export const content = {
  // ---------------------------------------------------------------- Written (free)
  s1: {
    chapters: [
      {
        id: 's1-c1',
        title: 'The Wall at Dusk',
        body: [
          'Every evening, when the sun slid behind the red-tiled roofs of Ibadan and the market sellers began to fold their cloth awnings, Folake climbed the old city wall with a taper in her hand and a bell around her neck. There were forty-one lanterns along the eastern stretch, and each one had to be woken before the last of the light was gone.',
          'Her grandmother had taught her the order. The iron lantern first, the one nearest the gate, because it was the oldest and the slowest to catch. Then the glass ones, then the paper ones that the children decorated with chalk. You did not rush them. A lantern lit in a hurry burned crooked, and a crooked flame, her grandmother always said, was an invitation.',
          'Folake had never asked what the invitation was for. Tonight, as she reached the fourth lantern, she noticed that the flame inside was already burning. It was steady and gold, and it was not hers.',
        ],
      },
      {
        id: 's1-c2',
        title: 'A Flame Without a Hand',
        body: [
          'She stood very still. In four years of lighting the wall she had never found a lantern burning that she had not lit herself. The wick was fresh, trimmed to the exact length her grandmother preferred, and the glass had been wiped clean of soot. Whoever had come before her had cared.',
          '“Hello?” she said, feeling foolish. The wind carried the smell of roasting corn up from the market below, and somewhere a radio played highlife, tinny and warm. Nothing answered. But when she lifted her taper toward the next lantern, the flame inside leaned toward her, the way a plant leans toward a window.',
          'She lit the rest of the wall in silence, and at every lantern the same thing happened. The flames bent, just slightly, toward the east. By the time she reached the last one, Folake understood that it was not a greeting. It was a direction.',
        ],
      },
      {
        id: 's1-c3',
        title: 'What the Bell Remembers',
        body: [
          'She did not go home. She sat on the cold stone with the bell silent against her collarbone and listened to the city settle: shutters closing, a goat complaining, the long exhale of a town deciding to sleep. Her grandmother had never explained the bell either. It rang only when the lanterns were all lit, one clear note that she had always taken for a kind of punctuation.',
          'Tonight she lifted it and turned it over. Along the inner rim, worn almost smooth by decades of her family’s thumbs, were letters she had never noticed. Not words, exactly. A map, scratched in tiny lines: the wall, the gate, and a road leading east into the dark where no lantern had ever been lit.',
          'At the end of the road someone had pressed a single mark into the metal. A flame.',
        ],
      },
      {
        id: 's1-c4',
        title: 'The Road Without Lanterns',
        body: [
          'At dawn she packed bread, a clay lamp, and her grandmother’s second taper, and told the gatekeeper she was visiting a cousin. He looked at the bell, then at her face, and said nothing at all. He only opened the small gate beside the big one, the one used for funerals and for leaving.',
          'Beyond the wall the road was only red earth and long grass, and for the first hour Folake kept glancing back at the lanterns, now pale and unlit in the morning. Then she stopped looking. Ahead of her, in the daylight, a single small flame stood on a post at the side of the road, burning steady and gold, waiting for her to catch up.',
          'It was the first of many. She walked toward it.',
        ],
      },
    ],
    gallery: null,
  },

  s3: {
    chapters: [
      {
        id: 's3-c1',
        title: 'Grandfather’s Letters',
        body: [
          'The letters came in a biscuit tin that still smelled faintly of cardamom. Nia found it under the stairs while Tomi was arguing with the plumber, and by the time he returned she had already spread forty years of her grandfather’s handwriting across the kitchen table.',
          '“We should read them,” she said. Tomi picked up one and held it to the window, where the harbour light turned the paper almost transparent. “We should,” he agreed. “But not all at once. He wrote them to be opened slowly.”',
        ],
      },
      {
        id: 's3-c2',
        title: 'The First Boat',
        body: [
          'Folding the first boat took four tries. The paper was old and soft at the creases, and Nia kept apologising to it. Tomi showed her the trick their grandfather had taught him: a crisp fold along the middle, then the hull pinched flat until it floated.',
          'They carried it down to the harbour wall at low tide. Nia read a single line aloud, the one about the day he bought the boat they had never been allowed to name, and Tomi set the little paper hull on the water. It turned twice, hesitated, and then the tide took it.',
          '“Do you think he can see it?” she asked. Tomi watched until the boat was just a pale fleck among the moored trawlers. “I think he would say the water can read it,” he said.',
        ],
      },
      {
        id: 's3-c3',
        title: 'Salt on the Page',
        body: [
          'They launched a boat every evening that week. Some letters made them laugh, like the one about the cat that had followed him to church, and some made the harbour go quiet. Neither of them rushed the quiet.',
          'On the last evening, Nia kept the final letter. “It’s the only one addressed to both of us,” she said, and held it out. Tomi unfolded it carefully. It was a single line in their grandfather’s uneven hand: Keep the tin. Fill it with your own.',
        ],
      },
    ],
    gallery: null,
  },

  s7: {
    chapters: [
      {
        id: 's7-c1',
        title: 'The Compass That Would Not Point North',
        body: [
          'The compass arrived wrapped in a map of a country that no longer existed. Marisol turned it over in the lamplight of her father’s empty workshop and watched the needle swing, shiver, and settle firmly toward the door.',
          'North was behind her. She checked three times, then walked to the window to compare it with the pole star, and the needle followed her across the room like a dog. It did not want north. It wanted something else.',
        ],
      },
      {
        id: 's7-c2',
        title: 'Ash and Honey',
        body: [
          'In the market at Qasr el-Nahl she learned the first rule of the compass: it pointed toward whatever she was most afraid to lose. For two days it swung toward her mother’s house. On the third, standing at a stall that sold honey in clay pots, it swung toward the stall owner’s hand.',
          '“It likes the lavender,” the woman said, watching the needle with one raised eyebrow. “My mother had one of those. It never worked for anything but fear.” She pressed a pot of honey into Marisol’s palm. “Eat something first. Nobody finds anything on an empty stomach.”',
          'Marisol ate the honey on the steps of the market, and the needle, for the first time, was still.',
        ],
      },
      {
        id: 's7-c3',
        title: 'The Ferryman’s Price',
        body: [
          'The river had a toll, and the ferryman wanted a story in payment. Marisol told him about the workshop, the maps her father had drawn and never shown anyone, the compass that would not obey.',
          'He listened without nodding. When she finished, he took the oars. “The needle is honest,” he said. “That is the trouble with it. Most people would rather have a compass that lies.”',
        ],
      },
    ],
    gallery: null,
  },

  s12: {
    chapters: [
      {
        id: 's12-c1',
        title: 'The Empty Branches',
        body: [
          'By seven in the morning, all two hundred apple trees on the Lindqvist estate had been picked clean. No ladders had been left behind, no baskets, no boot prints in the wet grass. Only the faint, sweet smell of bruised fruit hung over the orchard like a held breath.',
          'Inspector Marit Holm stood at the end of the third row and counted the bare branches twice. “Someone had help,” she said finally. The estate manager, a thin man named Gustaf, wrung his cap in both hands. “Nobody here saw anything,” he said, a little too quickly.',
        ],
      },
      {
        id: 's12-c2',
        title: 'The Only Witness',
        body: [
          'Edith Brandt had taught the village school for forty years and still corrected the grammar on the notices at the post office. She lived in the cottage nearest the orchard, and she received the inspector with tea, a plate of shortbread, and a very firm refusal to have seen anything at all.',
          '“I sleep soundly,” she said. Marit looked at the window, which faced the orchard directly, and at the pair of binoculars on the sill, and at the faint ring of condensation where a hot cup had stood on the glass all night. She said nothing. She ate a piece of shortbread instead.',
          '“Excellent,” she said. “Did you bake these yourself?”',
        ],
      },
      {
        id: 's12-c3',
        title: 'Windfalls',
        body: [
          'In the ditch behind the cottage, Marit found a single apple, perfectly ripe and marked with the faint print of a child’s thumb. She turned it over in her glove. The trees had not been robbed by thieves. They had been harvested by someone who knew exactly which fruit to take, and exactly which to leave.',
          'That evening she returned to the cottage. “Mrs Brandt,” she said, “who were you protecting?”',
        ],
      },
    ],
    gallery: null,
  },

  // ---------------------------------------------------------------- Written (premium)
  s5: {
    chapters: [
      {
        id: 's5-c1',
        title: 'The Teapot',
        body: [
          'The teapot arrived in eleven pieces, wrapped in a silk scarf and carried in a shoebox by a man who looked as if he had not slept in a week. Hana laid the fragments on her workbench, one by one, and felt the familiar quiet of a problem that could be solved slowly.',
          '“It was my wife’s,” he said. “I dropped it. That’s all.” He said it as if the dropping had been the whole of the grief. Hana did not correct him. She only asked his name, and he said Daichi, and that he played violin, and that the workshop next door had been empty for years.',
          '“It’s not empty now,” Hana said. “I rented it for the gold.”',
        ],
      },
      {
        id: 's5-c2',
        title: 'Gold in the Cracks',
        body: [
          'Kintsugi was not about hiding the break. It was about honouring it, binding each seam with lacquer and a thread of real gold, so that the mended thing was more beautiful for having been broken. Hana explained this to Daichi while he sat in the corner of her workshop, pretending to tune his violin.',
          'He came back the next day, and the next. He never said he was listening, but the music from the next room slowed to match the pace of her brush. Each evening she found a small gift on the step: a pear, a folded poem, once a single perfect chestnut.',
        ],
      },
      {
        id: 's5-c3',
        title: 'The Seventh Seam',
        body: [
          'On the seventh seam, Hana’s hands began to shake. It was not the gold, or the lacquer, or the fragile curve of the spout. It was the way Daichi had started to hum while he watched, a tune she half remembered from somewhere before her own loss.',
          '“You don’t have to finish today,” he said softly. She looked at him over the cracked rim of the pot. “I know,” she said. “That’s the part I’m afraid of.”',
        ],
      },
    ],
    gallery: null,
  },

  s15: {
    chapters: [
      {
        id: 's15-c1',
        title: 'The Hitchhiker',
        body: [
          'Walt Brenner had driven the same eleven hundred miles of highway for nineteen years, and he picked up exactly one hitchhiker in all that time. She was standing at the edge of the Hollowbone exit at 2 a.m., in a coat that was too thin for the weather, with her thumb out and her eyes closed.',
          '“Where to?” he asked. She opened her eyes. “Wherever you were going,” she said, “but I’d like to hear about the people you passed.”',
        ],
      },
      {
        id: 's15-c2',
        title: 'Names on the Shoulder',
        body: [
          'She knew the name of the man at the weigh station who always waved. She knew the diner waitress in Cutler who had left him a free slice of pie on his birthday and the boy on the overpass at mile marker 212 who still counted his truck every Thursday.',
          'Walt gripped the wheel. “How do you know them?” he asked. She watched the mile markers slide past. “They told me,” she said. “Right after you drove by.”',
        ],
      },
      {
        id: 's15-c3',
        title: 'Mile Marker Zero',
        body: [
          'The highway had no mile marker zero. Walt knew this, the way he knew the weight limit on the Cutler bridge. Yet the sign appeared at the edge of his headlights, mounted on a post as old as the road itself, and beneath it was a line of people standing in the dark.',
          'The hitchhiker smiled for the first time. “They’d like a ride,” she said. “They’ve been waiting a long time.”',
        ],
      },
    ],
    gallery: null,
  },

  // ---------------------------------------------------------------- Mixed (text + images)
  s2: {
    chapters: [
      {
        id: 's2-c1',
        title: 'Relay Station 9',
        body: [
          'Dr. Ines Calloway had been alone on Relay Station 9 for four hundred and eleven days when the transmission arrived. The relay’s job was dull by design: catch the weak signals drifting out of the dark, boost them, and fling them onward to Earth. She had not expected the signal to be hers.',
          'It began with a breath. Then a voice, tired and slightly hoarse, said her name. “Ines. If you are hearing this, do not log it. Listen to the whole thing first.”',
        ],
      },
      {
        id: 's2-c2',
        title: 'The Date Stamp',
        body: [
          'The metadata was impossible. The recording carried a timestamp from twenty-six years earlier, two full years before Ines was born. She ran it through every integrity check the station had and watched each one pass.',
          'The voice continued. It described the station’s hull, the sticky third hatch, the song she hummed while calibrating the antenna. It described a decision she had not yet made.',
        ],
      },
      {
        id: 's2-c3',
        title: 'Reply',
        body: [
          'She sat for a long time with the transmit key under her thumb. Whatever she sent back would travel to the past, and she would have to live inside the consequences.',
          'Finally she pressed the key. “Hello,” she said, in a voice she hoped sounded braver than she felt. “I’m listening. Start from the beginning.”',
        ],
      },
    ],
    gallery: panels('s2', '#25205A', 'planet', [
      'The first transmission, plotted as a waveform. Its start point sits before any known launch.',
      'The operator’s console, lit by a single amber warning light.',
      'A recording date that cannot be right, circled twice in red.',
    ]),
  },

  s11: {
    chapters: [
      {
        id: 's11-c1',
        title: 'First Rain',
        body: [
          'The monsoon arrived at four in the afternoon, announced by a wind that smelled of wet earth and diesel. Sofia pressed her forehead to the bus window and watched the tea terraces dissolve into green and grey, one hillside at a time.',
          'Every passenger had put away their phones. For a few minutes, the whole bus simply listened.',
        ],
      },
      {
        id: 's11-c2',
        title: 'Notes from the Backwaters',
        body: [
          'In Alleppey she bought a postcard of the backwaters and wrote on the back in pencil, because the ink would not dry in the damp. “Everything here is a little bit afloat,” she wrote. “The houses, the markets, the grown-ups, me.”',
          'A boatman offered her a ride at sunset. She said yes before he finished the sentence.',
        ],
      },
      {
        id: 's11-c3',
        title: 'Umbrellas',
        body: [
          'The market was a river of umbrellas, red and yellow and black, each one bobbing above its own small kingdom of vegetables. Sofia recorded the sound for a full minute: rain on canvas, rain on tin, a vendor singing prices.',
          'Later, replaying it in her room, she realised it was not the rain she had wanted to keep. It was the singing.',
        ],
      },
    ],
    gallery: panels('s11', '#5B52B8', 'rainy', [
      'First rain over the tea terraces, seen from a bus window.',
      'A handwritten postcard from the backwaters, pencil already blurring in the damp.',
      'Umbrellas at the market, with a field-recording waveform running underneath.',
    ]),
  },

  s13: {
    chapters: [
      {
        id: 's13-c1',
        title: 'The Well That Sang',
        body: [
          'In the village of Moonwell there was a well that hummed after dark. The elders said it was only wind in the old stone, but the children knew better. On nights when sleep refused to come, the well sang them a lullaby, low and silver, in a language older than the village itself.',
          'Little Zuri, who had not slept properly in a week, crept out of bed and padded barefoot across the cold square. She leaned over the rim and listened. The well sang about rivers, and moths, and the long patient dark.',
        ],
      },
      {
        id: 's13-c2',
        title: 'The Night-Weaver',
        body: [
          'A tall figure stood on the far side of the well, wrapped in a cloak that seemed made of the night sky itself. Its fingers were long and quick, drawing threads of song out of the air and winding them onto a spindle.',
          '“That song is mine,” the night-weaver said gently. “I lost it a long time ago, and the well found it first.”',
        ],
      },
      {
        id: 's13-c3',
        title: 'A Trade',
        body: [
          'Zuri thought for a long moment. She was small, and the night-weaver was very large, but she had been sleepless long enough to be brave. “If you take the song,” she said, “the village will never sleep again.”',
          '“Then teach me a different one,” said the night-weaver. “One that is half mine and half theirs.” And Zuri, who had never sung to anyone but herself, took a breath.',
        ],
      },
    ],
    gallery: panels('s13', '#8B6CF0', 'musical-notes', [
      'The village well at midnight, silver and faintly humming.',
      'A child leans over the stone rim, listening.',
      'The night-weaver’s loom, strung with threads of song.',
    ]),
  },

  // ---------------------------------------------------------------- Image stories
  s4: {
    chapters: null,
    gallery: panels('s4', '#1B1740', 'search', [
      'Snow closes the mountain road. Seven lanterns appear in the windows of the Hollow Inn.',
      'The guests gather in the common room, each one pretending not to study the others.',
      'A single guest book lies open on the oak counter, the ink still wet.',
      'At midnight the clock stops. So does the wind.',
      'Six chairs at the breakfast table. One cup is still steaming.',
      'The final page of the guest book, signed in a hand the innkeeper knows too well.',
    ]),
  },

  s8: {
    chapters: null,
    gallery: panels('s8', '#FF7A6B', 'mail', [
      'Dawn at the lighthouse. The relief worker finds a bottle wedged between the rocks.',
      'The first message, written in violet ink and smudged with salt.',
      'A reply, folded into a paper boat and set loose on the morning tide.',
      'Three weeks later a bottle returns. The handwriting has changed.',
      'Two lights on opposite shores, finally answering each other.',
    ]),
  },

  s10: {
    chapters: null,
    gallery: panels('s10', '#8B6CF0', 'map', [
      'The apprentice unrolls the map of the Six Islands. Overnight, the sea has erased the southern coast again.',
      'On Pebble Island, the ferryman trades a story for a landmark.',
      'A compass rose drawn in charcoal on the cliff face, older than any map.',
      'Storm clouds redraw the horizon faster than ink can dry.',
      'The finished map, tilted toward a seventh island nobody has named.',
    ]),
  },

  s14: {
    chapters: null,
    gallery: panels('s14', '#E85F4F', 'train', [
      'Platform 4, 7:42 a.m. Two strangers, one empty bench.',
      'The train doors open. She takes the window seat, he takes the aisle.',
      'A dropped glove, a quiet hand, a silent thank-you.',
      'Rain streaks the glass. Neither of them gets off at their usual stop.',
      'The next morning, someone has saved the seat.',
    ]),
  },

  // ---------------------------------------------------------------- Video stories
  s6: {
    chapters: null,
    gallery: null,
    video: {
      uri: `${SAMPLE}/ForBiggerEscapes.mp4`,
      previewUri: null,
      about:
        'A narrated short film in six parts, shot on a single night shift. This sample clip stands in for the full film.',
    },
  },

  s9: {
    chapters: null,
    gallery: null,
    video: {
      uri: `${SAMPLE}/ForBiggerJoyrides.mp4`,
      previewUri: `${SAMPLE}/ForBiggerBlazes.mp4`,
      about:
        'A six-part Afrofuturist short film. Non-members can watch a free preview clip. This sample clip stands in for the full film.',
    },
  },

  s16: {
    chapters: null,
    gallery: null,
    video: {
      uri: `${SAMPLE}/ForBiggerFun.mp4`,
      previewUri: null,
      about:
        'A comedy cooking show filmed aboard a failing space station. This sample clip stands in for the full series.',
    },
  },
};

// Phase 10: every sample written chapter is a full-length read (5,000+ words). The full
// texts live in src/data/chapters/ (one module per story). The short drafts above remain
// only as the fallback for any story without a long-form file.
Object.keys(longChapters).forEach((storyId) => {
  if (content[storyId]) content[storyId].chapters = longChapters[storyId];
});
