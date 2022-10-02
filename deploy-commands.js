require('dotenv').config()
const { REST, SlashCommandBuilder, Routes } = require('discord.js')
const consola = require('consola')
const { clientId } = require('./config.json')

const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Sets up the channels for the bot to refer to')
        .addChannelOption(option => option.setName('waiting_vc')
            .setDescription('The voice channel you want the users to wait in')
            .setRequired(true))
        .addChannelOption(option => option.setName('main_vc')
            .setDescription('The voice channel that users will join when they\'re no longer waiting')
            .setRequired(true))
        .addChannelOption(option => option.setName('update_channel')
            .setDescription('The text channel that users will be updated about their position in')
            .setRequired(true))
        .setDMPermission(false)
        .setDefaultMemberPermissions(8),
    new SlashCommandBuilder()
        .setName('edit')
        .setDescription('Manages how the bot will mention you')
        .addBooleanOption(option => option.setName('dm_user')
            .setDescription('Do you want DMed by the bot?')
            .setRequired(false))
        .addBooleanOption(option => option.setName('mention_user')
            .setDescription('Do you want mentioned by the bot?')
            .setRequired(false))
        .setDMPermission(false),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Gets the current Queue and returns it')
        .setDMPermission(false)
]

const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN)

consola.info(`Started refreshing ${commands.length} application commands..`)
rest.put(Routes.applicationCommands(clientId), { body: commands })
    .then(data => consola.success(`Successfully registered ${data.length} application commands!`))
    .catch(consola.error)