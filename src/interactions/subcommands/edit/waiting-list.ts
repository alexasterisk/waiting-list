import consola from 'consola';
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { ExtendedClient } from '../../../types';

export default {
    name: 'waiting-list',

    builder: new SlashCommandSubcommandBuilder()
        .setName('waiting-list')
        .setDescription('Change your preferred way of being notified on when your position in the queue changes')
        .addStringOption(o => o.setName('preference')
            .setDescription('How would you like to receive updates about your position in the queue?')
            .setRequired(true)
            .addChoices(
                { name: 'Don\'t ping me', value: 'dni' },
                { name: 'Mention me in the server', value: 'mention_user' },
                { name: 'DM me', value: 'dm_user' }
            )),

    async run (client: ExtendedClient, interaction: ChatInputCommandInteraction) {
        const { user, options } = interaction;

        await interaction.deferReply({ ephemeral: true });

        const choice = options.getString('preference', true);
        await client.keyv?.set(user.id + 'preference', choice);

        await interaction.editReply('Alright! Your preference has been saved!\nIf you wish to change it at any point, just run `/edit` again!');
        consola.success(`${user.username} [${user.id}] set their preferences to ${choice}`);
    }
}