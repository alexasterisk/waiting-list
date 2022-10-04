import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../types';
import waitingList from './subcommands/setup/waiting-list';

export default {
    name: 'setup',

    builder: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('A one-stop location for administrators to setup their server')
        .setDMPermission(false)
        .setDefaultMemberPermissions(8)
        .addSubcommand(waitingList.builder),

    async run (client: ExtendedClient, interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        switch (subcommand) {
            case 'waiting-list': waitingList.run(client, interaction);
        }
    }
}