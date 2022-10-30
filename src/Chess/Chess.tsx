

const starterPositionSerialized = 
`br:bk:bb:bq:bk:bb:bk:br:\
bp:bp:bp:bp:bp:bp:bp:bp:\
::::::::\
::::::::\
::::::::\
::::::::\
wp:wp:wp:wp:wp:wp:wp:wp:\
wr:wk:wb:wq:wk:wb:wk:wr`


const deserialize = (pos : string) => {
    return pos.split(":").map(p => {
        if(p.length === 0) {return null}
        return {piece:p[1], color: p[0]}
    })
}

const starterPosition : ({piece: string, color: string} | null)[] = deserialize(starterPositionSerialized)


const isGameFinished = () => {
    return false
}



export {isGameFinished, starterPosition}