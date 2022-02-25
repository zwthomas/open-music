const { Client, Intents, VoiceRegion } = require('discord.js');
const { token } = require('./config.json');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
let baseLog = ""
let botID = "915010399424880680"

function log(message) {
  return new Date().toUTCString() + " | " + message;
}

async function playSong(url, interaction) {
  const songInfo = await ytdl.getInfo(url);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  connection = joinVoiceChannel({
    channelId: interaction.member.voice.channel.id,
    guildId: interaction.member.voice.channel.guild.id,
    adapterCreator: interaction.member.voice.channel.guild.voiceAdapterCreator,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
    connection.destroy();
  });

  const player = createAudioPlayer();
  const stream = ytdl(url, { filter: 'audioonly' });
  const resource = createAudioResource(stream);
  player.play(resource);
  connection.subscribe(player);
  serverPlayer[interaction.member.voice.channel.guild.id] = player
  if (!serverQueues[interaction.member.voice.channel.guild.id]) {
    serverQueues[interaction.member.voice.channel.guild.id] = []
  }
  console.log(log(baseLog + " | Queue Size: " + serverQueues[interaction.member.voice.channel.guild.id].length + " | Playing: " + url))
  player.on(AudioPlayerStatus.Idle, () => {
    let nextURL = serverQueues[interaction.member.voice.channel.guild.id].shift()
    if (!nextURL) {
      player.stop()
      let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
      connection.destroy()
      return
    }
    const stream = ytdl(nextURL, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    player.play(resource);
  });

  player.on('error', error => {
    console.log("error")
    let nextURL = serverQueues[interaction.member.voice.channel.guild.id].shift()
    if (!nextURL) {
      player.stop()
      let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
      if (connection) {
        connection.destroy()
      }
      return
    }
    console.log(nextURL)
    const stream = ytdl(nextURL, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    player.play(resource);
  });
}

// Create a new client instance
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_VOICE_STATES
] });

const serverQueues = {}
const serverPlayer = {}

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log(log('Ready!'));
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
  await interaction.reply('Working on it...');
  let voiceStates = interaction.guild.voiceStates
  console.log(client.application.id)


	const { commandName } = interaction;

  let guild = interaction.guild.name
  let displayName = interaction.member.displayName
  let username = interaction.member.user.username
  baseLog = "Guild: " + guild + " | Username: " + username + " | Display Name: " + displayName

  if (!interaction.member.voice.channel) {
    console.log(log(baseLog + " | Command: " + commandName + " | ERROR: " + "Must be in voice channel"))
    await interaction.editReply('Must be in voice channel');
    return
  }

  let membersInChannel = interaction.member.voice.channel.members
  let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
  if (connection && !membersInChannel.get(client.application.id)) {
    console.log(log(baseLog + " | Command: " + commandName + " | ERROR: " + "Not in Channel with bot"))
    await interaction.editReply('Not in Channel with bot');
    return
  } 

	if (commandName === 'play') {
    let url = interaction.options.getString('url');
    let search = interaction.options.getString('search');
    if (!url && search) {
      let options = {
        limit: 10,
        safeSearch: true
      }
      const filters1 = await ytsr.getFilters(search);
      const filter1 = filters1.get('Type').get('Video');
      let results = await ytsr(filter1.url, options)
      if (results.items.length > 0) {
        for (let ndx = 0; ndx < results.items.length; ndx++) {
          if (results.items[ndx].type != "movie") {
            url = results.items[ndx].url
            break;
          }
        }
      }
      console.log(log(baseLog + " | Command: " + commandName + " | Search: " + search + " | Result: " + url))
    } else if (url) {
      console.log(log(baseLog + " | Command: " + commandName + " | URL: " + url))
    }
    if (!url) {
      console.log(log(baseLog + " | Command: " + commandName + " | ERROR: " + "Options Required"))
      await interaction.editReply('Options Required');
      return
    }
    
    if (connection) {
      serverQueues[interaction.member.voice.channel.guild.id].push(url)
      console.log(log(baseLog + " | Command: " + commandName + " | Queue Size: " + serverQueues[interaction.member.voice.channel.guild.id].length + " | Added: " + url))
      await interaction.editReply('Added to queue: ' + url);
    } else {
      playSong(url, interaction)
      await interaction.editReply('Playing: ' + url);
      
    }
		
	} else if (commandName === 'skip') {
    console.log(log(baseLog + " | Command: " + commandName))
    if (connection) {
      let player = serverPlayer[interaction.member.voice.channel.guild.id]
      let nextURL = serverQueues[interaction.member.voice.channel.guild.id].shift()
      if (!nextURL) {
        player.stop()
        connection.destroy()
        await interaction.editReply('Queue Empty');
        return
      }
      await interaction.editReply('Playing: ' + nextURL);
      const stream = ytdl(nextURL, { filter: 'audioonly' });
      const resource = createAudioResource(stream);
      player.play(resource);
    } else {
      await interaction.editReply('Not Playing');
    }
    

  } else if (commandName === 'stop') {
    console.log(log(baseLog + " | Command: " + commandName))
    if (connection) {
      let player = serverPlayer[interaction.member.voice.channel.guild.id]
      player.stop()
      connection.destroy()
      serverQueues[interaction.member.voice.channel.guild.id] = null
      await interaction.editReply('Stopped');
    } else {
      await interaction.editReply('Not Playing');
    }
    

  } else if (commandName === 'queue') {
    console.log(log(baseLog + " | Command: " + commandName))
    if (connection) {
      let queue = serverQueues[interaction.member.voice.channel.guild.id]
      let names = []
      for (let i = 0; i < queue.length; i++) {
        let songInfo = await ytdl.getInfo(queue[i]);
        names.push(songInfo.videoDetails.title)
      }
      await interaction.editReply('Queue: ' + String(names));
    } else {
      await interaction.editReply('No queue');
    }
    

  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (oldState.channelId && oldState.channel.members.size === 1 && oldState.channel.members.get(botID)) {
    console.log(log("Guild: " + oldState.guild.name + " | " + "No listeners remaining in channel"))  
    let connection = getVoiceConnection(oldState.guild.id)
    if (connection) {
      let player = serverPlayer[oldState.guild.id]
      player.stop()
      connection.destroy()
    } 
  }


})

// Login to Discord with your client's token
client.login(token);