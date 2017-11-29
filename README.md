# Pirates-Game

CENG 356 Simple Networked Game --- an simple game that implementation of a client-server architecture.

This project contains the code for the multiplayer game based on tutorials/online resources with Socket.io and Phaser. 

## Installation

This game uses the package manager for node.js, npm to install the dependencies listed in package.json.

### Requirements 
* Node.js (https://nodejs.org/en/)
* Modern Web Browser (Chrome, Firefox)

To run it:
* Download or clone the repository 
* Run 'npm install' inside
* Run 'node server' 
* Open up http://localhost:8000 in your browser
* Open up another window and play!

Controls are W or UP to move towards mouse and click to shoot.
![fileDirectory.png](docs\fileDirectory.png)

### Documentation

Socket.io relays messages from the client to the server and vice-versa. Information sent from the client-side (browser) include keyboard and mouse input, player collisions with other players, and spawning bullets.	

![ClientServer.png](docs\ClientServer.png)
Furthermore, in order for the player to interact with other players or game objects on the map, the client must communicate with the server. Whenever the player moves, shoots bullets and takes damage, the clients sends a message to the server and then updated information is sent to all the clients. In addition, the server periodically spawns obstacles in the game, and updates the positions of game objects.
![SeqDiagramReport.png](docs\SeqDiagramReport.png)

If falls below zero health during the game, they will be disconnected from the game. For example, if a low-health player is hit by a bullet, they will be discon-nected, removed from the game and the other clients will be updated.
![DisconnectedFromGame.png](docs\DisconnectedFromGame.png)



#### Other Notes 
The game is available online on heroku
https://piratesmulti.herokuapp.com/

This repository contains the finalish version of the code.

The music for this pirate game is taken from:
* LittleRobotSoundFactory on https://freesound.org https://freesound.org/people/LittleRobotSoundFactory/