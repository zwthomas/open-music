const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const ytdl = require('ytdl-core');

const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');

async function playSong(url, interaction) {
  console.log(url)
  const songInfo = await ytdl.getInfo(url);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };
  console.log(song)

  connection = joinVoiceChannel({
    channelId: interaction.member.voice.channel.id,
    guildId: interaction.member.voice.channel.guild.id,
    adapterCreator: interaction.member.voice.channel.guild.voiceAdapterCreator,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
    connection.destroy();
    // try {
    //   await Promise.race([
    //     entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
    //     entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
    //   ]);
    //   // Seems to be reconnecting to a new channel - ignore disconnect
    // } catch (error) {
    //   // Seems to be a real disconnect which SHOULDN'T be recovered from
      
    // }
  });

  const player = createAudioPlayer();
  const stream = ytdl(url, { filter: 'audioonly' });
  console.log("test")
  // const holder = await ytdl("https://m.youtube.com/watch?v=RJS3u3rEPys")
  const resource = createAudioResource(stream);
  player.play(resource);
  connection.subscribe(player);
  serverPlayer[interaction.member.voice.channel.guild.id] = player
  serverQueues[interaction.member.voice.channel.guild.id] = []
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
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'play') {
    if (!interaction.member.voice.channel) {
      await interaction.reply('Must be in voice channel');
      return
    }
    let url = interaction.options.getString('url');
    let connection = getVoiceConnection(interaction.member.voice.channel.guild.id);
    if (connection) {
      serverQueues[interaction.member.voice.channel.guild.id].push(url)
      console.log(serverQueues[interaction.member.voice.channel.guild.id])
      await interaction.reply('Added to queue: ' + url);
    } else {
      console.log("create new")
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