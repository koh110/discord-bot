/**
 * @typedef Command
 * @type {object}
 * @property {string} name
 * @property {string} description
 * @property {1|2|3} [type]
 */

/**
 * @type {import('./type.ts').Command}
 */
export const TEST_COMMAND = {
  name: 'test',
  description: 'test command'
}

/**
 * @type {import('./type.ts').Command}
 */
export const TWITTER_COMMAND = {
  name: 'twitter',
  type: 3
}

export const commands = [TEST_COMMAND, TWITTER_COMMAND]
