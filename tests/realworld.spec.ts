import test from "node:test";
import { PartialPatternTree, SequenceValuePair } from "../src/index"
import { writeFileSync } from "fs";

const TEST_PAIRS: SequenceValuePair<string>[] = [];

const IncludeExcludeVars = [
    {
        mode:       "include",
        aliases:    ["with"],
    },
    {
        mode:       "exclude",
        aliases:    ["not", "without"],
    }
] as const;


for( let vars of IncludeExcludeVars ){

    const id = vars.mode

    const base_pairs = [
        [["remnant ", /^\d+$/m], id],
        [["remnant id ", /^\d+$/m], id],
        [["mi", /^\d+$/m], id],
        [[" ", /^\d+$/m], id]
    ] as const;

    for( let alias of [vars.mode, ...vars.aliases] ){
        for( let pair of base_pairs ){
            // replace alias placeholders with the actual aliases
            const actual: SequenceValuePair<string> = [[alias, " ", ...pair[0]], pair[1]]
            TEST_PAIRS.push( actual );
        }
    }

    if( vars.mode === "include" ){ // include is the default, so add all of its normal sequences without "include" prefixed
        for( let pair of base_pairs ){
            TEST_PAIRS.push( pair as any );
        }
    }


}

const tree = new PartialPatternTree<string>(TEST_PAIRS)

test("real world", () => {
    const remnant = tree.search("mi");
    if( remnant[0] !== "include" ){
        throw "include should be first!"
    }
});


