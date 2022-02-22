const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder().setName('play').setDescription('Play song from youtube')
        .addStringOption(option => option.setName('url').setDescription('Enter a YouTube URL')),
    new SlashCommandBuilder().setName('skip').setDescription('Play song from youtube')
        .addStringOption(option => option.setName('url').setDescription('Enter a YouTube URL')),
    new SlashCommandBuilder().setName('stop').setDescription('Play song from youtube')
        .addStringOption(option => option.setName('url').setDescription('Enter a YouTube URL')),
    new SlashCommandBuilder().setName('queue').setDescription('Play song from youtube')
        .addStringOption(option => option.setName('url').setDescription('Enter a YouTube URL'))
]
	.map(command => command.toJSON());


const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);