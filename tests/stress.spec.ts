import test from "node:test";
import { PartialPatternTree, SequenceValuePair } from "../src";
import { AutoMap } from "@fasteroid/maps";
import { writeFileSync } from "fs";


const ops = {
    '-': (a: number, b: number) => a - b,
    '+': (a: number, b: number) => a + b,
    '*': (a: number, b: number) => a * b,
    '/': (a: number, b: number) => a / b
}

test("stress", (ctx) => {

    const hell: SequenceValuePair<string>[] = [];

    const t0 = performance.now();
    for( let op of Object.values(ops) ){ 
        for (let x = 0; x < 200; x++) {
            for (let y = 0; y < 200; y++) {
                hell.push( [[`${x} ${op.name} ${y} =`], op(x,y) + ""] )
            }
        }
    }

    console.log(`tree entries built in ${performance.now() - t0}ms (${hell.length})`)

    const t1 = performance.now();
    const tree = new PartialPatternTree<string>()
    for( let pair of hell ){
        tree.addSequence(pair);
    }
    console.log(`tree itself built in ${performance.now() - t1}ms`)

})