import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { SocketContext } from "../SocketProvider";

//creates and returns a socket with the given token (for debug purposes) TODO: update
export const useSocket = (token ?: string) => {
    const socket = useContext(SocketContext)

    //for testing use without server token and 'auth'
    // useEffect( () => {
    //   if(token !== undefined && (token.endsWith('w') || token.endsWith('b'))){
    //     socket.io.opts.query = {token : token}
    //     if(!socket.connected) {
    //       socket.io.opts.autoConnect = true
    //       socket.connect()
    //     }
    //   }

    // }, [token])
    
    return socket
}
