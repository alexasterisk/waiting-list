import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ExtendedClient } from '../types';
import waitingList from './subcommands/edit/waiting-list';

export default {
    name: 'edit',

    builder: new SlashCommandBuilder()
        .setName('edit')
        .setDescription('A one-stop location to edit certain data')
        .setDMPermission(true)
        .addSubcommand(waitingList.builder),

    async run (client: ExtendedClient, interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        switch (subcommand) {
            case 'waiting-list': waitingList.run(client, interaction);
        }
    }
}