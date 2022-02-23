const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
let baseLog = ""

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
    console.log(nextURL)
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
      connection.destroy()
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

	const { commandName } = interaction;

  let guild = interaction.guild.name
  let displayName = interaction.member.displayName
  let username = interaction.member.user.username
  baseLog = "Guild: " + guild + " | Username: " + username + " | Display Name: " + displayName

  if (!interaction.member.voice.channel) {
    console.log(log(baseLog + " | Command: " + commandName + " | ERROR: " + "Must be in voice channel"))
    await interaction.reply('Must be in voice channel');
    return
  }

	if (commandName === 'play') {
    let url = interaction.options.getString('url');
    let search = interaction.options.getString('search');
    if (!url && search) {
      let options = {
        limit: 1,
        safeSearch: true
      }
      let results = await ytsr(search, options)
      console.log(results)
      if (results.items.length > 0) {
        console.log(results.items[0].url)
        url = results.items[0].url
      }
      console.log(log(baseLog + " | Command: " + commandName + " | Search: " + search + " | Result: " + url))
    } else if (url) {
      console.log(log(baseLog + " | Command: " + commandName + " | URL: " + url))
    }
    if (!url) {
      console.log(log(baseLog + " | Command: " + commandName + " | ERROR: " + "Options Required"))
      await interaction.reply('Options Required');
      return
    }
    let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
    if (connection) {
      serverQueues[interaction.member.voice.channel.guild.id].push(url)
      console.log(log(baseLog + " | Command: " + commandName + " | Queue Size: " + serverQueues[interaction.member.voice.channel.guild.id].length + " | Added: " + url))
      await interaction.reply('Added to queue: ' + url);
    } else {
      playSong(url, interaction)
      await interaction.reply('Playing: ' + url);
      
    }
		
	} else if (commandName === 'skip') {
    let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
    if (connection) {
      let player = serverPlayer[interaction.member.voice.channel.guild.id]
      let nextURL = serverQueues[interaction.member.voice.channel.guild.id].shift()
      if (!nextURL) {
        player.stop()
        let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
        connection.destroy()
        return
      }
      console.log(nextURL)
      await interaction.reply('Playing: ' + nextURL);
      const stream = ytdl(nextURL, { filter: 'audioonly' });
      const resource = createAudioResource(stream);
      player.play(resource);
    } else {
      await interaction.reply('Not Playing');
    }
    

  } else if (commandName === 'stop') {
    let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
    if (connection) {
      let player = serverPlayer[interaction.member.voice.channel.guild.id]
      player.stop()
      let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
      connection.destroy()
      await interaction.reply('Stopped');
    } else {
      await interaction.reply('Not Playing');
    }
    

  } else if (commandName === 'queue') {
    let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
    if (connection) {
      let queue = serverQueues[interaction.member.voice.channel.guild.id]
      let names = []
      for (let i = 0; i < queue.length; i++) {
        let songInfo = await ytdl.getInfo(queue[i]);
        names.push(songInfo.videoDetails.title)
      }
      await interaction.reply('Queue: ' + String(names));
    } else {
      await interaction.reply('No queue');
    }
    

  }
});

// Login to Discord with your client's token
client.login(token);