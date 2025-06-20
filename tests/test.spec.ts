import test from "node:test";
import { PartialPatternTree } from "../src/index"
import { writeFileSync } from "fs";

const tree = new PartialPatternTree<string>(
    [["parake",/^e+/m,"t"], "parakeet"],
    [["parrot"], "parrot"],
    [["shiba inu"], "doge"],
    [["bordercollie"], "dog"],
    [["shepard"], "dog"],
    [[/^[bdgz]/m, "ingus"], "bingus"],
    [["skrunkly"], "cat"]
)

test("zingus", () => {
    const zingus = tree.search("zin");
    if( zingus[0] !== "bingus" ){
        throw "couldn't find the bingus 😭"
    }
});

test("parakeet", () => {
    const parakeet = tree.search("parakeeeeeeeeeeeeeeeeet");
    if( parakeet[0] !== "parakeet" ){
        throw "no parakeet 😭"
    }
});

test("pennsylvania", () => {
    const pennsylvania = tree.search("pa");
    let errors: string[] = [];

    if( !pennsylvania.includes("parakeet") ){
        errors.push("pennsylvania didn't have parakeet");
    }
    if( !pennsylvania.includes("parrot") ){
        errors.push("pennsylvania didn't have parrot");
    }
    if( pennsylvania.indexOf("dog") !== 2 ){
        errors.push("pennsylvania didn't have dog at index 2");
    }

    if( errors.length > 0 ){
        throw new Error(`Errors in pennsylvania: ${errors}\n(actual order was [${pennsylvania}])`);
    }
});

test("parrot", () => {
    const parrot = tree.search("parrot");
    if( parrot[0] !== "parrot" ){
        throw "no parrot 😭"
    }
});

test("indium", () => {
    const indium = tree.search("in");
    let errors: string[] = [];
    
    if( indium[0] !== "bingus" ){
        errors.push("bINgus???");
    }

    if( indium[1] !== "doge" ){
        errors.push("shiba INu???");
    }

    if( errors.length > 0 ){
        throw new Error(`Errors in indium: ${errors}`);
    }
});

test("pirate", () => {
    const pirate = tree.search("r");
    let errors: string[] = [];

    if( !pirate.includes("parakeet") ){
        errors.push("pirate didn't have parakeet");
    }

    if( !pirate.includes("parrot") ){
        errors.push("pirate didn't have parrot");
    }

    if( !pirate.includes("cat") ){
        errors.push("pirate didn't have cat");
    }

    if( pirate.indexOf("dog") !== 3 ){
        errors.push("pirate didn't have dog at index 3");
    }

    if( errors.length > 0 ){
        throw new Error(`ARRRGG 🏴‍☠️ ❌: ${errors}\n(actual order was [${pirate}])`);
    }
});




