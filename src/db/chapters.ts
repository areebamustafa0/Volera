/**
 * Original public-domain-style prose written for Velora's demo catalog.
 * Each digital title gets genuine, readable chapters served through the
 * entitlement-gated reader and download pipeline.
 */

export interface SeedChapter {
  title: string;
  content: string;
}

const p = (...paras: string[]) => paras.join("\n\n");

export const CHAPTER_LIBRARY: Record<string, SeedChapter[]> = {
  default: [
    {
      title: "The Weight of a Door",
      content: p(
        "There is a particular silence that belongs only to libraries after closing, and Nora had come to know it the way sailors know weather. It was not the absence of sound but the presence of everything unsaid — a thousand held breaths pressed between covers, waiting.",
        "She had arrived without deciding to. That was the strange part. One moment the rain had been drumming its impatient fingers on the pavement outside the chemist's, and the next she was standing between two shelves that ran on further than the building could possibly allow.",
        "The books had no titles. She noticed that first. Their spines were the deep green of a pond in summer, and where the lettering should have been there was only a faint impression, as though the words had been pressed in and then thought better of.",
        "\"You may open any of them,\" said a voice behind her. \"That is rather the point.\"",
        "Nora turned. The woman standing there wore the sensible cardigan of every school librarian who had ever told her to lower her voice, and she was holding a cup of tea that steamed in a room with no discernible temperature.",
        "\"Where am I?\"",
        "\"Between,\" the woman said, as if this were an address. \"Which is a place most people pass through so quickly they never notice the architecture.\""
      ),
    },
    {
      title: "Shelves of Possible Lives",
      content: p(
        "The first book she opened showed her a kitchen in a city she had never visited, and a version of herself standing at the window with flour on her hands and someone laughing in the next room. The laugh belonged to a person she had not met, and she missed them immediately, which seemed unfair.",
        "\"Every volume is a life you might have chosen,\" the librarian said. \"Not a better one. Simply another.\"",
        "\"And if I like one?\"",
        "\"Then you stay in it, and it becomes ordinary, and one afternoon you will find yourself standing in some other rain, wondering about the lives you did not take. That is not a warning. It is only the arithmetic of being a person.\"",
        "Nora closed the book more gently than she had opened it. The shelves went up and up, and somewhere far above her, out of sight, she thought she could hear pages turning of their own accord.",
        "She walked for what might have been an hour. Time in the library was less a river than a room you could pace. She opened a life where she had stayed in the coastal town and one where she had left it at seventeen and never written home. She opened a life where she had answered the phone the night it rang and rang.",
        "That one she closed very quickly indeed."
      ),
    },
    {
      title: "The Book of You",
      content: p(
        "\"There is one more,\" the librarian said, near what Nora had begun to think of as evening, though the light had never changed. \"It is the only book here nobody enjoys finding.\"",
        "It was thinner than the others, and its spine had been broken and mended so many times that it opened flat without being asked. The pages were dense with small corrections, whole paragraphs struck through and rewritten in a hand she recognised as her own.",
        "\"My life,\" Nora said.",
        "\"The one you actually have. Yes. Readers always assume it will be the dullest volume in the building.\"",
        "She read the first page. It contained a Tuesday she had entirely forgotten: a bus, a stranger who had given up a seat, a sky the colour of weak tea. It was unremarkable in every measurable way, and reading it made her chest ache with a tenderness she had no name for.",
        "\"Why does this one hurt more than the others?\"",
        "\"Because it is the only one that is still being written,\" the librarian said, and set down her tea for the first time. \"The others are finished. Finished things are safe. This one can still surprise you, which means it can still disappoint you. Most people would trade that away if you let them.\"",
        "Nora looked at the unfilled pages at the back — dozens of them, hundreds, blank and patient and faintly ruled."
      ),
    },
    {
      title: "What the Rain Decided",
      content: p(
        "She did not remember choosing to leave, any more than she remembered arriving. There was a door, and the door had the particular scuffed brass handle of the chemist's on Wexford Street, and beyond it the rain was still going, which surprised her. She had assumed years had passed.",
        "Four minutes had passed.",
        "The stranger under the awning beside her shook out an umbrella and offered, without looking up, to share it as far as the corner. In a hundred thousand volumes stacked in a building that did not exist, Nora had watched herself say no to smaller things than this.",
        "\"Yes,\" she said. \"Thank you. The corner would be lovely.\"",
        "It was not a dramatic act. Nothing in the sky acknowledged it. But somewhere — in a room she would never find again, on a page still wet with ink — a sentence completed itself, and the next one began."
      ),
    },
    {
      title: "Afterward",
      content: p(
        "Years later she would tell this story exactly twice: once to a daughter who was too young to follow it and once to a friend who was too kind to argue. Both times she left out the librarian, because a woman with a cup of tea is either the least believable detail or the only one that matters, and she was never certain which.",
        "What she kept was smaller and harder to lose. On the difficult mornings — and there were many, because a life that can still surprise you can still ruin an afternoon — she would remember that her book was the unfinished one. That the blank pages were not an accusation.",
        "The shelves are still there, presumably. Somewhere between. Full of green-spined volumes nobody will ever read, each one a perfectly good life that had the misfortune of not being chosen.",
        "And in every single one of them, at some point, on some ordinary Tuesday, it begins to rain."
      ),
    },
  ],
};

/** Deterministically assigns chapter sets so every eBook has real content. */
export function chaptersForBook(slug: string, title: string): SeedChapter[] {
  const base = CHAPTER_LIBRARY[slug] ?? CHAPTER_LIBRARY.default;
  return base.map((c) => ({
    title: c.title,
    content: c.content.replace(/\{\{title\}\}/g, title),
  }));
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
