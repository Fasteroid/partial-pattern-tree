import { AutoCollisionMap, AutoMap } from "@fasteroid/maps";


type Token = RegExp | string;

type Sequence = Token[];

type Distance = {
    
}

/** 
 * Given a query and a token, removes the partial match of the token from the query and returns it, or `undefined` if no match. 
 */
function consume(token: Token, query: string): string | undefined {
    if(query.length === 0){ return "" }

    if( token instanceof RegExp ){
        const match = token.exec(query)
        if( !match ) return undefined;
        else return query.slice(match[0].length)
    }
    else {
        const subject = query.slice(0, token.length)
        if( token.startsWith(subject) ) return query.slice(token.length)
        else return undefined
    }
}

/** 
 * Expands strings in a sequence.
 * ```ts
 * const expanded = expandSequence(["abc", /\d\d\d/]); 
 * => ["a","b","c",/\d\d\d/];
 * ```
 */
function expandSequence(sequence: Sequence){
    return (
        sequence.map( (token): Sequence =>
            typeof token === 'string' ? [...token] : 
            token.source.startsWith("^") ? [token] : (() => {throw new TypeError("Regex tokens must start with '^'")})()
        )
        .flatMap( all => all )
    );
}


class Node<T> {

    /** Sub-nodes organized by next token(s) */
    private readonly branches = new AutoCollisionMap<Token, Node<T>>( 
        (key) => {
            if( typeof key === 'string' ) return key;
            if( key instanceof RegExp ) return key.source;
            throw new Error("Invalid token type in tree: " + typeof key);
        },
        () => {
            return new Node<T>()
        }
    );

    /** A set of values on this branch, associated with how many tokens deep at minimum we skipped to get to each. */
    private readonly values = new Map<T, number>();

    /** Adds a sequence to the tree.  Make sure to {@link expandSequence | expand} it first! */
    public addSequence(sequence: Sequence, value: T, depth = 0){
        if( sequence.length === 0 ) {
            this.values.set(value, depth); // assume we didn't skip any tokens to get here
            return;
        }

        const first = sequence[0];
        const rest  = sequence.slice(1);

        const victim = this.branches.get(first)
        const length = typeof first === 'string' ? first.length : 1
        victim.addSequence(rest, value, depth + length);
    }

    /** Merges another node into this one. */
    private apply(that: Node<T>, levels: number){

        for( let [k, thatCost] of that.values ){
            const thisCost = this.values.get(k) ?? Infinity;
            this.values.set(k, Math.min(thatCost + levels, thisCost));
        }

        for( let [token, branch] of [...that.branches] ){
            this.branches.get( token ).apply( branch, levels );
        }

    }

    /** Pulls all sub-nodes up to the destination so they can be accessed from it. */
    public hoist(destination: Node<T> = this, levels = 1){
        for( let [_, branch] of [...this.branches] ){
            destination.apply(branch, levels);
            branch.hoist(destination, levels + 1);
        }
    }

    /** Coalesces nodes that don't branch. */
    public optimize(){
        for( let [x, rest] of this.branches.entries() ) {

            rest.optimize();

            if( typeof x !== 'string' ) continue;

            if( rest.branches.size === 1 && rest.values.size === 0 ) {

                const [y, child] = [...rest.branches.entries()][0]
                if( typeof y !== 'string' ) continue;

                this.branches.delete(x);
                this.branches.set(x + y, child)
            }
            
        }
    }
    /**
     * Checks if a query matches anything in this Node
     */
    public has(query: string): boolean {
        for( let [token, branch] of this.branches.entries() ){
            const nextQuery = consume(token, query);
            if( nextQuery === undefined ) continue;
            if( nextQuery.length === 0 ) return true;

            return branch.has(nextQuery);
        }

        return false; // if all else fails
    }


    private _search( 
        query: string, 
        ret = new AutoMap<T, number>( () => Infinity ), matched = "", recursion = 0 
    ): Map< T, number > {

        for( let [token, branch] of this.branches.entries() ){
            const nextQuery = consume(token, query);

            let fail = false;

            if( nextQuery === undefined ) fail = true;

            // console.log(`${fail ? "❌" : "🟢"}${"    ".repeat(recursion)} |`, `"${matched}" + "${token}",`)
            // console.log(`  ${"    ".repeat(recursion)} |`, [...branch.values].map( ([k,v]) => `(${k}, ${v})` ).join(', '))

            if( fail ) continue;

            branch._search(nextQuery!, ret, matched + token, recursion + 1);
            
            // make sure there's nothing left-over
            if( nextQuery === '' )
                for( let [k, v] of branch.values ){
                    if( ret.get(k) > v ) // new best ranking
                        ret.set(k, v)
                }
        }

        return ret
    }

    /**
     * Queries this node for applicable entries, sorted by how well they match.
     */
    public search(query: string){
        return [...this._search(query).entries()]
            .sort( (kv0, kv1) => kv0[1] - kv1[1] )
            .map( kv => kv[0] )
    }

    public summarize(): object {
        return {
            values: [...this.values.entries()],
            branches: Object.fromEntries( this.branches.entries().map( kv => [kv[0].toString(), kv[1].summarize()] ) )
        }
    }

}

/**
 * Pairs up a {@linkcode Sequence} with a value.
 * 
 * A {@link Sequence | sequence} is defined as a list of {@link Token | tokens}, which are strings and/or regexes.
 * #### String Tokens
 * - These are matched character for character exactly as-is.
 * - It is case-sensitive.
 * #### Regex Tokens
 * - *Must* begin with a "start of text" anchor: `^`
 * - Should be as "atomic" as possible (ie. instead of `/^\d{3}/`, use the token `/^\d/` 3 times in a row)
 */
export type SequenceValuePair<T> = [Sequence, T]

/**
 * A tree-like structure designed for quick pattern matching and searching.
 */
export class PartialPatternTree<T> {

    private readonly root: Node<T>;

    constructor( ...pairs: SequenceValuePair<T>[] ){
        this.root = new Node<T>();
        for( let pair of pairs ){
            this.root.addSequence( expandSequence(pair[0]), pair[1] )
        }
        this.root.hoist();
        this.root.optimize();
    }

    /**
     * Quickly determines if there are any branches that might result in a match for this query.
     */
    public has(query: string){
        return this.root.has(query);
    }

    /**
     * Gets all distinct values where `query` is a subsequence of the value's associated {@link Sequence | sequence}.
     * - Order of returned values is determined by the depth of the shallowest matched subsequence.
     * - Given query `cd` for instance, a value described by `cdef` will come before one described by both `abcdef` and `qcdef`.
     */
    public search(query: string){
        return this.root.search(query);
    }

    /** 
     * Returns a representation of the tree compatible with {@linkcode JSON.stringify} for debugging and research purposes.  
     * 
     * **Do not use this in production, as the structure may change even between patch versions of this package!**
     */
    public summarize() {
        return this.root.summarize();
    }

}