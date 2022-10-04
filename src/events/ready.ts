import consola from 'consola';
import { ActivityType } from 'discord.js';
import { ExtendedClient } from '../types';

export default {
    name: 'ready',
    once: true,

    run (client: ExtendedClient) {
        consola.ready('Icymx is ready!');
        client.user?.setStatus('idle');
        client.user?.setActivity('your house', { type: ActivityType.Watching });
    }
}