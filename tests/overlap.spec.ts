import test from "node:test";
import { PartialPatternTree, SequenceValuePair } from "../src";


test("overlap bug", (ctx) => {

    const items: SequenceValuePair<string>[] = [
        [["ab"], "ab"],
        [["abc"], "abc"],
    ];

    const tree = new PartialPatternTree<string>(items);
    tree.optimize();

    const results = tree.search("ab");
    console.log(results);
    if( results.length < 2 ) throw new Error(`Missing entries: ${results.length} < 2`)

})