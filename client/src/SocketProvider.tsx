import { createContext } from "react";
import { io } from "socket.io-client";

export const RECONNECTION_ATTEMPTS = 3;
export const RECONNECTION_DELAY = 1000;

const PLAYER_ID_TOKEN = document.cookie.substring("token=".length) ?? 'tokenw' //TODO: remove default
// const PLAYER_ID_TOKEN = localStorage.getItem('token') ?? 'tokenw' //TODO: remove default

const pathnameArr = window.location.pathname.split("/")
const GAME_ID = pathnameArr[pathnameArr.length - 1]

const serverUrl = window.location.origin
const socket = io(serverUrl, {
    autoConnect: false,
    query: {
    token : PLAYER_ID_TOKEN,
    gameId : GAME_ID,
    },
    reconnectionAttempts : RECONNECTION_ATTEMPTS,
    reconnectionDelay : RECONNECTION_DELAY
})
export const SocketContext = createContext(socket)

//inspired from https://thenable.io/building-a-use-socket-hook-in-react
export const SocketProvider = (props : any) => {
    
    return (
        <SocketContext.Provider value={socket}>
            {props.children}
        </SocketContext.Provider>
    )
}