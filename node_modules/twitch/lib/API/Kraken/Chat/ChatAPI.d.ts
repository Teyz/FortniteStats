import BaseAPI from '../../BaseAPI';
import { UserIdResolvable } from '../../../Toolkit/UserTools';
import ChatEmoteList from './ChatEmoteList';
import ChatRoom from './ChatRoom';
/**
 * The API methods that deal with chat and chatrooms.
 *
 * Can be accessed using `client.kraken.chat` on a {@TwitchClient} instance.
 *
 * ## Example
 * ```ts
 * const client = await TwitchClient.withCredentials(clientId, accessToken);
 * const channel = await client.kraken.chat.getBadges('125328655');
 * ```
 */
export default class ChatAPI extends BaseAPI {
    /**
     * Retrieves a list of emotes for a given list of enote set IDs.
     *
     * @param emotesets The list of emote set IDs, either as array of strings or as a comma separated string.
     */
    getEmotesBySets(emotesets: string[] | string): Promise<ChatEmoteList>;
    /**
     * Retrieves a list of chat rooms for a given channel.
     *
     * @param channel The channel to retrieve the chat rooms of.
     */
    getChatRoomsForChannel(channel: UserIdResolvable): Promise<ChatRoom[]>;
}
