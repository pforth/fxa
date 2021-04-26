/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { Logger } from 'mozlog';
import Stripe from 'stripe';
import { Container } from 'typedi';

import { ConfigType } from '../../config';
import error from '../../lib/error';
import { reportSentryError } from '../sentry';
import { AuthLogger } from '../types';
import { Plan } from 'fxa-shared/subscriptions/types';
import { StripeHelper, TimeSpanInS } from './stripe';
import { Account } from 'fxa-shared/db/models/auth';

export class SubscriptionReminders {
  private stripeHelper: StripeHelper;
  private DAYS_IN_A_WEEK: number = 7;
  private DAYS_IN_A_MONTH: number = 30;
  private DAYS_IN_A_YEAR: number = 365;
  private MS_IN_A_DAY: number = 24 * 60 * 60 * 1000;
  private REMINDER_LENGTH_MS: number;

  constructor(
    private log: Logger,
    config: ConfigType,
    private planLength: number,
    private reminderLength: number,
    db: any,
    mailer: any
  ) {
    this.stripeHelper = Container.get(StripeHelper);
    this.REMINDER_LENGTH_MS = this.reminderLength * this.MS_IN_A_DAY;
  }

  /**
   * TODO: JSDoc
   */
  private isEligiblePlan(plan: Plan): boolean {
    if (
      (plan.interval === 'day' && plan.interval_count >= this.planLength) ||
      (plan.interval === 'week' &&
        plan.interval_count >= this.planLength / this.DAYS_IN_A_WEEK) ||
      (plan.interval === 'month' &&
        plan.interval_count >= this.planLength / this.DAYS_IN_A_MONTH) ||
      (plan.interval == 'year' &&
        plan.interval_count >= this.planLength / this.DAYS_IN_A_YEAR)
    ) {
      return true;
    }
    return false;
  }

  /**
   * TODO: JSDoc
   * // get all plans
    //   fitler on overall interval length
   */
  private async getEligiblePlans(): Promise<Plan[]> {
    const allPlans = await this.stripeHelper.allPlans();
    return allPlans.filter((plan) => this.isEligiblePlan(plan));
  }

  /**
   * TODO JSDoc
   */
  private getStartAndEndTimes(): TimeSpanInS {
    const reminderDay = new Date(Date.now() + this.REMINDER_LENGTH_MS);
    // Get hour 0, minute 0, second 0 for today's date
    const startingTimestamp = new Date(
      Date.UTC(
        reminderDay.getUTCFullYear(),
        reminderDay.getUTCMonth(),
        reminderDay.getUTCDate(),
        0,
        0,
        0
      )
    );
    // Get hour 0, minute, 0, second 0 for one day from today's date
    const endingTimestamp = new Date(
      startingTimestamp.getTime() + this.MS_IN_A_DAY
    );

    const startTimeS = Math.floor(startingTimestamp.getTime() / 1000);
    const endTimeS = Math.floor(endingTimestamp.getTime() / 1000);
    return {
      startTimeS,
      endTimeS,
    };
  }

  /**
   * TODO: JSDoc
   * Gets the uid and email for the given subscription and sends a reminder
   * email if one has not already been sent for the current billing cycle.
   * @param subscription
   */
  private async processSubscription(subscription: Stripe.Subscription) {
    const {
      uid,
      email,
    } = await this.stripeHelper.getCustomerUidEmailFromSubscription(
      subscription
    );
    // TODO
    // check for duplicate
    // send
    // save sent email record in db
  }

  /**
   * TODO: JSDoc
   */
  public async sendReminders() {
    // 1. Get a list of all plans of a sufficient `planLength`
    const plans = await this.getEligiblePlans();

    // 2. For each plan get active subscriptions with `current_period_end` dates
    //    `reminderLength` away from now.
    const timePeriod = this.getStartAndEndTimes();
    for (let { plan_id } of plans) {
      let hasMoreSubscriptions = true;
      let startingAfter;
      while (hasMoreSubscriptions) {
        const {
          subscriptions,
          hasMore,
        }: {
          subscriptions: Stripe.Subscription[];
          hasMore: boolean;
        } = await this.stripeHelper.findActiveSubscriptionsByPlanId(
          plan_id,
          timePeriod,
          startingAfter
        );

        // 3. Send a reminder email if one hasn't already been sent.
        for (let subscription of subscriptions) {
          try {
            await this.processSubscription(subscription);
          } catch (err) {
            this.log.error('processSubscription', {
              err,
              subscriptionId: subscription.id,
            });
            reportSentryError(err);
            return false;
          }
        }

        hasMoreSubscriptions = hasMore;
        startingAfter = subscriptions.length
          ? subscriptions[subscriptions.length - 1].id
          : undefined;
      }
    }
    return true;
  }
}
