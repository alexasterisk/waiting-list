import consola from 'consola';
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { ExtendedClient } from '../../../types';

export default {
    name: 'waiting-list',

    builder: new SlashCommandSubcommandBuilder()
        .setName('waiting-list')
        .setDescription('Sets up the channels for the bot to refer to')
        .addChannelOption(o => o.setName('waiting_vc')
            .setDescription('The voice channel you want the users to wait in')
            .setRequired(true))
        .addChannelOption(o => o.setName('main_vc')
            .setDescription('The voice channel the users will join when they\'re no longer in the queue')
            .setRequired(true))
        .addChannelOption(o => o.setName('update_channel')
            .setDescription('The text channel that users will be updated about their position in')
            .setRequired(true)),

    async run (client: ExtendedClient, interaction: ChatInputCommandInteraction) {
        const { guild, options } = interaction;

        await interaction.deferReply({ ephemeral: true });

        const waitingVC = options.getChannel('waiting_vc', true);
        const mainVC = options.getChannel('main_vc', true);
        const updateChannel = options.getChannel('update_channel', true);

        await client.keyv?.set(guild.id + 'waiting_vc', waitingVC.id);
        await client.keyv?.set(guild.id + 'main_vc', mainVC.id);
        await client.keyv?.set(guild.id + 'upd_chnl', updateChannel.id);
        await client.keyv?.set(guild.id + 'queue', '-');
        await client.keyv?.set(guild.id + 'setup', true);

        const currentGuilds = await client.keyv?.get('guilds') ?? '';
        await client.keyv?.set('guilds', currentGuilds + '|' + guild.id);

        await interaction.editReply('You\'ve finished setting up the Waiting List! It is now ready for use.');
        consola.success(`${guild.name} [${guild.id}] has finished setup with the following:\nWaiting VC: ${waitingVC.name} [${waitingVC.id}]\nMain VC: ${mainVC.name} [${mainVC.id}]\nUpdates Channel: ${updateChannel.name} [${updateChannel.id}]`);
    }
}