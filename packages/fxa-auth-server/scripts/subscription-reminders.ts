/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import program from 'commander';
import { setupAuthDatabase } from 'fxa-shared/db';
import { StatsD } from 'hot-shots';
import Container from 'typedi';

import { configureSentry } from '../lib/sentry';
import error from '../lib/error';
import { CurrencyHelper } from '../lib/payments/currencies';
import { StripeHelper } from '../lib/payments/stripe';
import { SubscriptionReminders } from '../lib/payments/subscription-reminders';

const pckg = require('../package.json');
const config = require('../config').getProperties();

async function init() {
  // TODO: set each option as an env var, so we can vary them e.g. for QA
  // or maybe set the pair of options as one env var as for the paypal-processor?
  program
    .version(pckg.version)
    .option(
      '-p, --plan-length [days]',
      'Plan length in days beyond which a reminder email before the next recurring charge should be sent. Defaults to 180.',
      '180'
    )
    .option(
      '-r, --reminder-length [days]',
      'Reminder length in days before the renewal date to send the reminder email. Defaults to 14.',
      '14'
    )
    .parse(process.argv);

  // TODO: Move all shared code with paypal-processor into a separate module and import.
  configureSentry(undefined, config);
  // Establish database connection and bind instance to Model using Knex
  setupAuthDatabase(config.database.mysql.auth);

  const statsd = config.statsd.enabled
    ? new StatsD({
        ...config.statsd,
        errorHandler: (err) => {
          // eslint-disable-next-line no-use-before-define
          log.error('statsd.error', err);
        },
      })
    : (({
        increment: () => {},
        timing: () => {},
        close: () => {},
      } as unknown) as StatsD);
  Container.set(StatsD, statsd);

  const log = require('../lib/log')({ ...config.log, statsd });

  const translator = await require('../lib/senders/translator')(
    config.i18n.supportedLanguages,
    config.i18n.defaultLanguage
  );
  const senders = await require('../lib/senders')(
    log,
    config,
    error,
    translator,
    statsd
  );
  const redis = require('../lib/redis')(
    { ...config.redis, ...config.redis.sessionTokens },
    log
  );
  const DB = require('../lib/db')(
    config,
    log,
    require('../lib/tokens')(log, config),
    require('../lib/crypto/random').base32(config.signinUnblock.codeLength)
  );
  let database = null;
  try {
    database = await DB.connect(config, redis);
  } catch (err) {
    log.error('DB.connect', { err: { message: err.message } });
    process.exit(1);
  }

  const currencyHelper = new CurrencyHelper(config);
  Container.set(CurrencyHelper, currencyHelper);
  const stripeHelper = new StripeHelper(log, config, statsd);
  Container.set(StripeHelper, stripeHelper);

  const subscriptionReminders = new SubscriptionReminders(
    log,
    config,
    parseInt(program.planLength),
    parseInt(program.reminderLength),
    database,
    senders.email
  );
  await subscriptionReminders.sendReminders();
  return 0;
}

if (require.main === module) {
  init()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .then((result) => process.exit(result));
}
