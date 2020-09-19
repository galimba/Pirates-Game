var express = require('express'); // Express contains some boilerplate to for routing and such
var app = express();
var http = require('http').Server(app);
// var io = require('socket.io')(http); // Here's where we include socket.io as a node module 
var io = require('socket.io').listen(http);
const https = require('https');

// Serve the index page 
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html'); 
});

// Serve the icon
app.get("/favicon.ico", function (request, response) {
  response.sendFile(__dirname + '/favicon.ico'); 
});


// Serve the assets directory
app.use('/assets',express.static('assets'))
app.use('/assets/sound',express.static('/sound'))
// load css and js folders
app.use('/js',express.static(__dirname + '/js'));
app.use('/css',express.static(__dirname + '/css'));

// Listen on port 8000
app.set('port', (process.env.PORT || 5000));
http.listen(app.get('port'), function(){
  console.log('listening on port',app.get('port'));
  //https.get('https://table-scrapper.herokuapp.com/');
});

// Hit the simple bot "server"
// app.listen(process.env.PORT || 8000);


var players = {}; //Keeps a table of all players, the key is the socket id
var bullet_array = []; // Keeps track of all the bullets to update them on the server 
// Tell Socket.io to start accepting connections

var spawnObjectsAllowed = false; // check if the server is allowed to spawn health packs and driftwood
var maxHealthPacks = 5;	//there will up to 5 health packs scattered across the map at any given time
var numHealthPacks = 0;	// number of health packs current on the server
var healthPack_array = [];

var maxDriftWood = 15;	//there will only be 15 drift wood (obstacles) scattered across the map at any given time
var numDriftWood = 0; // number of drift wood in the server
var driftWood_array = [];

var WORLD_SIZE = {w:1500,h:1000}; //same as the client-side world size

io.on('connection', function(socket){
  // Listen for a new player trying to connect
  socket.on('new-player',function(state){
    console.log("New player joined with state:",state);
    players[socket.id] = state;
    // Broadcast a signal to everyone containing the updated players list
    io.emit('update-players',players);
    spawnObjectsAllowed = true; // now that a player has connected, allow the server to spawn healthpacks
  })
  
  // Listen for a disconnection and update our player table 
  socket.on('disconnect',function(state){
    delete players[socket.id];
	  console.log("Player disconnected with state: ",state);
    io.emit('update-players',players);
  }) 
  
  // Listen for move events and tell all other clients that something has moved 
  socket.on('move-player',function(position_data){
    if(players[socket.id] == undefined) return; // Happens if the server restarts and a client is still connected 
    players[socket.id].x = position_data.x;  
    players[socket.id].y = position_data.y; 
    players[socket.id].angle = position_data.angle; 
	  players[socket.id].health = position_data.health; // change sprites based on health
    io.emit('update-players',players);
  })
 
  // Listen for shoot-bullet events and add it to our bullet array
  socket.on('shoot-bullet',function(data){
    if(players[socket.id] == undefined) return;
    var new_bullet = data;
    data.owner_id = socket.id; // Attach id of the player to the bullet 
    if(Math.abs(data.speed_x) > 20 || Math.abs(data.speed_y) > 20){
      // console.log("Player",socket.id,"is cheating!");
    }
    bullet_array.push(new_bullet);
  });
})

