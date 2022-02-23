const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('play').setDescription('Play song from youtube')
        .addStringOption(option => option.setName('url').setDescription('Enter a YouTube URL'))
        .addStringOption(option => option.setName('search').setDescription('Enter Search Keywords')),
    new SlashCommandBuilder().setName('skip').setDescription('Skip Current Track'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop Bot'),
    new SlashCommandBuilder().setName('queue').setDescription('Show Queue')
]
	.map(command => command.toJSON());


const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);