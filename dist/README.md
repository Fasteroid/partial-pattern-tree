# @fasteroid/partial-pattern-tree

*&ldquo;Not quite partial regex matching, but pretty darn close!&rdquo;*<br>

## Premise
Say you want to assign "names" to a series of values and then search for them.

The "best" result—since users are creative and unpredictable—is to look for partial matches. &nbsp;This is really easy if your "names" are just unchanging string literals (just see if they contain the search query), but becomes an absolute head-scratcher when you decide you want to name your list entry `Order ID\d+` where `\d+` is *any* sequence of digits.

And no, you *can't* just naively regex this either, because doing that forfeits partial matching. &nbsp;"Order" (or just "der" if your user is a lunatic) doesn't match `Order ID\d+`, so the option won't show up 😭

So are you just cooked, or is there a way? &nbsp;Fear not, as this package (kind of) solves your problem!

## Usage
```ts
import { PartialPatternTree } from "@fasteroid/partial-pattern-tree"

type Pet = {
  importance: string,
  name: string
}

const tree = new PartialPatternTree<Pet>(
    [
        ["parake", /^e+/m, "t"], // this "name" matches parakeet, parakeeet, parakeeeee... you get the idea.
        {
            name: "Newton"
            importance: "actually ate my homework once (not kidding)"
        }
    ],
    [
        ["parrot"], // this name just looks for "parrot"
        {
            name: "Polly"
            importance: "has a crippling cracker addiction"
        }
    ]
)

tree.search("keeeeeeeeeee"); // returns an array containing Newton
```

## But what if..?
- Q: I want to order the search results based on relevance and I want it to not be complete garbage!
  - A: First of all that's not a question—but yes it does do that. &nbsp;The metric I chose is "how many characters into the name must we skip to find the search query?"
- Q: This is literally just a generalized suffix tree with extra steps!
  - Also not a question. &nbsp;But good observation!
- Q: If this is a suffix tree why aren't you constructing it with Ukkonen's algorithm?
  - A: I'm an idiot 🤡 &nbsp;<br>...but if you know how, I'd love if you [made a pull request](https://github.com/Fasteroid/partial-pattern-tree/pulls)!
- Q: Why is this README so GOOFY?
  - A: To make you smile!  Duh!!!

## License

MIT License