// Update the bullets 60 times per frame and send updates 
function ServerGameLoop(){
  for(var i=0;i<bullet_array.length;i++){
    var bullet = bullet_array[i];
    bullet.x += bullet.speed_x; 
    bullet.y += bullet.speed_y; 
    
    // Check if this bullet is close enough to hit any player 
    for(var id in players){
      if(bullet.owner_id != id){
        // And your own bullet shouldn't kill you
        var dx = players[id].x - bullet.x; 
        var dy = players[id].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 70){
          io.emit('player-hit',id); // Tell everyone this player got hit
		  console.log("Player: [" + id + "], hit by bullet \n" + players[id]);
        }
      }
	  // Check if a player is colliding with another player
    }

	// check if a bullet collides with a heart if so destroy it
	for(var j=0;j<healthPack_array.length;j++){
        var dx = healthPack_array[j].x - bullet.x; 
        var dy = healthPack_array[j].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 40){
          //io.emit('player-hit',id); // Tell everyone this player got hit
		  healthPack_array.splice(j,1);
		  j--;
		  console.log('Heart number [' + j + '] destroyed by bullet');
		  numHealthPacks--;
        }
	}
	// Check if a bullet is colliding with driftwood
	for(var j=0;j<driftWood_array.length;j++){
        // And your own bullet shouldn't kill you
        var dx = driftWood_array[j].x - bullet.x; 
        var dy = driftWood_array[j].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 40){
          //io.emit('player-hit',id); // Tell everyone this player got hit
		  driftWood_array.splice(j,1);
		  j--;
		  console.log('DriftWood number [' + j + '] destroyed by bullet [' + i + ']');
		  numDriftWood--;
        }
	}
    
	// consider allowing the player to destroy driftwood, maybe if this doesn't take too long
	
    // Remove the bullet if goes too far off screen 
    if(bullet.x < -10 || bullet.x > 1500 || bullet.y < -10 || bullet.y > 1000){
        bullet_array.splice(i,1);
		console.log('Bullet [' + i + '] destroyed because it went offscreen (' + bullet.x + ',' + bullet.y + ')' );
        i--;
    }
  }
  
  // check if players collide with hearts
  for(var i=0;i<healthPack_array.length;i++){
    var healthPack = healthPack_array[i];
    healthPack.x += healthPack.speed_x; 
    healthPack.y += healthPack.speed_y; 
    
    // Check if this bullet is close enough to hit any player 
	// consider spawning "dead" ships that are shipwrecked later.
    for(var id in players){
        // And your own bullet shouldn't kill you
        var dx = players[id].x - healthPack.x; 
        var dy = players[id].y - healthPack.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
		// adjust distance based on what will be the final distance between player and ships
        if(dist < 40){
          //io.emit('player-hit',id); // Tell everyone this player got hit
          console.log('Collision between player[' + id + '], healthPack[' + i + ']')
          healthPack_array.splice(i,1);
          i--;
          numHealthPacks--;
          // inform player that health is restored
          io.emit('player-heal',id); // Tell everyone this player got hit
        }
	  // Check if a player is colliding with another player
    }
    
    // Remove if it goes too far off screen
    if(healthPack.x < -10 || healthPack.x > 1500 || healthPack.y < -10 || healthPack.y > 1000){
        healthPack_array.splice(i,1);
		console.log('HealthPack(' + i + ') destroyed, out of bounds. (' + healthPack.x + ',' + healthPack.y + ')' );
        i--;
		numHealthPacks--;
    }
        
  }
  
  // update the driftwood locations on the server 
  for(var i=0;i<driftWood_array.length;i++){
    var driftWood = driftWood_array[i];
    driftWood.x += driftWood.speed_x; 
    driftWood.y += driftWood.speed_y; 
	  driftWood.rotation += driftWood.rotateDirection*Math.PI / 200;
  	if(driftWood.rotation > 2*Math.PI) {
	  	driftWood.rotation = 0;
  	}
	  //console.log(driftWood.rotation)
	  // Remove the driftwood if goes too far off screen 
    if(driftWood.x < -10 || driftWood.x > 1500 || driftWood.y < -10 || driftWood.y > 1000){
		  numDriftWood--;
      driftWood_array.splice(i,1);
		  console.log('driftWood(' + i + ') destroyed, out of bounds. (' + driftWood.x + ',' + driftWood.y + ')' );
      i--;
    }
  }
  // Tell everyone where the driftwood is:
  io.emit("driftWood-update",driftWood_array);
  // Tell everyone where all the health packs are by sending the whole array
  io.emit("healthPack-update",healthPack_array);
  // Tell everyone where all the bullets are by sending the whole array
  io.emit("bullets-update",bullet_array);
}

// spawn hearts that restore 10 hp when player collides
function spawnHealthPacks(){
  // Spawn Health Packs for players
  if (numHealthPacks < maxHealthPacks && spawnObjectsAllowed == true) {
	  // spawn health pack
	  var plusOrMinusx = Math.random() < 0.5 ? -1 : 1;
	  var plusOrMinusy = Math.random() < 0.5 ? -1 : 1;
	  var new_healthPack = {x:Math.random() * 0.75*WORLD_SIZE.w+50,y:Math.random()*0.75*WORLD_SIZE.h+25,speed_x:Math.random()*0.5*plusOrMinusx,speed_y:Math.random()*0.5*plusOrMinusy};
	  healthPack_array.push(new_healthPack);
	  numHealthPacks++;
	  console.log('Spawning Health Pack (' + new_healthPack.x + ',' + new_healthPack.y +')' + numHealthPacks);
  }
}

function spawnDriftWood(){
  // Spawn DriftWood as obstacles players
  if (numDriftWood < maxDriftWood && spawnObjectsAllowed == true) {
	  // spawn health pack
	  var plusOrMinusx = Math.random() < 0.5 ? -1 : 1;
	  var plusOrMinusy = Math.random() < 0.5 ? -1 : 1;
	  var rotateDir = Math.random() < 0.5 ? -1 : 1;
	  var new_driftWood = {x:Math.random() * 0.75*WORLD_SIZE.w+50,y:Math.random()*0.75*WORLD_SIZE.h+25,speed_x:Math.random()*0.5*plusOrMinusx,speed_y:Math.random()*0.5*plusOrMinusy,rotation:Math.random()*2*Math.PI,rotateDirection:rotateDir};
	  driftWood_array.push(new_driftWood);
	  numDriftWood++;
	  
	  console.log('Spawning DriftWood (' + new_driftWood.x + ',' + new_driftWood.y +')' + new_driftWood.rotation);
  }
}

// spawn health packs every 3 seconds
setInterval(spawnDriftWood, 3000); 

// spawn health packs every 5 seconds
setInterval(spawnHealthPacks, 5000); 
// 0.064 seconds update
setInterval(ServerGameLoop, 16); 

// spawn bots
 setInterval(() => {
		//https.get('https://table-scrapper.herokuapp.com/');
		console.log('Attempting to ping other server');
	}, 25000); // spawn ships every 25 seconds
