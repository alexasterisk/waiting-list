import { Guild, GuildMember, Snowflake, TextBasedChannel, User, VoiceBasedChannel, VoiceState } from 'discord.js';
import Keyv from 'keyv';
import consola from 'consola';

import { ExtendedClient } from '../types';

type KeyvBasicData = {
    queue: string[];
    setup: boolean;
    preference: 'dm_user' | 'mention_user' | 'dni';
}

type KeyvRawData = KeyvBasicData & {
    waitingVC?: Snowflake;
    mainVC?: Snowflake;
    updateChannel?: Snowflake;
}

type KeyvData = KeyvBasicData & {
    waitingVC: VoiceBasedChannel;
    mainVC: VoiceBasedChannel;
    updateChannel: TextBasedChannel;
}

async function fetchAllData(keyv: Keyv, guild: Guild, user: User): Promise<KeyvRawData> {
    const data = {
        waitingVC: await keyv.get(guild.id + 'waiting_vc'),
        mainVC: await keyv.get(guild.id + 'main_vc'),
        updateChannel: await keyv.get(guild.id + 'upd_chnl'),
        queue: ((await keyv.get(guild.id + 'queue') as string | null) ?? '-').split('/'),
        setup: await keyv.get(guild.id + 'setup') ?? false,

        preference: await keyv.get(user.id + 'preference') ?? 'dni'
    }

    data.queue = data.queue.filter(v => v !== '-');
    data.queue = data.queue.filter(v => v !== '');

    return data;
}

async function getChannels(guild: Guild, data: KeyvRawData): Promise<KeyvData> {
    const newData = {
        queue: data.queue,
        setup: data.setup,
        preference: data.preference
    }
    for (const name of ['waitingVC', 'mainVC', 'updateChannel']) {
        if (typeof data[name] === null) return Promise.reject([false, 'Icymx has not been set up in this server to use Waiting List!']);
        else if (!guild.channels.cache.has(data[name])) return Promise.reject([true, `Uh oh! It looks like the channel I was setup for \`${name}\` has been changed.\nPlease talk to a server administrator to fix this with \`/setup waiting-list\`!`]);
        else newData[name] = guild.channels.cache.get(data[name]);
    }

    return Promise.resolve(newData as KeyvData);
}

async function joinedQueue(keyv: Keyv, member: GuildMember, data: KeyvData) {
    consola.info(`${member.displayName} [${member.user.id}] joined the queue for ${data.mainVC.name} [${data.mainVC.id}] in ${member.guild.name} [${member.guild.id}]`);
    data.queue.push(member.user.id);
    await keyv.set(member.guild.id + 'queue', data.queue.join('/'));
    consola.info('The queue is now:', data.queue);

    if (data.mainVC.full) {
        switch (await keyv.get(member.user.id + 'preference') ?? 'dni') {
            case 'dm_user': return member.user.send(`You've joined the queue for <#${data.mainVC.id}>\nIf you would like to stop receive messages, run \`/edit waiting-list\`.`);
            case 'mention_user': return data.updateChannel.send(`<@${member.user.id}>, you've joined the queue for **${data.mainVC.name}**!`);
        }
    } else {

        // Main VC was not full and they can be immediately moved
        consola.info(`${member.displayName} [${member.user.id}] was immediately moved to ${data.mainVC.name} [${data.mainVC.id}]`);
        leftMainVC(keyv, member, data, true);
        // await keyv.set(member.user.id + 'moved', true);
        // member.voice.setChannel(data.mainVC, 'WL - Insufficient members in Main VC.');
    }
}

async function leftQueue(keyv: Keyv, member: GuildMember, data: KeyvData) {
    consola.info(`${member.displayName} [${member.user.id}] left the queue for ${data.mainVC.name} [${data.mainVC.id}] in ${member.guild.name} [${member.guild.id}]`);
    data.queue = data.queue.filter(id => id !== member.user.id);
    await keyv.set(member.guild.id + 'queue', data.queue.join('/'));
    consola.info('The queue is now:', data.queue);

    if (!await keyv.get(member.user.id + 'moved')) {
        consola.info(`${member.displayName} [${member.user.id}] just left ${data.waitingVC.name} [${data.waitingVC.id}]`);
        data.queue.forEach(async (userId, index) => {
            const user = member.client.users.cache.get(userId);
            if (!user) return;

            const preference = await keyv.get(user.id + 'preference') ?? 'dni';
            if (preference === 'dm_user') user.send(`Your position waiting for <#${data.mainVC.id}> has changed!\nYou're now in position **${index + 1}** of **${data.queue.length}**!`);
            else if (preference === 'mention_user') data.updateChannel.send(`<@${user.id}>, your position waiting for **${data.mainVC.name}** has changed!\nYou're now in position **${index + 1}** of **${data.queue.length}**!`);
        });
    }

    await keyv.delete(member.user.id + 'moved');
}

async function leftMainVC(keyv: Keyv, member: GuildMember, data: KeyvData, bypass?: boolean) {
    if (!bypass) consola.info(`${member.displayName} [${member.user.id}] has left ${data.mainVC.id} [${data.mainVC.id}] in ${member.guild.name} [${member.guild.id}]`);
    consola.info('The current queue is:', data.queue);
    if ((!data.mainVC.full && data.queue.length > 0) || bypass) {
        consola.info(`Shifting users around in ${data.mainVC.name} [${data.mainVC.id}] in ${member.guild.name} [${member.guild.id}]`);
        const userId = data.queue.shift();
        const member2 = member.guild.members.cache.get(userId);
        if (!member2) return;

        await keyv.set(member2.user.id + 'moved', true);
        member2.voice.setChannel(data.mainVC, 'WL - Spot opened in the Main VC.');

        switch (await keyv.get(userId + 'preference') ?? 'dni') {
            case 'dm_user': return member2.send(`You've been moved into <#${data.mainVC.id}>\nTo stop receiving DMs, please run \`/edit waiting-list\`.`);
            case 'mention_user': return data.updateChannel.send(`<@${userId}>, you've been moved into **${data.mainVC.name}**!\n${data.queue.length > 0 ? `The length of the queue is now **${data.queue.length}**.` : ''}`);
        }
    }
}

export default {
    name: 'voiceStateUpdate',

    async run (client: ExtendedClient, oldState: VoiceState, newState: VoiceState) {
        if (!client.keyv) return consola.error('Keyv was not setup when running voiceStateUpdate!');
        const { channel, guild, member } = newState;
        const old = oldState;

        client.keyv.get(guild.id + 'setup')
            .then(() => {
                if (!member || member.user.bot) return;

                fetchAllData(client.keyv, guild, member.user)
                    .then(async data => {
                        if (!data.setup) return;

                        getChannels(guild, data)
                            .then(data => {
                                if (old.channel === channel) return; // ignore non-channel updates
                                if (channel === data.waitingVC) { joinedQueue(client.keyv, member, data) }
                                else if (old.channel === data.waitingVC) { leftQueue(client.keyv, member, data) }
                                else if (old.channel === data.mainVC) { leftMainVC(client.keyv, member, data) }
                            })
                            .catch(reason => {
                                if (reason[0]) member.send(reason[1]);
                            });
                    });
            });
    }
}