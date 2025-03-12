https://github.com/user-attachments/assets/16a13b7f-ff18-4c82-a1a3-32f4c169dead

# Yet another chess game 

This is a very primitive chess server that allows for players to create and join games against other players. It started as simple local React chess game that I started after going through React's official Tic-Tac-Toe to learn more about frontend developpement.   

I decided to go a bit further to get to know some more technologies, namely, Typescript, websockets (Socket.io), Docker, and other server tools (Cloudflare, Nginx, Let's Encrypt (certbot)).

## Installation
### Docker
```bash
docker run -d --rm -p 8080:8080 --name chess msanlop/chess-ts 
```
#### From `Dockerfile`
```bash
git clone git@github.com:msanlop/chess.git
cd chess
docker build -t ts-chess .
docker run -d --rm -p 8080:8080 --name chess ts-chess
```
<!-- 
To build a docker dev environement one could comment out the second build step.
```bash
git clone git@github.com:msanlop/chess.git
cd chess
# comment out the final build step in the Dockerfile
docker build -t ts-chess .
docker run -d -p 8080:8080 --name chess ts-chess

```
I haven't tested this... Maybe you have to mount the code in a volume, and also install git and other stuff, idk -->


### Without docker
Change default port `8080` in `server/src/index.ts`
```bash
git clone git@github.com:msanlop/chess.git
cd chess
cd client
npm install
npm run build
cd ../server
npm install
npm start
```

## Description

Since this started as some quick test to practice React, that's what I used to do the chess board. In hindsight I now see how overcomplicated this makes things, not that it matters much because the goal was to use React but obviously canvas is more appropriate. 

My chess library is also very badly thought out and the game logic code is tightly coupled with the game server code which is really bad... To do this properly I would use an actual good chess library, or redo mine using a objects to better encapsulate the game's state instead of passing around objects (I was doing C at the time and I also thought classes wheren't really used in js).

## Features missing

There is no en passant :( among other rules, I did the most basic chess rule set to be able to play and test the UI.


