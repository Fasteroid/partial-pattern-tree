import test from "node:test";
import { PartialPatternTree, SequenceValuePair } from "../src";

type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type CartesianTuple<SOURCES extends readonly (readonly unknown[])[]> = {  [K in keyof SOURCES]: ElementOf<SOURCES[K]> };
export function cartesianProduct<const EACH extends readonly (readonly unknown[])[]>(...sources: EACH): Generator< CartesianTuple<EACH> > {
    function* combine(index: number): Generator<any> {
        if (index >= sources.length) {
            yield [...soFar];
            return;
        }
        for (const item of sources[index]) {
            soFar.push(item);
            yield* combine(index + 1);
            soFar.pop();
        }
    }
    const soFar: unknown[] = [];

    return combine(0);
}


test("big cartesian product", (ctx) => {

    const hell: SequenceValuePair<string>[] = [];

    const tree = new PartialPatternTree<string>()

    for( 
        let [
            action, 
            what, 
            when
        ] 
        of 
        cartesianProduct(
            ['do', 'do not', 'never', 'always'],
            ['the cat', 'the dog', 'code', 'optimize'],
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        ) 
    ) {
        tree.addSequence( [
            [action, ' ', what, ' on ', when],
            ""
        ])
    }

    tree.optimize();

    console.log( JSON.stringify( tree.summarize(), undefined, 2 ) )

})