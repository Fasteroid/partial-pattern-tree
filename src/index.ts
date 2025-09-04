import { AutoCollisionMap, AutoMap } from "@fasteroid/maps";

export namespace PartialPatternTree {
    export type Token = RegExp | string;
    export type Sequence = Token[];
}

type Token    = PartialPatternTree.Token;
type Sequence = PartialPatternTree.Sequence;


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

    /** Merges a sequence into to the tree. */
    public addSequence(sequence: Sequence, value: T, skipped = 0){
        if( sequence.length === 0 ) {
            this.values.set( value, Math.min( this.values.get(value) ?? Infinity, skipped ) )
            return;
        }

        const first = sequence[0];
        const rest  = sequence.slice(1);

        const victim = this.branches.get(first)
        victim.addSequence(rest, value, skipped);
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

    /** Coalesces nodes that don't branch. */
    public optimize(){
        for( let [x, rest] of this.branches.entries() ) {

            rest.optimize();

            if( typeof x !== 'string' ) continue;

            if( rest.branches.size === 1 ) {
            if( rest.branches.size === 1 && rest.values.size === 0 ) {

                const [y, child] = rest.branches.entries().next().value!
                if( typeof y !== 'string' ) continue;

                this.branches.delete(x);
                this.branches.set(x + y, child)
            }

        }
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

    protected readonly root      = new Node<T>();
    protected          optimized = false;

    constructor( pairs?: SequenceValuePair<T>[] ){
        if( pairs )
            this.addSequences(pairs);
    }

    /** The inner workings of {@linkcode addSequence}, without the check for if the tree is optimized. */
    protected _addSequence( pair: SequenceValuePair<T> ){
        const expanded = expandSequence(pair[0]);
        for (let i = 0; i < expanded.length; i++) {
            this.root.addSequence( expanded.slice(i), pair[1], i )
        }
    }

    /** 
     * Adds a sequence to the tree, provided it has not yet been {@link optimize | optimized}.
     * @throws if the tree has been optimized
     */
    public addSequence( pair: SequenceValuePair<T> ){
        if( this.optimized ) throw new Error("This PartialPatternTree has been optimized and is no-longer accepting new sequences.");
        this._addSequence(pair);
    }

    /** 
     * Adds mulitple sequences to the tree, provided it has not yet been {@link optimize | optimized}.
     * @throws if the tree has been optimized
     */
    public addSequences( pairs: SequenceValuePair<T>[] ) {
        if( this.optimized ) throw new Error("This PartialPatternTree has been optimized and is no-longer accepting new sequences.");
        for( let pair of pairs ){
            this._addSequence(pair);
        }
    }

    /** 
     * Optimizes the tree by collapsing nodes that don't branch.
     * #### Trade-off: after calling this the tree becomes read-only!
     */
    public optimize(){
        if( this.optimized ) throw new Error("Already optimized.");
        this.root.optimize();
        this.optimized = true;
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
     * @internal
     * **Do not use this in production, as the structure may change even between patch versions of this package!**
     */
    public summarize() {
        return this.root.summarize();
    }

}