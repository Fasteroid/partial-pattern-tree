import test from "node:test";
import { PartialPatternTree, SequenceValuePair } from "../src";


test("claude - no early return on has", (ctx) => {

    const items: SequenceValuePair<string>[] = [
        [["ab"], "ab"],
        [["cd"], "cd"],  // completely different branch
    ];

    const tree = new PartialPatternTree<string>(items);
    tree.optimize();

    if( !tree.has("cd") ) throw new Error(`tree.has returned early`);

})